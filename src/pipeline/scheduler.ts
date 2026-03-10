import cron from 'node-cron';
import type { gmail_v1 } from 'googleapis';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { processPendingEmails } from './process-email.js';

/**
 * Renew the Gmail push notification watch.
 * Must be renewed before expiration (typically 7 days).
 * Watches for messages in INBOX only.
 */
export async function renewGmailWatch(gmail: gmail_v1.Gmail): Promise<void> {
  const topic = config.GMAIL_PUBSUB_TOPIC;

  if (!topic) {
    logger.warn('GMAIL_PUBSUB_TOPIC non configure -- watch non renouvele');
    return;
  }

  try {
    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: topic,
        labelIds: ['INBOX'],
      },
    });

    const expiration = res.data.expiration
      ? new Date(Number(res.data.expiration)).toISOString()
      : 'inconnu';

    logger.info('Gmail watch renouvele', {
      historyId: res.data.historyId,
      expiration,
    });
  } catch (error) {
    logger.error('Erreur renouvellement Gmail watch', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Start the cron scheduler for:
 * 1. Fallback email sweep (default: every 30 min)
 * 2. Gmail watch renewal (daily at 3 AM)
 *
 * Also renews the watch immediately on start.
 */
export function startScheduler(gmail: gmail_v1.Gmail): void {
  // Renew watch immediately on startup
  renewGmailWatch(gmail);

  // Fallback sweep: process pending emails on schedule
  const sweepInterval = config.FALLBACK_SWEEP_INTERVAL;
  cron.schedule(sweepInterval, async () => {
    logger.info('Cron: lancement sweep des emails en attente');
    try {
      await processPendingEmails(gmail);
    } catch (error) {
      logger.error('Cron: erreur sweep emails', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Gmail watch renewal: daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    logger.info('Cron: renouvellement Gmail watch');
    await renewGmailWatch(gmail);
  });

  logger.info('Scheduler demarre', { sweepInterval });
}
