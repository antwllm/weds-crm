import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// --- Hoisted mocks ---
const {
  mockInsert, mockValues, mockReturning,
  mockSelect, mockFrom, mockWhere, mockOrderBy, mockLimit,
  mockListThreads, mockGetThread, mockSendReply,
  mockGetGmailClientInstance,
  mockOnConflictDoNothing,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
  mockReturning: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
  mockLimit: vi.fn(),
  mockListThreads: vi.fn(),
  mockGetThread: vi.fn(),
  mockSendReply: vi.fn(),
  mockGetGmailClientInstance: vi.fn(),
  mockOnConflictDoNothing: vi.fn(),
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
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ op: 'eq', val })),
  and: vi.fn((...args: unknown[]) => ({ op: 'and', args: args.filter(Boolean) })),
  gte: vi.fn((_col: unknown, val: unknown) => ({ op: 'gte', val })),
  lte: vi.fn((_col: unknown, val: unknown) => ({ op: 'lte', val })),
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

// Mock config
vi.mock('../../src/config.js', () => ({
  config: {
    SESSION_SECRET: 'test-session-secret',
    NODE_ENV: 'test',
    ADMIN_EMAIL: 'contact@weds.fr',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:8080/auth/google/callback',
  },
}));

// Mock passport
vi.mock('../../src/auth/passport.js', () => ({
  configurePassport: vi.fn(),
  SCOPES: ['openid', 'email', 'profile'],
}));

// Mock Gmail services
vi.mock('../../src/services/gmail.js', () => ({
  listThreads: mockListThreads,
  getThread: mockGetThread,
  sendReply: mockSendReply,
}));

vi.mock('../../src/services/gmail-client-holder.js', () => ({
  getGmailClientInstance: mockGetGmailClientInstance,
}));

// Mock pipedrive sync-push (imported by leads router)
vi.mock('../../src/services/pipedrive/sync-push.js', () => ({
  syncLeadToPipedrive: vi.fn().mockResolvedValue(undefined),
}));

const MOCK_GMAIL_CLIENT = { users: {} };

const MOCK_THREADS = {
  threads: [
    { id: 'thread-1', snippet: 'Bonjour, je cherche un photographe', historyId: '123' },
    { id: 'thread-2', snippet: 'Disponibilites pour juin', historyId: '124' },
  ],
  nextPageToken: 'token-abc',
};

const MOCK_THREAD_DETAIL = {
  id: 'thread-1',
  messages: [
    {
      id: 'msg-1',
      from: 'Sophie Dupont <sophie@example.com>',
      to: 'contact@weds.fr',
      subject: 'Photographe mariage',
      date: 'Mon, 1 Jan 2026 10:00:00 +0000',
      messageId: '<msg-1@mail.gmail.com>',
      snippet: 'Bonjour, je cherche un photographe',
      body: 'Bonjour, je cherche un photographe pour notre mariage.',
    },
  ],
};

const MOCK_LINKED_EMAIL = {
  id: 1,
  leadId: 1,
  gmailMessageId: 'msg-1',
  gmailThreadId: 'thread-1',
  subject: 'Photographe mariage',
  snippet: 'Bonjour',
  direction: 'inbound',
  receivedAt: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
};

