import * as Sentry from '@sentry/node';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { sendTwilioSMS, sendFreeMobileSMS } from './sms.js';
import { sendEmail } from './gmail.js';
import { alertNotificationFailure } from './alerts.js';
import type { Lead, NotificationResult } from '../types.js';
import type { gmail_v1 } from 'googleapis';

/**
 * Dispatch all 3 notifications independently via Promise.allSettled.
 * One failure does not block the others.
 * Failed notifications trigger triple alerting via alertNotificationFailure.
 */
export async function dispatchNotifications(
  lead: Lead,
  vCardUrl: string,
  vCardContent: string,
  gmailClient: gmail_v1.Gmail
): Promise<NotificationResult[]> {
  const channels = ['twilio_sms', 'free_mobile_sms', 'email_recap'] as const;

  // Email recap content
  const emailSubject = `Nouveau lead Mariages.net - ${lead.name}`;
  const emailBody =
    `<h2>Nouveau lead Mariages.net</h2>` +
    `<table>` +
    `<tr><td><strong>Nom:</strong></td><td>${lead.name}</td></tr>` +
    `<tr><td><strong>Email:</strong></td><td>${lead.email ?? 'N/A'}</td></tr>` +
    `<tr><td><strong>Telephone:</strong></td><td>${lead.phone ?? 'N/A'}</td></tr>` +
    `<tr><td><strong>Date evenement:</strong></td><td>${lead.eventDate ?? 'N/A'}</td></tr>` +
    `<tr><td><strong>Message:</strong></td><td>${lead.message ?? 'N/A'}</td></tr>` +
    `</table>` +
    `<p><a href="${vCardUrl}">Telecharger la vCard</a></p>`;

  const attachments: { filename: string; content: string; mimeType: string }[] = [
    {
      filename: `${lead.name}.vcf`,
      content: vCardContent,
      mimeType: 'text/vcard',
    },
  ];

  // Skip Twilio if not configured
  const twilioEnabled = !!(config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_PHONE_NUMBER);
  if (!twilioEnabled) {
    logger.info('Twilio non configure -- SMS prospect desactive');
  }

  // Fire notifications independently (skip Twilio if not configured)
  const results = await Promise.allSettled([
    twilioEnabled
      ? sendTwilioSMS(lead.name, lead.eventDate ?? '', lead.phone ?? '')
      : Promise.resolve({ channel: 'twilio_sms' as const, success: true, error: undefined } as NotificationResult),
    sendFreeMobileSMS(
      {
        name: lead.name,
        phone: lead.phone ?? '',
        email: lead.email ?? '',
        eventDate: lead.eventDate ?? '',
        message: lead.message ?? '',
      },
      vCardUrl
    ),
    sendEmail(gmailClient, config.ADMIN_EMAIL, emailSubject, emailBody, attachments),
  ]);

  const notificationResults: NotificationResult[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const channel = channels[i];

    if (result.status === 'fulfilled') {
      // For sendEmail (index 2), it returns void, so build our own result
      if (channel === 'email_recap') {
        notificationResults.push({ channel: 'email_recap', success: true });
        logger.info(`Notification success: ${channel}`, { channel, leadId: lead.id });
      } else {
        // sendTwilioSMS and sendFreeMobileSMS return NotificationResult
        const notifResult = result.value as NotificationResult;
        notificationResults.push(notifResult);

        if (notifResult.success) {
          logger.info(`Notification success: ${channel}`, { channel, leadId: lead.id });
        } else {
          // The service itself handled the error and returned success: false
          logger.error(`Notification failed: ${channel}`, {
            channel,
            leadId: lead.id,
            error: notifResult.error,
          });
          Sentry.captureException(new Error(notifResult.error ?? `${channel} failed`), {
            tags: { channel },
          });
          await alertNotificationFailure(
            channel,
            notifResult.error ?? 'Unknown error',
            { id: lead.id, name: lead.name },
            gmailClient
          );
        }
      }
    } else {
      // Promise rejected (unexpected error)
      const errorMessage =
        result.reason instanceof Error ? result.reason.message : String(result.reason);
      notificationResults.push({
        channel,
        success: false,
        error: errorMessage,
      });
      logger.error(`Notification failed: ${channel}`, {
        channel,
        leadId: lead.id,
        error: errorMessage,
      });
      Sentry.captureException(result.reason instanceof Error ? result.reason : new Error(errorMessage), {
        tags: { channel },
      });
      await alertNotificationFailure(
        channel,
        errorMessage,
        { id: lead.id, name: lead.name },
        gmailClient
      );
    }
  }

  return notificationResults;
}
