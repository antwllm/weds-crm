import axios, { type AxiosInstance } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * WhatsApp Cloud API service: send messages, parse incoming webhooks, verify signatures.
 * All functions use DI pattern -- no module-level state.
 */

/**
 * Send a text message via WhatsApp Cloud API.
 * Returns the WhatsApp message ID on success.
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
  httpClient?: { post: AxiosInstance['post'] },
): Promise<string> {
  const client = httpClient || axios;

  const response = await client.post(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body },
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data.messages[0].id;
}

/**
 * Parse an incoming WhatsApp webhook payload.
 * Returns null for non-message events (status updates, etc.).
 * Returns 'Media recu' for non-text message types (V1: text only).
 */
export function parseIncomingMessage(
  body: any,
): { from: string; text: string; timestamp: number; waMessageId: string } | null {
  const entry = body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value?.messages || value.messages.length === 0) {
    return null;
  }

  const message = value.messages[0];

  return {
    from: message.from,
    text: message.type === 'text' ? message.text?.body || '' : 'Media recu',
    timestamp: Number(message.timestamp),
    waMessageId: message.id,
  };
}

/**
 * Verify a WhatsApp webhook signature using HMAC-SHA256.
 * The signature header format is 'sha256=<hex_digest>'.
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  appSecret: string,
): boolean {
  const expectedHmac = createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  const expectedSignature = `sha256=${expectedHmac}`;

  // Use timingSafeEqual to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}
