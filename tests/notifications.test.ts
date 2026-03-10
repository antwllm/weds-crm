import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
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

// Mock sms module for orchestrator tests
vi.mock('../src/services/sms.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/sms.js')>();
  return {
    ...actual,
    sendTwilioSMS: vi.fn(actual.sendTwilioSMS),
    sendFreeMobileSMS: vi.fn(actual.sendFreeMobileSMS),
  };
});

// Mock gmail service (does not exist yet -- will be created in plan 01-05)
vi.mock('../src/services/gmail.js', () => ({
  sendEmail: vi.fn(),
}));

// Mock Sentry
vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}));

import axios from 'axios';
import { sendTwilioSMS, sendFreeMobileSMS } from '../src/services/sms.js';
import { sendEmail } from '../src/services/gmail.js';
import { logger } from '../src/logger.js';
import * as Sentry from '@sentry/node';

const mockedAxios = vi.mocked(axios);
const mockedSendTwilioSMS = vi.mocked(sendTwilioSMS);
const mockedSendFreeMobileSMS = vi.mocked(sendFreeMobileSMS);
const mockedSendEmail = vi.mocked(sendEmail);
const mockedLogger = vi.mocked(logger);

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

// ---- Task 2: alertNotificationFailure + dispatchNotifications ----

// Lazy imports for Task 2 modules (will be created during GREEN phase)
let alertNotificationFailure: typeof import('../src/services/alerts.js')['alertNotificationFailure'];
let dispatchNotifications: typeof import('../src/services/notifications.js')['dispatchNotifications'];

describe('alertNotificationFailure', () => {
  const sampleLead = { id: 42, name: 'Marie Dupont' };
  const fakeGmailClient = {} as any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mocks to default behavior for alert tests
    mockedAxios.get.mockResolvedValue({ data: '' });
    mockedSendEmail.mockResolvedValue(undefined);

    // Dynamic import to pick up mocks
    const alertsModule = await import('../src/services/alerts.js');
    alertNotificationFailure = alertsModule.alertNotificationFailure;
  });

  it('logs error with structured context for any failed channel', async () => {
    await alertNotificationFailure('twilio_sms', 'Connection timeout', sampleLead, fakeGmailClient);

    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('twilio_sms'),
      expect.objectContaining({
        failedChannel: 'twilio_sms',
        error: 'Connection timeout',
        leadName: 'Marie Dupont',
        leadId: 42,
      })
    );
  });

  it('sends Free Mobile SMS alert when Twilio fails', async () => {
    await alertNotificationFailure('twilio_sms', 'API error', sampleLead, fakeGmailClient);

    // Free Mobile SMS should be called (via axios.get to smsapi.free-mobile.fr)
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://smsapi.free-mobile.fr/sendmsg',
      expect.objectContaining({
        params: expect.objectContaining({
          msg: expect.stringContaining('twilio_sms'),
        }),
      })
    );
  });

  it('sends email alert when Twilio fails', async () => {
    await alertNotificationFailure('twilio_sms', 'API error', sampleLead, fakeGmailClient);

    expect(mockedSendEmail).toHaveBeenCalledWith(
      fakeGmailClient,
      'contact@weds.fr',
      expect.stringContaining('Marie Dupont'),
      expect.stringContaining('twilio_sms')
    );
  });

  it('skips SMS alert when Free Mobile is the failed channel', async () => {
    await alertNotificationFailure('free_mobile_sms', 'Rate limited', sampleLead, fakeGmailClient);

    // Should NOT call Free Mobile SMS (that's the broken channel)
    expect(mockedAxios.get).not.toHaveBeenCalledWith(
      'https://smsapi.free-mobile.fr/sendmsg',
      expect.anything()
    );

    // Should still send email
    expect(mockedSendEmail).toHaveBeenCalled();

    // Should still log
    expect(mockedLogger.error).toHaveBeenCalled();
  });

  it('skips email alert when email is the failed channel', async () => {
    await alertNotificationFailure('email_recap', 'SMTP error', sampleLead, fakeGmailClient);

    // Should NOT send email (that's the broken channel)
    expect(mockedSendEmail).not.toHaveBeenCalled();

    // Should still send Free Mobile SMS
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://smsapi.free-mobile.fr/sendmsg',
      expect.anything()
    );

    // Should still log
    expect(mockedLogger.error).toHaveBeenCalled();
  });

  it('does not throw even if alert channels also fail', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('SMS alert failed too'));
    mockedSendEmail.mockRejectedValueOnce(new Error('Email alert failed too'));

    // Should not throw
    await expect(
      alertNotificationFailure('twilio_sms', 'API error', sampleLead, fakeGmailClient)
    ).resolves.toBeUndefined();
  });

  it('skips email alert when gmailClient is not provided', async () => {
    await alertNotificationFailure('twilio_sms', 'API error', sampleLead);

    // No email alert without gmailClient
    expect(mockedSendEmail).not.toHaveBeenCalled();

    // SMS alert still fires
    expect(mockedAxios.get).toHaveBeenCalled();
  });
});

