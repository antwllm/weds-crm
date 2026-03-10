import type { gmail_v1 } from 'googleapis';
import { eq, or, and, isNotNull } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { leads, activities } from '../db/schema.js';
import { logger } from '../logger.js';
import { getMessageContent, modifyLabels, searchMessages, ensureLabelsExist } from '../services/gmail.js';
import { parseMarriagesNetEmail } from '../services/parser.js';
import { generateVCardContent } from '../services/vcard.js';
import { uploadVCardAndGetSignedUrl } from '../services/storage.js';
import { dispatchNotifications } from '../services/notifications.js';
import { sendFreeMobileSMS } from '../services/sms.js';
import type { PipelineResult } from '../types.js';

// --- Concurrency guard ---
let isProcessing = false;

/**
 * Reset processing flag (for testing).
 */
export function _resetProcessingFlag(): void {
  isProcessing = false;
}

/**
 * Check if a lead with the same email or phone already exists.
 * Only matches on phone if phone is not null.
 */
export async function checkDuplicate(
  email: string,
  phone: string | null
): Promise<{ isDuplicate: boolean; existingLeadId?: number }> {
  const db = getDb();

  const conditions = [eq(leads.email, email.toLowerCase())];

  if (phone) {
    conditions.push(
      and(
        isNotNull(leads.phone),
        eq(leads.phone, phone)
      ) as any
    );
  }

  const existing = await db
    .select()
    .from(leads)
    .where(or(...conditions));

  if (existing.length > 0) {
    return { isDuplicate: true, existingLeadId: existing[0].id };
  }

  return { isDuplicate: false };
}

/**
 * Process a single email end-to-end:
 * parse -> dedup check -> create lead -> generate vCard -> upload -> notify -> relabel
 *
 * Returns null on parse failure.
 */
export async function processOneEmail(
  messageId: string,
  gmail: gmail_v1.Gmail,
  labelIds: Record<string, string>
): Promise<PipelineResult | null> {
  const db = getDb();
  const pendingLabelId = labelIds['weds-crm/pending'];
  const processedLabelId = labelIds['weds-crm/processed'];
  const errorLabelId = labelIds['weds-crm/error'];

  try {
    // 1. Get message content
    const body = await getMessageContent(gmail, messageId);

    // 2. Parse email
    const parsed = parseMarriagesNetEmail(body);

    if (!parsed) {
      // Parse failure: label with error, send admin alert
      logger.error('Echec du parsing email', { messageId });
      await modifyLabels(gmail, messageId, [errorLabelId], [pendingLabelId]);

      // Send admin alert via Free Mobile
      try {
        await sendFreeMobileSMS(
          { name: 'ERREUR', phone: '', email: '', eventDate: '', message: `Parsing echoue pour message ${messageId}` },
          ''
        );
      } catch {
        logger.error('Echec envoi alerte admin pour erreur de parsing', { messageId });
      }

      return null;
    }

    // 3. Check duplicate
    const dupResult = await checkDuplicate(parsed.email, parsed.phone);

    if (dupResult.isDuplicate && dupResult.existingLeadId) {
      // Duplicate: log activity on existing lead
      logger.info('Doublon detecte', { messageId, existingLeadId: dupResult.existingLeadId });

      await db.insert(activities).values({
        leadId: dupResult.existingLeadId,
        type: 'duplicate_inquiry',
        content: `Nouvelle demande depuis Mariages.net (doublon). Message: ${parsed.message}`,
        gmailMessageId: messageId,
      });

      // Relabel: add processed, remove pending
      await modifyLabels(gmail, messageId, [processedLabelId], [pendingLabelId]);

      return {
        leadId: dupResult.existingLeadId,
        isDuplicate: true,
        notifications: [],
      };
    }

    // 4. Create new lead
    const [newLead] = await db.insert(leads).values({
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      phone: parsed.phone,
      eventDate: parsed.eventDate,
      message: parsed.message,
      source: 'mariages.net',
      status: 'nouveau',
      gmailMessageId: messageId,
    }).returning();

    // 5. Log activity
    await db.insert(activities).values({
      leadId: newLead.id,
      type: 'email_received',
      content: `Nouvelle demande Mariages.net de ${parsed.name}`,
      gmailMessageId: messageId,
    });

    // 6. Generate and upload vCard
    const vCardContent = generateVCardContent({
      name: parsed.name,
      email: parsed.email,
      phone: parsed.phone,
      eventDate: parsed.eventDate,
    });

    const vCardUrl = await uploadVCardAndGetSignedUrl(parsed.name, vCardContent);

    // 7. Store vCard URL on lead
    await db.update(leads).set({ vCardUrl }).where(eq(leads.id, newLead.id));

    // 8. Dispatch notifications
    const notifications = await dispatchNotifications(
      { ...newLead, vCardUrl } as any,
      vCardUrl,
      vCardContent,
      gmail
    );

    // 9. Relabel: add processed, remove pending
    await modifyLabels(gmail, messageId, [processedLabelId], [pendingLabelId]);

    logger.info('Email traite avec succes', {
      messageId,
      leadId: newLead.id,
      leadName: parsed.name,
    });

    return {
      leadId: newLead.id,
      isDuplicate: false,
      notifications,
    };
  } catch (error) {
    logger.error('Erreur pipeline pour message', {
      messageId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Search for pending emails and process each one.
 * Concurrency guard prevents overlapping runs.
 */
export async function processPendingEmails(gmail: gmail_v1.Gmail): Promise<void> {
  if (isProcessing) {
    logger.debug('Pipeline deja en cours, skip');
    return;
  }

  isProcessing = true;

  try {
    // Ensure labels exist
    const labelIds = await ensureLabelsExist(gmail);
    const pendingLabelId = labelIds['weds-crm/pending'];

    if (!pendingLabelId) {
      logger.error('Label weds-crm/pending introuvable');
      return;
    }

    // Search for pending emails
    const messages = await searchMessages(gmail, pendingLabelId);

    if (messages.length === 0) {
      logger.debug('Aucun email en attente');
      return;
    }

    logger.info(`${messages.length} email(s) en attente de traitement`);

    // Process each message
    for (const message of messages) {
      if (!message.id) continue;

      try {
        await processOneEmail(message.id, gmail, labelIds);
      } catch (error) {
        logger.error('Erreur traitement email individuel', {
          messageId: message.id,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue processing other emails
      }
    }
  } finally {
    isProcessing = false;
  }
}
