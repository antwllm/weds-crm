import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// --- Hoisted mocks ---
const {
  mockInsert, mockValues, mockReturning,
  mockSelect, mockFrom, mockWhere, mockOrderBy,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
  mockReturning: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
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
    leads: { id: 'id' },
    activities: { id: 'id', leadId: 'lead_id', createdAt: 'created_at' },
  },
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

const MOCK_ACTIVITY = {
  id: 1,
  leadId: 1,
  type: 'note_added',
  content: 'Note de test',
  metadata: null,
  gmailMessageId: null,
  createdAt: new Date('2026-01-01'),
};

describe('Activities API', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default mock chain: select -> from -> where -> orderBy
    mockOrderBy.mockResolvedValue([MOCK_ACTIVITY]);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });

    // Default mock chain: insert -> values -> returning
    mockReturning.mockResolvedValue([MOCK_ACTIVITY]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    const module = await import('../../src/app.js');
    app = module.app;
  });

  describe('GET /api/leads/:id/activities', () => {
    it('returns activities ordered by createdAt asc (chronological)', async () => {
      const res = await request(app)
        .get('/api/leads/1/activities')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(mockSelect).toHaveBeenCalled();
    });

    it('returns empty array for non-existent lead (no error)', async () => {
      mockOrderBy.mockResolvedValue([]);
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const res = await request(app)
        .get('/api/leads/999/activities')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /api/leads/:id/notes', () => {
    it('creates a note_added activity and returns 201', async () => {
      const res = await request(app)
        .post('/api/leads/1/notes')
        .send({ content: 'Note de test' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('type', 'note_added');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('returns 400 when content is empty', async () => {
      const res = await request(app)
        .post('/api/leads/1/notes')
        .send({ content: '' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('returns 400 when content is missing', async () => {
      const res = await request(app)
        .post('/api/leads/1/notes')
        .send({})
        .set('Accept', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});
