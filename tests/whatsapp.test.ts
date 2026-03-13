import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import {
  WHATSAPP_TEXT_MESSAGE_WEBHOOK,
  WHATSAPP_MEDIA_MESSAGE_WEBHOOK,
  WHATSAPP_STATUS_UPDATE_WEBHOOK,
} from './helpers/fixtures.js';

import {
  sendWhatsAppMessage,
  parseIncomingMessage,
  verifyWebhookSignature,
} from '../src/services/whatsapp.js';

describe('sendWhatsAppMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls correct URL with correct payload and returns message ID', async () => {
    const mockAxiosInstance = {
      post: vi.fn().mockResolvedValue({
        data: { messages: [{ id: 'wamid.sent123' }] },
      }),
    };

    const result = await sendWhatsAppMessage(
      'phone-id-123',
      'test-access-token',
      '33612345678',
      'Bonjour, voici votre confirmation.',
      mockAxiosInstance as never,
    );

    expect(result).toBe('wamid.sent123');
    expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);

    const [url, payload, config] = mockAxiosInstance.post.mock.calls[0];
    expect(url).toBe('https://graph.facebook.com/v21.0/phone-id-123/messages');
    expect(payload.messaging_product).toBe('whatsapp');
    expect(payload.recipient_type).toBe('individual');
    expect(payload.to).toBe('33612345678');
    expect(payload.type).toBe('text');
    expect(payload.text.body).toBe('Bonjour, voici votre confirmation.');
    expect(config.headers['Authorization']).toBe('Bearer test-access-token');
  });
});

describe('parseIncomingMessage', () => {
  it('extracts text message correctly', () => {
    const result = parseIncomingMessage(WHATSAPP_TEXT_MESSAGE_WEBHOOK);

    expect(result).not.toBeNull();
    expect(result!.from).toBe('33612345678');
    expect(result!.text).toBe('Bonjour, je souhaite confirmer notre rendez-vous.');
    expect(result!.timestamp).toBe(1710000000);
    expect(result!.waMessageId).toBe('wamid.abc123');
  });

  it('returns null for status updates (no messages array)', () => {
    const result = parseIncomingMessage(WHATSAPP_STATUS_UPDATE_WEBHOOK);
    expect(result).toBeNull();
  });

  it('returns "Media recu" for non-text messages', () => {
    const result = parseIncomingMessage(WHATSAPP_MEDIA_MESSAGE_WEBHOOK);

    expect(result).not.toBeNull();
    expect(result!.text).toBe('Media recu');
    expect(result!.from).toBe('33612345678');
    expect(result!.waMessageId).toBe('wamid.media456');
  });
});

describe('verifyWebhookSignature', () => {
  const appSecret = 'test-app-secret';

  it('passes for valid signature', () => {
    const rawBody = Buffer.from('{"test":"data"}');
    const hmac = createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const signature = `sha256=${hmac}`;

    const result = verifyWebhookSignature(rawBody, signature, appSecret);
    expect(result).toBe(true);
  });

  it('fails for invalid signature', () => {
    const rawBody = Buffer.from('{"test":"data"}');
    const signature = 'sha256=invalid_signature_value_that_is_definitely_wrong_abcdef0123456789abcdef0123456789';

    const result = verifyWebhookSignature(rawBody, signature, appSecret);
    expect(result).toBe(false);
  });
});
