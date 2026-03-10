import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NotificationResult } from '../src/types.js';

// Mock axios at module level
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock config
vi.mock('../src/config.js', () => ({
  config: {
    TWILIO_ACCOUNT_SID: 'ACtest1234567890',
    TWILIO_AUTH_TOKEN: 'test_auth_token_secret',
    TWILIO_PHONE_NUMBER: '+33756951376',
    FREE_MOBILE_USER: '12345678',
    FREE_MOBILE_PASS: 'testpass123',
    ADMIN_EMAIL: 'contact@weds.fr',
  },
}));

// Mock logger
vi.mock('../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import axios from 'axios';
import { sendTwilioSMS, sendFreeMobileSMS } from '../src/services/sms.js';

const mockedAxios = vi.mocked(axios);

describe('sendTwilioSMS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Twilio API with correct URL and Basic auth header', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { sid: 'SM123' } });

    await sendTwilioSMS('Marie Dupont', '15 juin 2026', '+33612345678');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const [url, body, options] = mockedAxios.post.mock.calls[0];

    // Verify URL with account SID
    expect(url).toBe(
      'https://api.twilio.com/2010-04-01/Accounts/ACtest1234567890/Messages.json'
    );

    // Verify Basic auth header (base64 of accountSid:authToken)
    const expectedAuth = Buffer.from('ACtest1234567890:test_auth_token_secret').toString('base64');
    expect(options.headers.Authorization).toBe(`Basic ${expectedAuth}`);
  });

  it('sends URLSearchParams body with From, To, and French message Body', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { sid: 'SM123' } });

    await sendTwilioSMS('Marie Dupont', '15 juin 2026', '+33612345678');

    const [, body] = mockedAxios.post.mock.calls[0];

    // body should be URLSearchParams
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(body.get('From')).toBe('+33756951376');
    expect(body.get('To')).toBe('+33612345678');

    // French message template
    const msgBody = body.get('Body')!;
    expect(msgBody).toContain('Bonjour Marie Dupont');
    expect(msgBody).toContain('15 juin 2026');
    expect(msgBody).toContain('weds.fr');
    expect(msgBody).toContain("L'equipe de weds.fr");
  });

  it('returns success NotificationResult on success', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { sid: 'SM123' } });

    const result = await sendTwilioSMS('Marie', '15 juin 2026', '+33612345678');

    expect(result).toEqual<NotificationResult>({
      channel: 'twilio_sms',
      success: true,
    });
  });

  it('returns failure NotificationResult on API error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Twilio API error'));

    const result = await sendTwilioSMS('Marie', '15 juin 2026', '+33612345678');

    expect(result).toEqual<NotificationResult>({
      channel: 'twilio_sms',
      success: false,
      error: 'Twilio API error',
    });
  });
});

describe('sendFreeMobileSMS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleLead = {
    name: 'Marie Dupont',
    phone: '+33612345678',
    email: 'marie@example.com',
    eventDate: '15 juin 2026',
    message: 'Bonjour, nous cherchons un photographe pour notre mariage.',
  };

  const vCardUrl = 'https://storage.googleapis.com/bucket/vcards/marie.vcf?X-Goog-Signature=abc123';

  it('calls Free Mobile API with correct URL and params', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '' });

    await sendFreeMobileSMS(sampleLead, vCardUrl);

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    const [url, options] = mockedAxios.get.mock.calls[0];

    expect(url).toBe('https://smsapi.free-mobile.fr/sendmsg');
    expect(options.params.user).toBe('12345678');
    expect(options.params.pass).toBe('testpass123');
  });

  it('includes lead details and vCard URL in message body', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '' });

    await sendFreeMobileSMS(sampleLead, vCardUrl);

    const [, options] = mockedAxios.get.mock.calls[0];
    const msg: string = options.params.msg;

    expect(msg).toContain('Marie Dupont');
    expect(msg).toContain('15 juin 2026');
    expect(msg).toContain('+33612345678');
    expect(msg).toContain('marie@example.com');
    expect(msg).toContain('photographe');
    expect(msg).toContain(vCardUrl);
  });

  it('truncates message excerpt to first 200 chars', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '' });

    const longLead = {
      ...sampleLead,
      message: 'A'.repeat(300),
    };

    await sendFreeMobileSMS(longLead, vCardUrl);

    const [, options] = mockedAxios.get.mock.calls[0];
    const msg: string = options.params.msg;

    // Should contain truncated message (200 chars) not the full 300
    expect(msg).toContain('A'.repeat(200));
    expect(msg).not.toContain('A'.repeat(201));
  });

  it('returns success NotificationResult on success', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: '' });

    const result = await sendFreeMobileSMS(sampleLead, vCardUrl);

    expect(result).toEqual<NotificationResult>({
      channel: 'free_mobile_sms',
      success: true,
    });
  });

  it('returns failure NotificationResult on API error', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Free Mobile API error'));

    const result = await sendFreeMobileSMS(sampleLead, vCardUrl);

    expect(result).toEqual<NotificationResult>({
      channel: 'free_mobile_sms',
      success: false,
      error: 'Free Mobile API error',
    });
  });
});
