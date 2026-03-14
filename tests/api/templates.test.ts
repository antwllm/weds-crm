import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// --- Hoisted mocks ---
const {
  mockInsert, mockValues, mockReturning,
  mockSelect, mockFrom, mockWhere, mockOrderBy, mockLimit,
  mockUpdate, mockSet,
  mockDelete,
  mockSubstituteVariables,
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
  mockDelete: vi.fn(),
  mockSubstituteVariables: vi.fn(),
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

// Mock Gmail services (needed by inbox router which is loaded via app.ts)
vi.mock('../../src/services/gmail.js', () => ({
  listThreads: vi.fn(),
  getThread: vi.fn(),
  sendReply: vi.fn(),
}));

vi.mock('../../src/services/gmail-client-holder.js', () => ({
  getGmailClientInstance: vi.fn(),
}));

// Mock pipedrive sync-push
vi.mock('../../src/services/pipedrive/sync-push.js', () => ({
  syncLeadToPipedrive: vi.fn().mockResolvedValue(undefined),
}));

// Mock openrouter
vi.mock('../../src/services/openrouter.js', () => ({
  substituteVariables: mockSubstituteVariables,
  assembleLeadContext: vi.fn(),
  generateDraft: vi.fn(),
}));

const MOCK_TEMPLATE = {
  id: 1,
  name: 'Premier contact',
  subject: 'Bonjour {{nom}}',
  body: 'Bonjour {{nom}}, merci pour votre demande pour le {{date_evenement}}.',
  variables: ['nom', 'date_evenement'],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('Templates API', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default mock chain: select -> from -> where -> orderBy
    mockOrderBy.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit, returning: mockReturning });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockSelect.mockReturnValue({ from: mockFrom });

    // Default mock chain: insert -> values -> returning
    mockReturning.mockResolvedValue([MOCK_TEMPLATE]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    // Default mock chain: update -> set -> where -> returning
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    // Default mock chain: delete -> where
    mockDelete.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue(undefined);

    const module = await import('../../src/app.js');
    app = module.app;
  });

  describe('GET /api/templates', () => {
    it('returns all email templates', async () => {
      mockOrderBy.mockResolvedValue([MOCK_TEMPLATE]);

      const res = await request(app)
        .get('/api/templates')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.templates).toHaveLength(1);
      expect(res.body.templates[0]).toHaveProperty('name', 'Premier contact');
    });

    it('returns empty array when no templates exist', async () => {
      mockOrderBy.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/templates')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body.templates).toHaveLength(0);
    });
  });

  describe('POST /api/templates', () => {
    it('creates a template and returns 201', async () => {
      const res = await request(app)
        .post('/api/templates')
        .send({
          name: 'Premier contact',
          subject: 'Bonjour {{nom}}',
          body: 'Bonjour {{nom}}, merci.',
          variables: ['nom'],
        })
        .set('Accept', 'application/json');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('name', 'Premier contact');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/templates')
        .send({ subject: 'Test', body: 'Test body' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/templates/:id', () => {
    it('updates an existing template', async () => {
      const updated = { ...MOCK_TEMPLATE, name: 'Contact modifie' };
      mockReturning.mockResolvedValue([updated]);
      mockWhere.mockReturnValue({ returning: mockReturning });

      const res = await request(app)
        .put('/api/templates/1')
        .send({ name: 'Contact modifie' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'Contact modifie');
    });
  });

  describe('DELETE /api/templates/:id', () => {
    it('deletes a template and returns 204', async () => {
      mockWhere.mockResolvedValue(undefined);

      const res = await request(app)
        .delete('/api/templates/1')
        .set('Accept', 'application/json');

      expect(res.status).toBe(204);
    });
  });

  describe('POST /api/templates/:id/preview', () => {
    it('returns template with variables substituted from lead data', async () => {
      // First call: select template
      const templateResult = [MOCK_TEMPLATE];
      // Second call: select lead
      const leadResult = [{ id: 1, name: 'Sophie Dupont', email: 'sophie@test.com', phone: '+33612345678', eventDate: '15/06/2027', budget: 2500 }];

      let callCount = 0;
      mockLimit.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(templateResult);
        return Promise.resolve(leadResult);
      });
      mockWhere.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      mockSubstituteVariables
        .mockReturnValueOnce('Bonjour Sophie Dupont')
        .mockReturnValueOnce('Bonjour Sophie Dupont, merci pour votre demande pour le 15/06/2027.');

      const res = await request(app)
        .post('/api/templates/1/preview')
        .send({ leadId: 1 })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('subject');
      expect(res.body).toHaveProperty('body');
    });
  });
});
