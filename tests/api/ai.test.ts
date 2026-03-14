import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// --- Hoisted mocks ---
const {
  mockInsert, mockValues, mockReturning,
  mockSelect, mockFrom, mockWhere, mockOrderBy, mockLimit,
  mockUpdate, mockSet,
  mockAssembleLeadContext, mockGenerateDraft,
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
  mockAssembleLeadContext: vi.fn(),
  mockGenerateDraft: vi.fn(),
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

// Mock config (with OPENROUTER_API_KEY)
vi.mock('../../src/config.js', () => ({
  config: {
    SESSION_SECRET: 'test-session-secret',
    NODE_ENV: 'test',
    ADMIN_EMAIL: 'contact@weds.fr',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:8080/auth/google/callback',
    OPENROUTER_API_KEY: 'test-openrouter-key',
  },
}));

// Mock passport
vi.mock('../../src/auth/passport.js', () => ({
  configurePassport: vi.fn(),
  SCOPES: ['openid', 'email', 'profile'],
}));

// Mock Gmail services (needed by inbox router via app.ts)
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
  substituteVariables: vi.fn(),
  assembleLeadContext: mockAssembleLeadContext,
  generateDraft: mockGenerateDraft,
}));

const MOCK_PROMPT_CONFIG = {
  id: 1,
  promptTemplate: 'Tu es un photographe de mariage professionnel...',
  model: 'anthropic/claude-sonnet-4',
  updatedAt: new Date('2026-01-01'),
};

const MOCK_LEAD_CONTEXT = {
  name: 'Sophie Dupont',
  eventDate: '15/06/2027',
  budget: 2500,
  status: 'contacte',
  recentEmails: [
    { direction: 'inbound', snippet: 'Bonjour', date: '2026-03-10T10:00:00Z' },
  ],
  notes: ['Budget confirme'],
};

describe('AI API', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default mock chain
    mockOrderBy.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit, returning: mockReturning });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockSelect.mockReturnValue({ from: mockFrom });

    // insert -> values -> returning
    mockReturning.mockResolvedValue([MOCK_PROMPT_CONFIG]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    // update -> set -> where -> returning
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    const module = await import('../../src/app.js');
    app = module.app;
  });

  describe('GET /api/ai/prompt', () => {
    it('returns existing AI prompt config', async () => {
      mockLimit.mockResolvedValue([MOCK_PROMPT_CONFIG]);

      const res = await request(app)
        .get('/api/ai/prompt')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('promptTemplate');
      expect(res.body).toHaveProperty('model');
    });

    it('returns default config when none exists', async () => {
      mockLimit.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/ai/prompt')
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('promptTemplate');
      expect(res.body.model).toBe('anthropic/claude-sonnet-4');
    });
  });

  describe('PUT /api/ai/prompt', () => {
    it('updates AI prompt config', async () => {
      const updated = { ...MOCK_PROMPT_CONFIG, promptTemplate: 'Nouveau template' };
      mockReturning.mockResolvedValue([updated]);
      mockWhere.mockReturnValue({ returning: mockReturning });
      mockLimit.mockResolvedValue([MOCK_PROMPT_CONFIG]);

      const res = await request(app)
        .put('/api/ai/prompt')
        .send({ promptTemplate: 'Nouveau template' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('promptTemplate');
    });

    it('returns 400 when promptTemplate is missing', async () => {
      const res = await request(app)
        .put('/api/ai/prompt')
        .send({ model: 'test-model' })
        .set('Accept', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/ai/generate-draft', () => {
    it('generates draft via OpenRouter and returns text', async () => {
      mockAssembleLeadContext.mockResolvedValue(MOCK_LEAD_CONTEXT);
      mockGenerateDraft.mockResolvedValue('Bonjour Sophie, merci pour votre demande.');
      mockLimit.mockResolvedValue([MOCK_PROMPT_CONFIG]);

      const res = await request(app)
        .post('/api/ai/generate-draft')
        .send({ leadId: 1 })
        .set('Accept', 'application/json');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('draft');
      expect(typeof res.body.draft).toBe('string');
      expect(mockAssembleLeadContext).toHaveBeenCalledWith(1);
      expect(mockGenerateDraft).toHaveBeenCalled();
    });

    it('returns 400 when leadId is missing', async () => {
      const res = await request(app)
        .post('/api/ai/generate-draft')
        .send({})
        .set('Accept', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});

describe('AI API without API key', () => {
  let app: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Override config to remove API key
    const configMock = await import('../../src/config.js');
    (configMock.config as any).OPENROUTER_API_KEY = undefined;

    mockOrderBy.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit, returning: mockReturning });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockSelect.mockReturnValue({ from: mockFrom });

    mockReturning.mockResolvedValue([MOCK_PROMPT_CONFIG]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    const module = await import('../../src/app.js');
    app = module.app;
  });

  it('returns 503 when OPENROUTER_API_KEY is not configured', async () => {
    mockLimit.mockResolvedValue([MOCK_PROMPT_CONFIG]);

    const res = await request(app)
      .post('/api/ai/generate-draft')
      .send({ leadId: 1 })
      .set('Accept', 'application/json');

    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('error');
  });
});
