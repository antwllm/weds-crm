import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, asc } from 'drizzle-orm';
import { ensureAuthenticated } from '../../auth/middleware.js';
import { getDb } from '../../db/index.js';
import { leads, whatsappMessages, activities } from '../../db/schema.js';
import { sendWhatsAppMessage, sendWhatsAppTemplate, listWhatsAppTemplates } from '../../services/whatsapp.js';
import { config } from '../../config.js';
import { logger } from '../../logger.js';

const router = Router();

const sendMessageSchema = z.object({
  message: z.string().min(1, 'Le message est requis'),
});

const sendTemplateSchema = z.object({
  templateName: z.string().min(1, 'Le nom du modèle est requis'),
  languageCode: z.string().default('fr'),
});

/**
 * POST /api/leads/:leadId/whatsapp/send
 * Send a WhatsApp message to a lead.
 */
router.post('/leads/:leadId/whatsapp/send', ensureAuthenticated, async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const parseResult = sendMessageSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { message } = parseResult.data;

    // Check WhatsApp configuration
    if (!config.WHATSAPP_PHONE_NUMBER_ID || !config.WHATSAPP_ACCESS_TOKEN) {
      res.status(503).json({ error: 'WhatsApp non configure' });
      return;
    }

    const db = getDb();

    // Find lead
    const leadResults = await db.select().from(leads).where(eq(leads.id, leadId));
    const lead = leadResults[0];

    if (!lead) {
      res.status(404).json({ error: 'Lead non trouvé' });
      return;
    }

    if (!lead.phone) {
      res.status(400).json({ error: 'Lead sans numero de telephone' });
      return;
    }

    // Send WhatsApp message
    const waMessageId = await sendWhatsAppMessage(
      config.WHATSAPP_PHONE_NUMBER_ID,
      config.WHATSAPP_ACCESS_TOKEN,
      lead.phone,
      message,
    );

    // Store message
    await db.insert(whatsappMessages).values({
      leadId,
      waMessageId,
      direction: 'outbound',
      body: message,
      status: 'sent',
    });

    // Log activity
    await db.insert(activities).values({
      leadId,
      type: 'whatsapp_sent',
      content: message,
    });

    // Reset AI consecutive counter when human sends manually
    await db.update(leads)
      .set({ whatsappAiConsecutiveCount: 0 })
      .where(eq(leads.id, leadId));

    logger.info('WhatsApp message envoyé', { leadId, waMessageId });
    res.status(200).json({ status: 'sent', waMessageId });
  } catch (error) {
    logger.error('Erreur envoi WhatsApp', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Erreur envoi WhatsApp' });
  }
});

/**
 * GET /api/leads/:leadId/whatsapp
 * Get WhatsApp message history for a lead.
 */
router.get('/leads/:leadId/whatsapp', ensureAuthenticated, async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const db = getDb();

    const messages = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.leadId, leadId))
      .orderBy(asc(whatsappMessages.createdAt));

    res.status(200).json({ messages });
  } catch (error) {
    logger.error('Erreur récupération historique WhatsApp', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Erreur récupération historique' });
  }
});

/**
 * GET /api/leads/:leadId/whatsapp/window
 * Check if the 24h conversation window is open for a lead.
 */
router.get('/leads/:leadId/whatsapp/window', ensureAuthenticated, async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const db = getDb();

    // Find last inbound message
    const lastInbound = await db
      .select()
      .from(whatsappMessages)
      .where(
        and(
          eq(whatsappMessages.leadId, leadId),
          eq(whatsappMessages.direction, 'inbound'),
        ),
      )
      .orderBy(desc(whatsappMessages.createdAt))
      .limit(1);

    if (lastInbound.length === 0 || !lastInbound[0].createdAt) {
      res.status(200).json({ isOpen: false, expiresAt: null });
      return;
    }

    const lastInboundTime = lastInbound[0].createdAt.getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const isOpen = (now - lastInboundTime) < twentyFourHours;
    const expiresAt = new Date(lastInboundTime + twentyFourHours).toISOString();

    res.status(200).json({ isOpen, expiresAt });
  } catch (error) {
    logger.error('Erreur vérification fenêtre WhatsApp', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Erreur vérification fenêtre' });
  }
});

/**
 * GET /api/whatsapp/templates
 * List available WhatsApp message templates.
 */
