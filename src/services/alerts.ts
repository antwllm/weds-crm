import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { sendEmail } from './gmail.js';
import { getDb } from '../db/index.js';
import { notificationSettings } from '../db/schema.js';
import type { gmail_v1 } from 'googleapis';

/**
 * Triple alerting on notification failure.
 * Alerts via all surviving channels: SMS (Free Mobile), email (contact@weds.fr), and logs.
 * Skips the channel that failed to avoid infinite loops.
 * Best-effort: never throws even if alert channels also fail.
 */
export async function alertNotificationFailure(
  failedChannel: string,
  error: string,
  lead: { id?: number; name: string },
  gmailClient?: gmail_v1.Gmail
): Promise<void> {
  // Always log (never skip logs)
  logger.error(`ALERTE: Echec notification ${failedChannel}`, {
    failedChannel,
    error,
    leadName: lead.name,
    leadId: lead.id,
  });

  // Query toggle settings for alert channels
  let alertToggles = new Map<string, boolean>();
  try {
    const db = getDb();
    const settings = await db.select().from(notificationSettings);
    for (const s of settings) {
      alertToggles.set(s.channel, s.enabled);
    }
  } catch (err) {
    // Fail-open: if we can't read settings, send alerts anyway
    logger.warn('Impossible de lire les toggles pour les alertes, envoi par defaut', { error: err });
  }

  // SMS alert via Free Mobile (skip if Free Mobile is the failed channel OR toggle is off)
  if (failedChannel !== 'free_mobile_sms' && alertToggles.get('free_mobile_error') !== false) {
    try {
      const alertMsg = `ALERTE: Echec notification ${failedChannel} pour lead ${lead.name}. Erreur: ${error}`;
      await axios.get('https://smsapi.free-mobile.fr/sendmsg', {
        params: {
          user: config.FREE_MOBILE_USER!,
          pass: config.FREE_MOBILE_PASS!,
          msg: alertMsg,
        },
      });
    } catch (smsError) {
      // Best-effort: log but don't throw
      logger.error('Alert SMS also failed', {
        originalChannel: failedChannel,
        alertError: smsError instanceof Error ? smsError.message : String(smsError),
      });
    }
  }

  // Email alert (skip if email is the failed channel, toggle is off, or no gmailClient)
  if (failedChannel !== 'email_recap' && alertToggles.get('email_error') !== false && gmailClient) {
    try {
      const subject = `ALERTE: Echec notification - ${lead.name}`;
      const body =
        `<h2>Echec notification</h2>` +
        `<p><strong>Canal:</strong> ${failedChannel}</p>` +
        `<p><strong>Lead:</strong> ${lead.name} (ID: ${lead.id ?? 'N/A'})</p>` +
        `<p><strong>Erreur:</strong> ${error}</p>` +
        `<p><strong>Date:</strong> ${new Date().toISOString()}</p>`;

      await sendEmail(gmailClient, config.ADMIN_EMAIL, subject, body);
    } catch (emailError) {
      // Best-effort: log but don't throw
      logger.error('Alert email also failed', {
        originalChannel: failedChannel,
        alertError: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }
  }
}
