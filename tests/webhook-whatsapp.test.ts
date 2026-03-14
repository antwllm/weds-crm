import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createHmac } from 'crypto';

// --- Hoisted mocks ---
const {
  mockInsert, mockValues,
  mockSelect, mockFrom, mockWhere, mockOrderBy, mockLimit,
  mockParseIncomingMessage, mockVerifyWebhookSignature,
  mockSendFreeMobileSMS,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
  mockLimit: vi.fn(),
  mockParseIncomingMessage: vi.fn(),
  mockVerifyWebhookSignature: vi.fn(),
  mockSendFreeMobileSMS: vi.fn(),
}));

// Mock environment variables
vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id');
vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret');
vi.stubEnv('GOOGLE_REDIRECT_URI', 'http://localhost:8080/auth/google/callback');
vi.stubEnv('SESSION_SECRET', 'test-session-secret');
vi.stubEnv('NODE_ENV', 'test');

// Mock pg Pool
vi.mock('pg', () => {
  class MockPool {
    query = vi.fn().mockResolvedValue({ rows: [] });
    connect = vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    });
    end = vi.fn().mockResolvedValue(undefined);
    on = vi.fn();
  }
  return { default: { Pool: MockPool } };
});

// Mock connect-pg-simple
vi.mock('connect-pg-simple', () => {
  const { Store } = require('express-session');
  class MockPgStore extends Store {
    get(_sid: string, cb: Function) { cb(null, null); }
    set(_sid: string, _sess: unknown, cb: Function) { cb(null); }
    destroy(_sid: string, cb: Function) { cb(null); }
  }
  return { default: vi.fn(() => MockPgStore) };
});

// Mock Sentry
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  setupExpressErrorHandler: vi.fn(),
  captureException: vi.fn(),
}));

// Mock db
vi.mock('../src/db/index.js', () => ({
  getDb: vi.fn(() => ({
    insert: mockInsert,
    select: mockSelect,
  })),
  getPool: vi.fn(() => ({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    }),
    end: vi.fn(),
    on: vi.fn(),
  })),
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ op: 'eq', val })),
  and: vi.fn((...args: unknown[]) => ({ op: 'and', args: args.filter(Boolean) })),
  desc: vi.fn((_col: unknown) => ({ op: 'desc' })),
  asc: vi.fn((_col: unknown) => ({ op: 'asc' })),
  or: vi.fn((...args: unknown[]) => ({ op: 'or', args })),
  sql: vi.fn(),
}));

// Mock ensureAuthenticated
vi.mock('../src/auth/middleware.js', () => ({
  ensureAuthenticated: vi.fn((_req: any, _res: any, next: any) => next()),
}));

// Mock logger
vi.mock('../src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock config with WhatsApp vars
vi.mock('../src/config.js', () => ({
  config: {
    SESSION_SECRET: 'test-session-secret',
    NODE_ENV: 'test',
    ADMIN_EMAIL: 'contact@weds.fr',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:8080/auth/google/callback',
    WHATSAPP_PHONE_NUMBER_ID: 'phone-id-123',
    WHATSAPP_ACCESS_TOKEN: 'test-access-token',
    WHATSAPP_VERIFY_TOKEN: 'my-verify-token',
    WHATSAPP_APP_SECRET: 'test-app-secret',
    FREE_MOBILE_USER: 'test-user',
    FREE_MOBILE_PASS: 'test-pass',
  },
}));

// Mock passport
vi.mock('../src/auth/passport.js', () => ({
  configurePassport: vi.fn(),
  SCOPES: ['openid', 'email', 'profile'],
}));

// Mock WhatsApp service
vi.mock('../src/services/whatsapp.js', () => ({
  sendWhatsAppMessage: vi.fn(),
  parseIncomingMessage: mockParseIncomingMessage,
  verifyWebhookSignature: mockVerifyWebhookSignature,
}));

// Mock SMS service
vi.mock('../src/services/sms.js', () => ({
  sendFreeMobileSMS: mockSendFreeMobileSMS,
  sendTwilioSMS: vi.fn(),
}));

// Mock pubsub, pipeline, gmail-client-holder
vi.mock('../src/services/pubsub.js', () => ({
  handlePubSubMessage: vi.fn(),
}));
vi.mock('../src/pipeline/process-email.js', () => ({
  processPendingEmails: vi.fn(),
}));
vi.mock('../src/services/gmail-client-holder.js', () => ({
  getGmailClientInstance: vi.fn(),
}));

// Mock pipedrive sync-pull
vi.mock('../src/services/pipedrive/sync-pull.js', () => ({
  isWithinSuppressionWindow: vi.fn(),
  handleDealUpdate: vi.fn(),
  handleDealCreated: vi.fn(),
  handleDealDeleted: vi.fn(),
  handlePersonUpdate: vi.fn(),
}));

// Mock pipedrive sync-push
vi.mock('../src/services/pipedrive/sync-push.js', () => ({
  syncLeadToPipedrive: vi.fn(),
}));

// Mock axios for Free Mobile SMS alert
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

const VALID_WA_WEBHOOK_PAYLOAD = {
  entry: [{
    id: '123',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: { phone_number_id: 'phone-id-123' },
        messages: [{
          from: '33612345678',
          id: 'wamid.incoming123',
          timestamp: '1710000000',
          type: 'text',
          text: { body: 'Bonjour, je suis interesse!' },
        }],
      },
      field: 'messages',
    }],
  }],
};

