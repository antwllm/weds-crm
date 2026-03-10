import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { sendEmail } from './gmail.js';
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

  // SMS alert via Free Mobile (skip if Free Mobile is the failed channel)
  if (failedChannel !== 'free_mobile_sms') {
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

  // Email alert (skip if email is the failed channel or no gmailClient)
  if (failedChannel !== 'email_recap' && gmailClient) {
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
