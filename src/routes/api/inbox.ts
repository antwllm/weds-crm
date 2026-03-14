import { Router } from 'express';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { leads, linkedEmails, activities } from '../../db/schema.js';
import { ensureAuthenticated } from '../../auth/middleware.js';
import { getGmailClientInstance } from '../../services/gmail-client-holder.js';
import { listThreads, getThread, sendReply } from '../../services/gmail.js';
import { logger } from '../../logger.js';

const router = Router();

// All routes require authentication
router.use(ensureAuthenticated);

// --- Validation schemas ---

const replySchema = z.object({
  to: z.string().min(1, 'Le destinataire est requis'),
  subject: z.string().min(1, 'Le sujet est requis'),
  body: z.string().min(1, 'Le corps du message est requis'),
  inReplyTo: z.string().min(1, 'In-Reply-To est requis'),
  references: z.string().min(1, 'References est requis'),
});

const linkEmailSchema = z.object({
  gmailMessageId: z.string().min(1),
  gmailThreadId: z.string().optional(),
  leadId: z.number().int(),
  subject: z.string().optional(),
  snippet: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']).default('inbound'),
  receivedAt: z.string().optional(),
});

/**
 * Extract email address from "Name <email>" format or plain email.
 */
function extractEmail(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  return (match ? match[1] : fromHeader).toLowerCase().trim();
}

// --- GET /api/inbox/threads ---
router.get('/inbox/threads', async (req, res) => {
  try {
    const gmail = getGmailClientInstance();
    if (!gmail) {
      res.status(503).json({ error: 'Client Gmail non disponible. Veuillez vous reconnecter.' });
      return;
    }

    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string, 10) : 20;
    const pageToken = (req.query.pageToken as string) || undefined;
    const q = (req.query.q as string) || 'in:inbox';

    const result = await listThreads(gmail, { maxResults, pageToken, q });

    function decodeHtmlEntities(str: string): string {
      return str
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
    }

    const enriched = await Promise.all(
      result.threads.map(async (t) => {
        try {
          const detail = await gmail.users.threads.get({
            userId: 'me',
            id: t.id!,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date'],
          });
          const headers: Array<{ name?: string | null; value?: string | null }> =
            detail.data.messages?.[0]?.payload?.headers ?? [];
          const getHeader = (name: string) =>
            headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
          return {
            id: t.id,
            subject: getHeader('Subject'),
            from: getHeader('From'),
            date: getHeader('Date'),
            snippet: decodeHtmlEntities(t.snippet ?? ''),
            historyId: t.historyId,
          };
        } catch {
          return {
            id: t.id,
            subject: '',
            from: '',
            date: '',
            snippet: decodeHtmlEntities(t.snippet ?? ''),
            historyId: t.historyId,
          };
        }
      }),
    );

    res.json({
      threads: enriched,
      nextPageToken: result.nextPageToken,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des threads', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- GET /api/inbox/threads/:threadId ---
router.get('/inbox/threads/:threadId', async (req, res) => {
  try {
    const gmail = getGmailClientInstance();
    if (!gmail) {
      res.status(503).json({ error: 'Client Gmail non disponible. Veuillez vous reconnecter.' });
      return;
    }

    const thread = await getThread(gmail, req.params.threadId);
    const db = getDb();

    // Auto-link: for each message sender, check if email matches a lead
    const linkedLeads: Record<string, { id: number; name: string; status: string | null }> = {};

    for (const msg of thread.messages) {
      const senderEmail = extractEmail(msg.from);
      if (!senderEmail) continue;

      // Check if this sender matches a lead
      const matchedLeads = await db
        .select()
        .from(leads)
        .where(eq(leads.email, senderEmail))
        .limit(1);

      if (matchedLeads.length > 0) {
        const lead = matchedLeads[0];
        linkedLeads[senderEmail] = { id: lead.id, name: lead.name, status: lead.status };

        // Auto-link: insert into linkedEmails if not already linked (ignore conflict)
        try {
          await db.insert(linkedEmails).values({
            leadId: lead.id,
            gmailMessageId: msg.id,
            gmailThreadId: thread.id,
            subject: msg.subject,
            snippet: msg.snippet || msg.body.slice(0, 200),
            direction: 'inbound',
            receivedAt: msg.date ? new Date(msg.date) : new Date(),
          }).onConflictDoNothing();
        } catch {
          // Ignore duplicate insert errors
        }
      }
    }

    res.json({
      ...thread,
      linkedLeads,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du thread', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- POST /api/inbox/threads/:threadId/reply ---
router.post('/inbox/threads/:threadId/reply', async (req, res) => {
  try {
    const gmail = getGmailClientInstance();
    if (!gmail) {
      res.status(503).json({ error: 'Client Gmail non disponible. Veuillez vous reconnecter.' });
      return;
    }

    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Données invalides',
        details: parsed.error.issues,
      });
      return;
    }

    const { to, subject, body, inReplyTo, references } = parsed.data;
    const threadId = req.params.threadId;

    await sendReply(gmail, { threadId, to, subject, body, inReplyTo, references });

    const db = getDb();

    // Try to match recipient to a lead and create activity
    const recipientEmail = extractEmail(to);
    const matchedLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.email, recipientEmail))
      .limit(1);

    if (matchedLeads.length > 0) {
      const lead = matchedLeads[0];

      // Record outbound email link only when lead is matched (avoids FK violation)
      try {
        const sentMessageId = `sent-${Date.now()}`;
        await db.insert(linkedEmails).values({
          leadId: lead.id,
          gmailMessageId: sentMessageId,
          gmailThreadId: threadId,
          subject,
          snippet: body.slice(0, 200),
          direction: 'outbound',
          receivedAt: new Date(),
        });
      } catch {
        // Ignore insert errors — email was already sent successfully
      }

      try {
        await db.insert(activities).values({
          leadId: lead.id,
          type: 'email_sent',
          content: `Email envoyé: ${subject}`,
          metadata: { threadId, to: recipientEmail },
        });
      } catch {
        // Ignore activity insert errors
      }
    }

    res.json({ status: 'sent' });
  } catch (error) {
    logger.error("Erreur lors de l'envoi de la réponse", { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- GET /api/leads/:leadId/emails ---
router.get('/leads/:leadId/emails', async (req, res) => {
  try {
    const leadId = parseInt(req.params.leadId, 10);
    if (isNaN(leadId)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const db = getDb();
    const emails = await db
      .select()
      .from(linkedEmails)
      .where(eq(linkedEmails.leadId, leadId))
      .orderBy(desc(linkedEmails.receivedAt));

    res.json({ emails });
  } catch (error) {
    logger.error('Erreur lors de la récupération des emails du lead', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// --- POST /api/inbox/link-email ---
router.post('/inbox/link-email', async (req, res) => {
  try {
    const parsed = linkEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Données invalides',
        details: parsed.error.issues,
      });
      return;
    }

    const db = getDb();
    const [linked] = await db.insert(linkedEmails).values({
      leadId: parsed.data.leadId,
      gmailMessageId: parsed.data.gmailMessageId,
      gmailThreadId: parsed.data.gmailThreadId,
      subject: parsed.data.subject,
      snippet: parsed.data.snippet,
      direction: parsed.data.direction,
      receivedAt: parsed.data.receivedAt ? new Date(parsed.data.receivedAt) : new Date(),
    }).returning();

    res.status(201).json(linked);
  } catch (error) {
    logger.error('Erreur lors du lien email-lead', { error });
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;
