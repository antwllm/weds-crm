import { config } from '../config.js';
import { logger } from '../logger.js';

interface GmailPubSubNotification {
  historyId: string;
  emailAddress: string;
}

/**
 * Decode and parse a Pub/Sub push notification message from Gmail.
 * The message.data field is base64-encoded JSON with historyId and emailAddress.
 *
 * Validates that the emailAddress matches the configured allowed user.
 * Throws if the message is invalid or from an unexpected email.
 */
export function handlePubSubMessage(messageData: string): GmailPubSubNotification {
  let decoded: string;
  try {
    decoded = Buffer.from(messageData, 'base64').toString('utf-8');
  } catch {
    throw new Error('Echec decodage base64 du message Pub/Sub');
  }

  let parsed: { historyId?: string; emailAddress?: string };
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error('Echec parsing JSON du message Pub/Sub');
  }

  if (!parsed.historyId || !parsed.emailAddress) {
    throw new Error('Message Pub/Sub invalide: historyId ou emailAddress manquant');
  }

  // Validate email matches allowed user
  if (
    config.ALLOWED_USER_EMAIL &&
    parsed.emailAddress.toLowerCase() !== config.ALLOWED_USER_EMAIL.toLowerCase()
  ) {
    logger.warn('Notification Pub/Sub pour un email non autorise', {
      received: parsed.emailAddress,
      allowed: config.ALLOWED_USER_EMAIL,
    });
    throw new Error(`Email non autorise: ${parsed.emailAddress}`);
  }

  logger.info('Notification Pub/Sub Gmail recue', {
    historyId: parsed.historyId,
    emailAddress: parsed.emailAddress,
  });

  return {
    historyId: parsed.historyId,
    emailAddress: parsed.emailAddress,
  };
}