router.get('/whatsapp/templates', ensureAuthenticated, async (_req, res) => {
  try {
    if (!config.WHATSAPP_ACCESS_TOKEN || !config.WHATSAPP_BUSINESS_ACCOUNT_ID) {
      res.status(503).json({ error: 'WhatsApp templates non configure' });
      return;
    }

    const templates = await listWhatsAppTemplates(
      config.WHATSAPP_BUSINESS_ACCOUNT_ID,
      config.WHATSAPP_ACCESS_TOKEN,
    );

    // Only return approved templates
    const approved = templates.filter((t) => t.status === 'APPROVED');
    res.json({ templates: approved });
  } catch (error) {
    logger.error('Erreur récupération templates WhatsApp', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Erreur récupération templates' });
  }
});

/**
 * POST /api/leads/:leadId/whatsapp/send-template
 * Send a template message to a lead (works outside 24h window).
 */
router.post('/leads/:leadId/whatsapp/send-template', ensureAuthenticated, async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const parseResult = sendTemplateSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { templateName, languageCode } = parseResult.data;

    if (!config.WHATSAPP_PHONE_NUMBER_ID || !config.WHATSAPP_ACCESS_TOKEN) {
      res.status(503).json({ error: 'WhatsApp non configure' });
      return;
    }

    const db = getDb();
    const leadResults = await db.select().from(leads).where(eq(leads.id, leadId));
    const lead = leadResults[0];

    if (!lead) {
      res.status(404).json({ error: 'Lead non trouvé' });
      return;
    }

    if (!lead.phone) {
      res.status(400).json({ error: 'Lead sans numero de telephone' });
      return;
    }

    // Build template parameters matching the template's expected named params
    // Templates use named params like {{name}}, {{email}} — we map them to lead fields
    const paramValues: Record<string, string> = {
      name: lead.name || '',
      email: lead.email || '',
      date_evenement: lead.eventDate || '',
    };

    // Fetch template definition to know exact param count and order
    // Meta templates use positional params {{1}}, {{2}}, etc.
    // Named params like {{name}} are display-only — the API expects positional parameters
    let templateParams: Array<{ type: string; text: string; parameter_name?: string }> | undefined;
    let templateHeaderComponent: { type: string; [key: string]: any } | undefined;
    try {
      if (config.WHATSAPP_BUSINESS_ACCOUNT_ID) {
        const { listWhatsAppTemplates } = await import('../../services/whatsapp.js');
        const templates = await listWhatsAppTemplates(
          config.WHATSAPP_BUSINESS_ACCOUNT_ID,
          config.WHATSAPP_ACCESS_TOKEN,
        );
        const tpl = templates.find((t) => t.name === templateName);
        if (tpl?.bodyText) {
          // Extract all {{param}} placeholders
          const allMatches = [...tpl.bodyText.matchAll(/\{\{(\w+)\}\}/g)];
          const positionalMatches = allMatches.filter((m) => /^\d+$/.test(m[1]));
          const namedMatches = allMatches.filter((m) => !/^\d+$/.test(m[1]));

          if (positionalMatches.length > 0) {
            // Positional: {{1}}, {{2}} — map in order
            const positionalValues = [lead.name || '', lead.email || '', lead.eventDate || ''];
            templateParams = positionalMatches
              .sort((a, b) => Number(a[1]) - Number(b[1]))
              .map((m) => ({
                type: 'text',
                text: positionalValues[Number(m[1]) - 1] || '',
              }));
          } else if (namedMatches.length > 0) {
            // Named: {{name}}, {{email}} — use parameter_name field for Meta API
            templateParams = namedMatches.map((m) => ({
              type: 'text',
              parameter_name: m[1],
              text: paramValues[m[1]] || m[1],
            }));
          }

          logger.info('Template params resolus', {
            templateName,
            bodyText: tpl.bodyText.slice(0, 100),
            positionalCount: positionalMatches.length,
            namedCount: namedMatches.length,
            params: templateParams,
          });
        }

        // Build header component if template has a HEADER with media
        if (tpl?.headerFormat === 'DOCUMENT') {
          // Use the brochure PDF as the document header
          // GCS public URL or a publicly accessible URL is required
          const bucketName = config.GCS_BUCKET_NAME;
          const brochureUrl = bucketName
            ? `https://storage.googleapis.com/${bucketName}/Brochure_Weds.pdf`
            : null;

          if (brochureUrl) {
            templateHeaderComponent = {
              type: 'document',
              document: { link: brochureUrl, filename: 'Brochure_Weds.pdf' },
            };
          }
          logger.info('Template header document', { templateName, brochureUrl });
        } else if (tpl?.headerFormat === 'IMAGE') {
          logger.warn('Template header IMAGE non supporte pour le moment', { templateName });
        }
      }
    } catch (e) {
      logger.warn('Impossible de recuperer les parametres du template, envoi sans params', {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const waMessageId = await sendWhatsAppTemplate(
      config.WHATSAPP_PHONE_NUMBER_ID,
      config.WHATSAPP_ACCESS_TOKEN,
      lead.phone,
      templateName,
      languageCode,
      templateParams,
      templateHeaderComponent,
    );

    await db.insert(whatsappMessages).values({
      leadId,
      waMessageId,
      direction: 'outbound',
      body: `[Modèle: ${templateName}]`,
      status: 'sent',
    });

    await db.insert(activities).values({
      leadId,
      type: 'whatsapp_sent',
      content: `Modèle WhatsApp envoyé: ${templateName}`,
    });

    logger.info('WhatsApp template envoyé', { leadId, waMessageId, templateName });
    res.status(200).json({ status: 'sent', waMessageId });
  } catch (error) {
    const metaData = (error as any)?.response?.data?.error;
    const metaError = metaData?.message;
    const metaDetail = metaData?.error_data?.details;
    logger.error('Erreur envoi template WhatsApp', {
      error: metaError || (error instanceof Error ? error.message : String(error)),
      detail: metaDetail,
      metaErrorData: metaData,
    });
    res.status(500).json({
      error: metaError || 'Erreur envoi template WhatsApp',
      detail: metaDetail || undefined,
    });
  }
});

/**
 * PATCH /api/leads/:leadId/whatsapp/ai-toggle
 * Toggle AI agent for a specific lead.
 */
router.patch('/leads/:leadId/whatsapp/ai-toggle', ensureAuthenticated, async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);

    const db = getDb();
    const [updated] = await db.update(leads)
      .set({ whatsappAiEnabled: enabled })
      .where(eq(leads.id, leadId))
      .returning({
        whatsappAiEnabled: leads.whatsappAiEnabled,
        whatsappAiHandoffAt: leads.whatsappAiHandoffAt,
      });

    if (!updated) {
      res.status(404).json({ error: 'Lead non trouve' });
      return;
    }

    logger.info('Agent IA WhatsApp toggle', { leadId, enabled });
    res.json(updated);
  } catch (error) {
    logger.error('Erreur toggle agent IA', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Erreur toggle agent IA' });
  }
});

