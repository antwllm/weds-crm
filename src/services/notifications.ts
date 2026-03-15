import * as Sentry from '@sentry/node';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { sendFreeMobileSMS } from './sms.js';
import { sendEmail } from './gmail.js';
import { sendWhatsAppTemplate } from './whatsapp.js';
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
  const channels = ['whatsapp_prospect', 'free_mobile_sms', 'email_recap'] as const;

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

  // Skip WhatsApp if not configured or no phone
  const whatsappEnabled = !!(config.WHATSAPP_PHONE_NUMBER_ID && config.WHATSAPP_ACCESS_TOKEN && lead.phone);
  if (!whatsappEnabled) {
    logger.info('WhatsApp non configure ou pas de telephone -- message prospect desactive');
  }

  // Fire notifications independently
  const results = await Promise.allSettled([
    whatsappEnabled
      ? sendWhatsAppTemplate(
          config.WHATSAPP_PHONE_NUMBER_ID!,
          config.WHATSAPP_ACCESS_TOKEN!,
          lead.phone!.replace(/^\+/, ''),
          'demande_dinformations_complmentaires',
          'fr',
        ).then((waMessageId) => ({
          channel: 'whatsapp_prospect' as const,
          success: true,
          error: undefined,
          waMessageId,
        } as NotificationResult))
        .catch((err) => ({
          channel: 'whatsapp_prospect' as const,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        } as NotificationResult))
      : Promise.resolve({ channel: 'whatsapp_prospect' as const, success: true, error: undefined } as NotificationResult),
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
