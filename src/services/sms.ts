import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../logger.js';
import type { NotificationResult } from '../types.js';

/**
 * Send a personalized French SMS to the prospect via Twilio.
 */
export async function sendTwilioSMS(
  name: string,
  eventDate: string,
  phone: string
): Promise<NotificationResult> {
  const message =
    `Bonjour ${name}, merci d'avoir pris contact avec weds.fr. ` +
    `Nous avons bien recu votre demande de photographe pour votre mariage le ${eventDate}. ` +
    `Nous revenons vers vous d'ici 24h.\n\nL'equipe de weds.fr`;

  const accountSid = config.TWILIO_ACCOUNT_SID!;
  const authToken = config.TWILIO_AUTH_TOKEN!;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const params = new URLSearchParams();
  params.append('From', config.TWILIO_PHONE_NUMBER!);
  params.append('To', phone);
  params.append('Body', message);

  try {
    await axios.post(url, params, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    logger.info(`Twilio SMS sent to ${phone}`, { channel: 'twilio_sms', phone });
    return { channel: 'twilio_sms', success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Twilio SMS failed for ${phone}`, {
      channel: 'twilio_sms',
      phone,
      error: errorMessage,
    });
    return { channel: 'twilio_sms', success: false, error: errorMessage };
  }
}

/**
 * Send a lead summary SMS to admin via Free Mobile API.
 * Includes lead details and vCard download link.
 */
export async function sendFreeMobileSMS(
  lead: {
    name: string;
    phone: string;
    email: string;
    eventDate: string;
    message: string;
  },
  vCardUrl: string
): Promise<NotificationResult> {
  const messageExcerpt = lead.message.substring(0, 200);

  const msg =
    `Mariages.net - ${lead.name} se marie le ${lead.eventDate}\n\n` +
    `Phone : ${lead.phone}\n` +
    `Email : ${lead.email}\n\n` +
    `Voici son message : ${messageExcerpt}\n\n` +
    `vCard : ${vCardUrl}`;

  const url = 'https://smsapi.free-mobile.fr/sendmsg';

  try {
    await axios.get(url, {
      params: {
        user: config.FREE_MOBILE_USER!,
        pass: config.FREE_MOBILE_PASS!,
        msg,
      },
    });

    logger.info('Free Mobile SMS sent', { channel: 'free_mobile_sms', leadName: lead.name });
    return { channel: 'free_mobile_sms', success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Free Mobile SMS failed', {
      channel: 'free_mobile_sms',
      leadName: lead.name,
      error: errorMessage,
    });
    return { channel: 'free_mobile_sms', success: false, error: errorMessage };
  }
}