/**
 * GET /api/leads/:leadId/whatsapp/ai-status
 * Get AI agent status for a lead.
 */
router.get('/leads/:leadId/whatsapp/ai-status', ensureAuthenticated, async (req, res) => {
  try {
    const leadId = Number(req.params.leadId);
    const db = getDb();
    const [lead] = await db.select({
      whatsappAiEnabled: leads.whatsappAiEnabled,
      whatsappAiHandoffAt: leads.whatsappAiHandoffAt,
    }).from(leads).where(eq(leads.id, leadId));

    if (!lead) {
      res.status(404).json({ error: 'Lead non trouve' });
      return;
    }

    // Check if there's an active handoff (handoff happened and no human reply since)
    let hasActiveHandoff = false;
    if (lead.whatsappAiHandoffAt) {
      const lastHumanOutbound = await db.select({ createdAt: whatsappMessages.createdAt })
        .from(whatsappMessages)
        .where(and(
          eq(whatsappMessages.leadId, leadId),
          eq(whatsappMessages.direction, 'outbound'),
          eq(whatsappMessages.sentBy, 'human'),
        ))
        .orderBy(desc(whatsappMessages.createdAt))
        .limit(1);

      hasActiveHandoff = !lastHumanOutbound[0]?.createdAt ||
        new Date(lead.whatsappAiHandoffAt) > lastHumanOutbound[0].createdAt;
    }

    res.json({
      whatsappAiEnabled: lead.whatsappAiEnabled,
      hasActiveHandoff,
    });
  } catch (error) {
    logger.error('Erreur AI status', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({ error: 'Erreur AI status' });
  }
});

export default router;
