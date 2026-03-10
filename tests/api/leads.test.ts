import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// --- Hoisted mocks ---
const {
  mockInsert, mockValues, mockReturning,
  mockSelect, mockFrom, mockWhere, mockOrderBy, mockLimit,
  mockUpdate, mockSet, mockUpdateWhere, mockUpdateReturning,
  mockDelete, mockDeleteWhere,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
  mockReturning: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
  mockLimit: vi.fn(),
  mockUpdate: vi.fn(),
  mockSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockUpdateReturning: vi.fn(),
  mockDelete: vi.fn(),
  mockDeleteWhere: vi.fn(),
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
    update: mockUpdate,
    delete: mockDelete,
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
    leads: { id: 'id', name: 'name', status: 'status', source: 'source', createdAt: 'created_at', eventDate: 'event_date' },
    activities: { id: 'id', leadId: 'lead_id' },
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

// Mock passport configuration to avoid real OAuth setup
vi.mock('../../src/auth/passport.js', () => ({
  configurePassport: vi.fn(),
  SCOPES: ['openid', 'email', 'profile'],
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
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('Leads CRUD API', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default mock chain: insert -> values -> returning
    mockReturning.mockResolvedValue([MOCK_LEAD]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    // Default mock chain: select -> from -> where -> orderBy
    mockOrderBy.mockResolvedValue([MOCK_LEAD]);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockSelect.mockReturnValue({ from: mockFrom });

    // Default mock chain: update -> set -> where -> returning
    mockUpdateReturning.mockResolvedValue([MOCK_LEAD]);
    mockUpdateWhere.mockReturnValue({ returning: mockUpdateReturning });
    mockSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    // Default mock chain: delete -> where
    mockDeleteWhere.mockResolvedValue(undefined);
    mockDelete.mockReturnValue({ where: mockDeleteWhere });

    // Re-import app each time to get fresh state
    const module = await import('../../src/app.js');
    app = module.app;
  });

  describe('POST /api/leads', () => {
    it('creates a lead and returns 201 with the lead object', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({ name: 'Sophie Dupont', email: 'sophie@example.com', budget: 5000 })
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('name', 'Sophie Dupont');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/leads')
        .send({ email: 'sophie@example.com' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('GET /api/leads', () => {
    it('returns all leads ordered by createdAt desc', async () => {
      const res = await request(app)
        .get('/api/leads')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(mockSelect).toHaveBeenCalled();
    });

    it('filters by status when query param provided', async () => {
      const res = await request(app)
        .get('/api/leads?status=nouveau')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(mockWhere).toHaveBeenCalled();
    });

    it('filters by source when query param provided', async () => {
      const res = await request(app)
        .get('/api/leads?source=mariages.net')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(mockWhere).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/leads/:id', () => {
    it('updates fields and returns the updated lead', async () => {
      // First select to get current lead (for status change detection)
      mockLimit.mockResolvedValue([MOCK_LEAD]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockUpdateReturning });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const res = await request(app)
        .patch('/api/leads/1')
        .send({ name: 'Nouveau Nom' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('creates a status_change activity when status changes', async () => {
      mockLimit.mockResolvedValue([{ ...MOCK_LEAD, status: 'nouveau' }]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockUpdateReturning });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      mockUpdateReturning.mockResolvedValue([{ ...MOCK_LEAD, status: 'contacte' }]);

      const res = await request(app)
        .patch('/api/leads/1')
        .send({ status: 'contacte' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      // Insert should be called for the activity
      expect(mockInsert).toHaveBeenCalled();
    });

    it('returns 404 for non-existent lead', async () => {
      mockLimit.mockResolvedValue([]);
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const res = await request(app)
        .patch('/api/leads/999')
        .send({ name: 'Test' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/leads/:id', () => {
    it('deletes the lead and returns 204', async () => {
      // Select to check existence
      mockLimit.mockResolvedValue([MOCK_LEAD]);
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const res = await request(app)
        .delete('/api/leads/1')
        .set('Accept', 'application/json');

      expect(res.status).toBe(204);
      // Should delete activities first, then lead
      expect(mockDelete).toHaveBeenCalled();
    });

    it('returns 404 for non-existent lead', async () => {
      mockLimit.mockResolvedValue([]);
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const res = await request(app)
        .delete('/api/leads/999')
        .set('Accept', 'application/json');

      expect(res.status).toBe(404);
    });
  });
});
