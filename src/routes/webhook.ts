import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { logger } from '../logger.js';
import { config } from '../config.js';
import { handlePubSubMessage } from '../services/pubsub.js';
import { processPendingEmails } from '../pipeline/process-email.js';
import { getGmailClientInstance } from '../services/gmail-client-holder.js';
import { getDb } from '../db/index.js';
import { leads, whatsappMessages, activities } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';
import {
  isWithinSuppressionWindow,
  handleDealUpdate,
  handleDealCreated,
  handleDealDeleted,
  handlePersonUpdate,
} from '../services/pipedrive/sync-pull.js';
import {
  parseIncomingMessage,
  verifyWebhookSignature,
} from '../services/whatsapp.js';
import type { Lead } from '../types.js';
import axios from 'axios';

const router = Router();

/**
 * POST /webhook/gmail
 *
 * Receives Pub/Sub push notifications from Gmail.
 * Decodes the message, then triggers a full pending email sweep.
 * Returns 200 immediately to acknowledge Pub/Sub (avoids redelivery).
 * Actual processing runs asynchronously via setImmediate.
 *
 * No app-level auth required -- Pub/Sub uses OIDC verification at Cloud Run level.
 */
router.post('/gmail', (req, res) => {
  // Acknowledge immediately to avoid Pub/Sub redelivery
  res.status(200).json({ status: 'ok' });

  try {
    const messageData = req.body?.message?.data;

    if (!messageData) {
      logger.warn('Webhook Gmail: message.data manquant dans le body');
      return;
    }

    const notification = handlePubSubMessage(messageData);

    logger.info('Webhook Gmail: notification recue, lancement sweep', {
      historyId: notification.historyId,
      emailAddress: notification.emailAddress,
    });

    // Process asynchronously -- don't block the response
    setImmediate(async () => {
      try {
        const gmail = getGmailClientInstance();
        if (!gmail) {
          logger.warn('Webhook Gmail: pas de client Gmail disponible -- en attente d\'authentification');
          return;
        }
        await processPendingEmails(gmail);
      } catch (error) {
        logger.error('Webhook Gmail: erreur pendant le sweep', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  } catch (error) {
    logger.error('Webhook Gmail: erreur traitement notification', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// --- Pipedrive Webhook v2 payload schema ---

const webhookPayloadSchema = z.object({
  meta: z.object({
    action: z.enum(['create', 'change', 'delete']),
    entity: z.enum(['deal', 'person']),
    entity_id: z.coerce.number(),
    change_source: z.string(),
    timestamp: z.string(),
    user_id: z.coerce.number(),
  }),
  data: z.record(z.string(), z.unknown()),
  previous: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Verify basic auth credentials for Pipedrive webhook.
 * Returns true if auth is valid or auth is not configured (dev mode).
 */
function verifyPipedriveAuth(authHeader: string | undefined): boolean {
  const expectedUser = config.PIPEDRIVE_WEBHOOK_USER;
  const expectedPassword = config.PIPEDRIVE_WEBHOOK_PASSWORD;

  // If credentials not configured (dev mode), skip auth check
  if (!expectedUser || !expectedPassword) return true;

  if (!authHeader || !authHeader.startsWith('Basic ')) return false;

  try {
    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return false;

    const user = decoded.slice(0, colonIndex);
    const password = decoded.slice(colonIndex + 1);

    // Timing-safe comparison to prevent timing attacks
    const userBuffer = Buffer.from(user);
    const expectedUserBuffer = Buffer.from(expectedUser);
    const passwordBuffer = Buffer.from(password);
    const expectedPasswordBuffer = Buffer.from(expectedPassword);

    const userMatch =
      userBuffer.length === expectedUserBuffer.length &&
      timingSafeEqual(userBuffer, expectedUserBuffer);
    const passwordMatch =
      passwordBuffer.length === expectedPasswordBuffer.length &&
      timingSafeEqual(passwordBuffer, expectedPasswordBuffer);

    return userMatch && passwordMatch;
  } catch {
    return false;
  }
}

/**
 * POST /webhook/pipedrive
 *
 * Receives Pipedrive webhook v2 events (deal/person create/change/delete).
 * Applies dual-layer loop prevention:
 *   1. Discard API-origin events (meta.change_source === 'api')
 *   2. Discard events within 5s suppression window of CRM-originated sync
 * Returns 200 immediately, processes asynchronously via setImmediate.
 */
router.post('/pipedrive', (req, res) => {
  // Basic auth verification
  if (!verifyPipedriveAuth(req.headers.authorization)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Acknowledge immediately
  res.status(200).json({ status: 'ok' });

  // Process asynchronously
  setImmediate(async () => {
    try {
      // Validate payload with Zod
      const parseResult = webhookPayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        logger.warn('Webhook Pipedrive: payload invalide', {
          errors: parseResult.error.issues.map((i) => i.message),
        });
        return;
      }

      const { meta, data, previous } = parseResult.data;

      // Layer 1: API-origin loop prevention
      if (meta.change_source === 'api') {
        logger.debug('Webhook Pipedrive: changement API ignore (origine CRM)', {
          entity: meta.entity,
          entityId: meta.entity_id,
        });
        return;
      }

      const db = getDb();

      // Find linked lead
      let lead: Lead | null = null;
      if (meta.entity === 'deal') {
        const results = await db
          .select()
          .from(leads)
          .where(eq(leads.pipedriveDealId, meta.entity_id));
        lead = (results[0] as Lead) ?? null;
      } else if (meta.entity === 'person') {
        const results = await db
          .select()
          .from(leads)
          .where(eq(leads.pipedrivePersonId, meta.entity_id));
        lead = (results[0] as Lead) ?? null;
      }

      // Layer 2: Suppression window loop prevention
      if (
        lead &&
        lead.lastSyncOrigin === 'crm' &&
        isWithinSuppressionWindow(lead.lastSyncAt)
      ) {
        logger.debug('Webhook Pipedrive: dans la fenetre de suppression', {
          leadId: lead.id,
          entity: meta.entity,
          entityId: meta.entity_id,
        });
        return;
      }

      // Dispatch by event type
      const eventType = `${meta.action}.${meta.entity}`;
      switch (eventType) {
        case 'change.deal':
          await handleDealUpdate(data, previous, lead);
          break;
        case 'create.deal':
          await handleDealCreated(data);
          break;
        case 'delete.deal':
          await handleDealDeleted(meta.entity_id, lead);
          break;
        case 'change.person':
          await handlePersonUpdate(data, previous);
          break;
        default:
          logger.warn('Webhook Pipedrive: type evenement inconnu', {
            eventType,
            entityId: meta.entity_id,
          });
      }
    } catch (error) {
      logger.error('Webhook Pipedrive: erreur traitement', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
});

// --- WhatsApp Webhook ---

/**
 * GET /webhook/whatsapp
 *
 * WhatsApp verification handshake. Meta sends a GET request with
 * hub.mode, hub.verify_token, and hub.challenge to verify the webhook URL.
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.WHATSAPP_VERIFY_TOKEN) {
    logger.info('Webhook WhatsApp: verification reussie');
    res.status(200).send(challenge);
    return;
  }

  logger.warn('Webhook WhatsApp: echec verification', { mode, token });
  res.status(403).json({ error: 'Verification echouee' });
});

/**
 * POST /webhook/whatsapp
 *
 * Receives incoming WhatsApp messages via Meta webhook.
 * Verifies HMAC signature if WHATSAPP_APP_SECRET is configured.
 * Responds 200 immediately, processes asynchronously via setImmediate.
 * Links incoming messages to leads by phone number, stores in DB,
 * creates activities, and sends Free Mobile SMS alert.
 */
router.post('/whatsapp', (req, res) => {
  // Verify signature if app secret is configured
  if (config.WHATSAPP_APP_SECRET) {
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = (req as any).rawBody as Buffer | undefined;

    if (!signature || !rawBody || !verifyWebhookSignature(rawBody, signature, config.WHATSAPP_APP_SECRET)) {
      logger.warn('Webhook WhatsApp: signature invalide');
      res.status(403).json({ error: 'Signature invalide' });
      return;
    }
  }

  // Acknowledge immediately
  res.status(200).json({ status: 'ok' });

  // Process asynchronously
  setImmediate(async () => {
    try {
      const parsed = parseIncomingMessage(req.body);

      if (!parsed) {
        // Status update or non-message event -- skip
        return;
      }

      const { from, text, waMessageId } = parsed;
      const db = getDb();

      // Find lead by phone number — try all common formats:
      // Meta sends E.164 without +, e.g. "33651157842"
      // Lead phone may be stored as "+33651157842", "33651157842", or "0651157842"
      const withPlus = from.startsWith('+') ? from : `+${from}`;
      const withoutPlus = from.startsWith('+') ? from.slice(1) : from;
      // Convert E.164 to French domestic: +33651... → 0651...
      const domestic = withPlus.startsWith('+33')
        ? '0' + withPlus.slice(3)
        : null;

      const phoneVariants = [withPlus, withoutPlus];
      if (domestic) phoneVariants.push(domestic);

      const leadResults = await db
        .select()
        .from(leads)
        .where(
          or(
            ...phoneVariants.map((p) => eq(leads.phone, p)),
          ),
        );

      const lead = leadResults[0] as Lead | undefined;

      if (lead) {
        // Store inbound message
        await db.insert(whatsappMessages).values({
          leadId: lead.id,
          waMessageId,
          direction: 'inbound',
          body: text,
          status: 'delivered',
        });

        // Create activity
        await db.insert(activities).values({
          leadId: lead.id,
          type: 'whatsapp_received',
          content: text,
        });

        // Send Free Mobile SMS alert (best-effort, never throw)
        try {
          const alertMsg = `WhatsApp de ${lead.name}: ${text.slice(0, 100)}`;
          if (config.FREE_MOBILE_USER && config.FREE_MOBILE_PASS) {
            await axios.get('https://smsapi.free-mobile.fr/sendmsg', {
              params: {
                user: config.FREE_MOBILE_USER,
                pass: config.FREE_MOBILE_PASS,
                msg: alertMsg,
              },
            });
          }
        } catch (smsError) {
          logger.error('Webhook WhatsApp: echec alerte SMS', {
            error: smsError instanceof Error ? smsError.message : String(smsError),
          });
        }

        logger.info('Webhook WhatsApp: message entrant traite', {
          leadId: lead.id,
          from,
          waMessageId,
        });
      } else {
        logger.warn('Webhook WhatsApp: aucun lead trouve pour ce numero', { from });
      }
    } catch (error) {
      logger.error('Webhook WhatsApp: erreur traitement', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
});

export default router;
