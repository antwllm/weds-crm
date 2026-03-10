import { Router } from 'express';
import { logger } from '../logger.js';
import { handlePubSubMessage } from '../services/pubsub.js';
import { processPendingEmails } from '../pipeline/process-email.js';
import { getGmailClientInstance } from '../services/gmail-client-holder.js';

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

export default router;