describe('Inbox API', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Gmail client is available by default
    mockGetGmailClientInstance.mockReturnValue(MOCK_GMAIL_CLIENT);

    // Default mock chain: select -> from -> where -> orderBy
    mockOrderBy.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockSelect.mockReturnValue({ from: mockFrom });

    // Default mock chain: insert -> values -> returning
    mockOnConflictDoNothing.mockResolvedValue([MOCK_LINKED_EMAIL]);
    mockReturning.mockResolvedValue([MOCK_LINKED_EMAIL]);
    mockValues.mockReturnValue({ returning: mockReturning, onConflictDoNothing: mockOnConflictDoNothing });
    mockInsert.mockReturnValue({ values: mockValues });

    const module = await import('../../src/app.js');
    app = module.app;
  });

  describe('GET /api/inbox/threads', () => {
    it('returns thread list from Gmail', async () => {
      mockListThreads.mockResolvedValue(MOCK_THREADS);

      const res = await request(app)
        .get('/api/inbox/threads')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('threads');
      expect(res.body.threads).toHaveLength(2);
      expect(res.body).toHaveProperty('nextPageToken', 'token-abc');
      expect(mockListThreads).toHaveBeenCalledWith(
        MOCK_GMAIL_CLIENT,
        expect.objectContaining({ maxResults: 20 }),
      );
    });

    it('passes query params to listThreads', async () => {
      mockListThreads.mockResolvedValue({ threads: [], nextPageToken: undefined });

      const res = await request(app)
        .get('/api/inbox/threads?q=from:sophie&pageToken=abc&maxResults=10')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(mockListThreads).toHaveBeenCalledWith(
        MOCK_GMAIL_CLIENT,
        expect.objectContaining({ q: 'from:sophie', pageToken: 'abc', maxResults: 10 }),
      );
    });

    it('returns 503 when Gmail client is not available', async () => {
      mockGetGmailClientInstance.mockReturnValue(null);

      const res = await request(app)
        .get('/api/inbox/threads')
        .set('Accept', 'application/json');

      expect(res.status).toBe(503);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/inbox/threads/:threadId', () => {
    it('returns thread detail with messages', async () => {
      mockGetThread.mockResolvedValue(MOCK_THREAD_DETAIL);

      const res = await request(app)
        .get('/api/inbox/threads/thread-1')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'thread-1');
      expect(res.body).toHaveProperty('messages');
      expect(res.body.messages).toHaveLength(1);
      expect(res.body.messages[0]).toHaveProperty('from');
      expect(res.body.messages[0]).toHaveProperty('body');
    });

    it('returns 503 when Gmail client is not available', async () => {
      mockGetGmailClientInstance.mockReturnValue(null);

      const res = await request(app)
        .get('/api/inbox/threads/thread-1')
        .set('Accept', 'application/json');

      expect(res.status).toBe(503);
    });
  });

  describe('POST /api/inbox/threads/:threadId/reply', () => {
    it('sends reply via Gmail and returns success', async () => {
      mockSendReply.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/inbox/threads/thread-1/reply')
        .send({
          to: 'sophie@example.com',
          subject: 'Re: Photographe mariage',
          body: 'Bonjour Sophie, merci pour votre message.',
          inReplyTo: '<msg-1@mail.gmail.com>',
          references: '<msg-1@mail.gmail.com>',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'sent');
      expect(mockSendReply).toHaveBeenCalledWith(
        MOCK_GMAIL_CLIENT,
        expect.objectContaining({
          threadId: 'thread-1',
          to: 'sophie@example.com',
          body: 'Bonjour Sophie, merci pour votre message.',
        }),
      );
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/inbox/threads/thread-1/reply')
        .send({ to: 'sophie@example.com' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 503 when Gmail client is not available', async () => {
      mockGetGmailClientInstance.mockReturnValue(null);

      const res = await request(app)
        .post('/api/inbox/threads/thread-1/reply')
        .send({
          to: 'sophie@example.com',
          subject: 'Re: Test',
          body: 'Test',
          inReplyTo: '<msg@mail.gmail.com>',
          references: '<msg@mail.gmail.com>',
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(503);
    });
  });

  describe('GET /api/leads/:leadId/emails', () => {
    it('returns linked emails for a lead ordered by receivedAt desc', async () => {
      mockOrderBy.mockResolvedValue([MOCK_LINKED_EMAIL]);
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const res = await request(app)
        .get('/api/leads/1/emails')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('emails');
      expect(res.body.emails).toHaveLength(1);
      expect(res.body.emails[0]).toHaveProperty('gmailMessageId', 'msg-1');
    });

    it('returns empty emails array for lead with no linked emails', async () => {
      mockOrderBy.mockResolvedValue([]);
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const res = await request(app)
        .get('/api/leads/999/emails')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('emails');
      expect(res.body.emails).toHaveLength(0);
    });
  });
});