const MOCK_LEAD = {
  id: 1,
  name: 'Sophie Dupont',
  email: 'sophie@example.com',
  phone: '+33612345678',
  eventDate: '15/06/2027',
  message: 'Bonjour',
  budget: 5000,
  source: 'mariages.net',
  status: 'nouveau',
  vCardUrl: null,
  gmailMessageId: null,
  pipedrivePersonId: null,
  pipedriveDealId: null,
  lastSyncOrigin: null,
  lastSyncAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('WhatsApp Webhook', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default insert chain
    mockValues.mockResolvedValue([{ id: 1 }]);
    mockInsert.mockReturnValue({ values: mockValues });

    // Default select chain
    mockLimit.mockResolvedValue([]);
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockSelect.mockReturnValue({ from: mockFrom });

    // Default signature verification passes
    mockVerifyWebhookSignature.mockReturnValue(true);

    // Default parse returns a message
    mockParseIncomingMessage.mockReturnValue({
      from: '33612345678',
      text: 'Bonjour, je suis interesse!',
      timestamp: 1710000000,
      waMessageId: 'wamid.incoming123',
    });

    // SMS alert succeeds
    mockSendFreeMobileSMS.mockResolvedValue({ channel: 'free_mobile_sms', success: true });

    const module = await import('../src/app.js');
    app = module.app;
  });

  describe('GET /webhook/whatsapp (verification)', () => {
    it('returns hub.challenge on correct verify_token', async () => {
      const res = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'my-verify-token',
          'hub.challenge': 'test-challenge-123',
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe('test-challenge-123');
    });

    it('returns 403 on wrong verify_token', async () => {
      const res = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'test-challenge-123',
        });

      expect(res.status).toBe(403);
    });

    it('returns 403 when hub.mode is not subscribe', async () => {
      const res = await request(app)
        .get('/webhook/whatsapp')
        .query({
          'hub.mode': 'other',
          'hub.verify_token': 'my-verify-token',
          'hub.challenge': 'test-challenge-123',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /webhook/whatsapp (incoming messages)', () => {
    it('responds 200 immediately to acknowledge webhook', async () => {
      const res = await request(app)
        .post('/webhook/whatsapp')
        .send(VALID_WA_WEBHOOK_PAYLOAD)
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', 'sha256=dummy');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('stores inbound message and creates activity when lead found', async () => {
      // Lead found by phone
      mockWhere.mockResolvedValueOnce([MOCK_LEAD]);

      const res = await request(app)
        .post('/webhook/whatsapp')
        .send(VALID_WA_WEBHOOK_PAYLOAD)
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', 'sha256=dummy');

      expect(res.status).toBe(200);

      // Wait for setImmediate processing
      await new Promise((r) => setTimeout(r, 50));

      expect(mockParseIncomingMessage).toHaveBeenCalledWith(VALID_WA_WEBHOOK_PAYLOAD);
      // 2 inserts: whatsappMessage + activity
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });

    it('logs warning when no matching lead found', async () => {
      // No lead found
      mockWhere.mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/webhook/whatsapp')
        .send(VALID_WA_WEBHOOK_PAYLOAD)
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', 'sha256=dummy');

      expect(res.status).toBe(200);

      // Wait for setImmediate processing
      await new Promise((r) => setTimeout(r, 50));

      const { logger } = await import('../src/logger.js');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/WhatsApp.*lead/i),
        expect.objectContaining({ from: '33612345678' }),
      );
    });

    it('skips processing when parseIncomingMessage returns null', async () => {
      mockParseIncomingMessage.mockReturnValue(null);

      const res = await request(app)
        .post('/webhook/whatsapp')
        .send({ entry: [{ changes: [{ value: { statuses: [] } }] }] })
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', 'sha256=dummy');

      expect(res.status).toBe(200);

      await new Promise((r) => setTimeout(r, 50));

      // No DB inserts for status updates
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('returns 403 when signature verification fails', async () => {
      mockVerifyWebhookSignature.mockReturnValue(false);

      const res = await request(app)
        .post('/webhook/whatsapp')
        .send(VALID_WA_WEBHOOK_PAYLOAD)
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', 'sha256=invalid');

      expect(res.status).toBe(403);
    });
  });
});
