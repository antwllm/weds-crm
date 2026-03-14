import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// --- Hoisted mocks ---
const {
  mockInsert, mockValues, mockReturning,
  mockSelect, mockFrom, mockWhere, mockOrderBy, mockLimit,
  mockSendWhatsApp,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
  mockReturning: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
  mockLimit: vi.fn(),
  mockSendWhatsApp: vi.fn(),
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
vi.mock('../../src/db/index.js', () => ({
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
  schema: {
    leads: { id: 'id', name: 'name', phone: 'phone' },
    whatsappMessages: { id: 'id', leadId: 'lead_id', direction: 'direction', createdAt: 'created_at' },
    activities: { id: 'id', leadId: 'lead_id' },
  },
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ op: 'eq', val })),
  and: vi.fn((...args: unknown[]) => ({ op: 'and', args: args.filter(Boolean) })),
  desc: vi.fn((_col: unknown) => ({ op: 'desc' })),
  asc: vi.fn((_col: unknown) => ({ op: 'asc' })),
  sql: vi.fn(),
}));

// Mock ensureAuthenticated to always pass
vi.mock('../../src/auth/middleware.js', () => ({
  ensureAuthenticated: vi.fn((_req: any, _res: any, next: any) => next()),
}));

// Mock logger
vi.mock('../../src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock config with WhatsApp vars
vi.mock('../../src/config.js', () => ({
  config: {
    SESSION_SECRET: 'test-session-secret',
    NODE_ENV: 'test',
    ADMIN_EMAIL: 'contact@weds.fr',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:8080/auth/google/callback',
    WHATSAPP_PHONE_NUMBER_ID: 'phone-id-123',
    WHATSAPP_ACCESS_TOKEN: 'test-access-token',
  },
}));

// Mock passport
vi.mock('../../src/auth/passport.js', () => ({
  configurePassport: vi.fn(),
  SCOPES: ['openid', 'email', 'profile'],
}));

// Mock WhatsApp service
vi.mock('../../src/services/whatsapp.js', () => ({
  sendWhatsAppMessage: mockSendWhatsApp,
}));

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

const MOCK_LEAD_NO_PHONE = { ...MOCK_LEAD, id: 2, phone: null };

describe('WhatsApp API Routes', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default insert chain
    mockReturning.mockResolvedValue([{ id: 1 }]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    // Default select chain
    mockLimit.mockResolvedValue([]);
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockSelect.mockReturnValue({ from: mockFrom });

    // WhatsApp send returns message ID
    mockSendWhatsApp.mockResolvedValue('wamid.sent123');

    const module = await import('../../src/app.js');
    app = module.app;
  });

  describe('POST /api/leads/:leadId/whatsapp/send', () => {
    it('sends a WhatsApp message and stores it', async () => {
      // First select: find lead
      mockWhere.mockResolvedValueOnce([MOCK_LEAD]);

      const res = await request(app)
        .post('/api/leads/1/whatsapp/send')
        .send({ message: 'Bonjour Sophie!' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('sent');
      expect(res.body.waMessageId).toBe('wamid.sent123');
      expect(mockSendWhatsApp).toHaveBeenCalledWith(
        'phone-id-123', 'test-access-token', '+33612345678', 'Bonjour Sophie!'
      );
      // Should insert whatsappMessage + activity = 2 insert calls
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });

    it('returns 400 when lead has no phone number', async () => {
      mockWhere.mockResolvedValueOnce([MOCK_LEAD_NO_PHONE]);

      const res = await request(app)
        .post('/api/leads/2/whatsapp/send')
        .send({ message: 'Bonjour!' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/phone/i);
    });

    it('returns 404 when lead not found', async () => {
      mockWhere.mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/api/leads/999/whatsapp/send')
        .send({ message: 'Hello' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(404);
    });

    it('returns 503 when WhatsApp config is missing', async () => {
      // Override config mock for this test
      const { config } = await import('../../src/config.js');
      (config as any).WHATSAPP_PHONE_NUMBER_ID = undefined;

      mockWhere.mockResolvedValueOnce([MOCK_LEAD]);

      const res = await request(app)
        .post('/api/leads/1/whatsapp/send')
        .send({ message: 'Bonjour' })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(503);

      // Restore
      (config as any).WHATSAPP_PHONE_NUMBER_ID = 'phone-id-123';
    });
  });

  describe('GET /api/leads/:leadId/whatsapp', () => {
    it('returns message history in ascending order', async () => {
      const messages = [
        { id: 1, leadId: 1, direction: 'inbound', body: 'Hello', createdAt: new Date('2026-03-10') },
        { id: 2, leadId: 1, direction: 'outbound', body: 'Bonjour!', createdAt: new Date('2026-03-11') },
      ];
      // For history route: where -> orderBy (terminal, no .limit())
      const mockHistoryOrderBy = vi.fn().mockResolvedValue(messages);
      const mockHistoryWhere = vi.fn().mockReturnValue({ orderBy: mockHistoryOrderBy });
      const mockHistoryFrom = vi.fn().mockReturnValue({ where: mockHistoryWhere });
      mockSelect.mockReturnValueOnce({ from: mockHistoryFrom });

      const res = await request(app)
        .get('/api/leads/1/whatsapp')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(2);
      expect(res.body.messages[0].direction).toBe('inbound');
      expect(res.body.messages[1].direction).toBe('outbound');
    });
  });

  describe('GET /api/leads/:leadId/whatsapp/window', () => {
    it('returns isOpen true when last inbound message is within 24h', async () => {
      const recentInbound = {
        id: 1,
        leadId: 1,
        direction: 'inbound',
        body: 'Hello',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };
      // Rebuild mock chain for this test to ensure clean state
      const mockWindowLimit = vi.fn().mockResolvedValue([recentInbound]);
      const mockWindowOrderBy = vi.fn().mockReturnValue({ limit: mockWindowLimit });
      const mockWindowWhere = vi.fn().mockReturnValue({ orderBy: mockWindowOrderBy });
      const mockWindowFrom = vi.fn().mockReturnValue({ where: mockWindowWhere });
      mockSelect.mockReturnValueOnce({ from: mockWindowFrom });

      const res = await request(app)
        .get('/api/leads/1/whatsapp/window')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.isOpen).toBe(true);
      expect(res.body.expiresAt).toBeTruthy();
    });

    it('returns isOpen false when no inbound messages', async () => {
      const mockWindowLimit = vi.fn().mockResolvedValue([]);
      const mockWindowOrderBy = vi.fn().mockReturnValue({ limit: mockWindowLimit });
      const mockWindowWhere = vi.fn().mockReturnValue({ orderBy: mockWindowOrderBy });
      const mockWindowFrom = vi.fn().mockReturnValue({ where: mockWindowWhere });
      mockSelect.mockReturnValueOnce({ from: mockWindowFrom });

      const res = await request(app)
        .get('/api/leads/1/whatsapp/window')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.isOpen).toBe(false);
      expect(res.body.expiresAt).toBeNull();
    });

    it('returns isOpen false when last inbound message is older than 24h', async () => {
      const oldInbound = {
        id: 1,
        leadId: 1,
        direction: 'inbound',
        body: 'Hello',
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };
      const mockWindowLimit = vi.fn().mockResolvedValue([oldInbound]);
      const mockWindowOrderBy = vi.fn().mockReturnValue({ limit: mockWindowLimit });
      const mockWindowWhere = vi.fn().mockReturnValue({ orderBy: mockWindowOrderBy });
      const mockWindowFrom = vi.fn().mockReturnValue({ where: mockWindowWhere });
      mockSelect.mockReturnValueOnce({ from: mockWindowFrom });

      const res = await request(app)
        .get('/api/leads/1/whatsapp/window')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.isOpen).toBe(false);
    });
  });
});