describe('dispatchNotifications', () => {
  const sampleLead = {
    id: 42,
    name: 'Marie Dupont',
    email: 'marie@example.com',
    phone: '+33612345678',
    eventDate: '15 juin 2026',
    message: 'Nous cherchons un photographe.',
    source: 'mariages.net',
    status: 'nouveau' as const,
    vCardUrl: null,
    gmailMessageId: 'msg123',
    pipedrivePersonId: null,
    pipedriveDealId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const vCardUrl = 'https://storage.googleapis.com/bucket/vcards/marie.vcf?signed=1';
  const vCardContent = 'BEGIN:VCARD\nVERSION:3.0\nFN:Marie Dupont\nEND:VCARD';
  const fakeGmailClient = {} as any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: all succeed
    mockedSendTwilioSMS.mockResolvedValue({ channel: 'twilio_sms', success: true });
    mockedSendFreeMobileSMS.mockResolvedValue({ channel: 'free_mobile_sms', success: true });
    mockedSendEmail.mockResolvedValue(undefined);

    // Prevent alert side effects
    mockedAxios.get.mockResolvedValue({ data: '' });

    const notifModule = await import('../src/services/notifications.js');
    dispatchNotifications = notifModule.dispatchNotifications;
  });

  it('returns 3 success results when all notifications succeed', async () => {
    const results = await dispatchNotifications(sampleLead, vCardUrl, vCardContent, fakeGmailClient);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success)).toBe(true);
    expect(results.map((r) => r.channel)).toEqual(
      expect.arrayContaining(['twilio_sms', 'free_mobile_sms', 'email_recap'])
    );
  });

  it('calls all three notification services', async () => {
    await dispatchNotifications(sampleLead, vCardUrl, vCardContent, fakeGmailClient);

    expect(mockedSendTwilioSMS).toHaveBeenCalledWith('Marie Dupont', '15 juin 2026', '+33612345678');
    expect(mockedSendFreeMobileSMS).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Marie Dupont' }),
      vCardUrl
    );
    expect(mockedSendEmail).toHaveBeenCalledWith(
      fakeGmailClient,
      'contact@weds.fr',
      expect.stringContaining('Marie Dupont'),
      expect.stringContaining('Marie Dupont'),
      expect.arrayContaining([
        expect.objectContaining({ filename: 'Marie Dupont.vcf' }),
      ])
    );
  });

  it('returns 1 failure and 2 successes when Twilio fails', async () => {
    mockedSendTwilioSMS.mockResolvedValueOnce({
      channel: 'twilio_sms',
      success: false,
      error: 'Twilio down',
    });

    const results = await dispatchNotifications(sampleLead, vCardUrl, vCardContent, fakeGmailClient);

    const failures = results.filter((r) => !r.success);
    const successes = results.filter((r) => r.success);

    expect(failures).toHaveLength(1);
    expect(failures[0].channel).toBe('twilio_sms');
    expect(successes).toHaveLength(2);
  });

  it('returns 3 failures when all notifications fail', async () => {
    mockedSendTwilioSMS.mockResolvedValueOnce({
      channel: 'twilio_sms',
      success: false,
      error: 'fail',
    });
    mockedSendFreeMobileSMS.mockResolvedValueOnce({
      channel: 'free_mobile_sms',
      success: false,
      error: 'fail',
    });
    mockedSendEmail.mockRejectedValueOnce(new Error('email fail'));

    const results = await dispatchNotifications(sampleLead, vCardUrl, vCardContent, fakeGmailClient);

    expect(results.filter((r) => !r.success)).toHaveLength(3);
  });

  it('logs failures via logger.error and Sentry', async () => {
    mockedSendTwilioSMS.mockResolvedValueOnce({
      channel: 'twilio_sms',
      success: false,
      error: 'Twilio down',
    });

    await dispatchNotifications(sampleLead, vCardUrl, vCardContent, fakeGmailClient);

    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('twilio_sms'),
      expect.objectContaining({ channel: 'twilio_sms' })
    );

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tags: expect.objectContaining({ channel: 'twilio_sms' }),
      })
    );
  });

  it('sends email recap with vCard attachment and French subject', async () => {
    await dispatchNotifications(sampleLead, vCardUrl, vCardContent, fakeGmailClient);

    expect(mockedSendEmail).toHaveBeenCalledWith(
      fakeGmailClient,
      'contact@weds.fr',
      expect.stringContaining('Nouveau lead Mariages.net'),
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({
          filename: 'Marie Dupont.vcf',
          content: vCardContent,
          mimeType: 'text/vcard',
        }),
      ])
    );
  });
});
