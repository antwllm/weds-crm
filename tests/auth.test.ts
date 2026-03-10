import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// Mock environment variables before importing app
vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/test');
vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id');
vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret');
vi.stubEnv('GOOGLE_REDIRECT_URI', 'http://localhost:8080/auth/google/callback');
vi.stubEnv('SESSION_SECRET', 'test-session-secret');
vi.stubEnv('NODE_ENV', 'test');

// Mock pg Pool so we don't need a real database
vi.mock('pg', () => {
  const mockPool = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    }),
    end: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
  return {
    default: {
      Pool: vi.fn(() => mockPool),
    },
  };
});

// Mock connect-pg-simple to avoid real DB session store
vi.mock('connect-pg-simple', () => {
  const { Store } = require('express-session');
  class MockPgStore extends Store {
    get(_sid: string, cb: Function) {
      cb(null, null);
    }
    set(_sid: string, _sess: unknown, cb: Function) {
      cb(null);
    }
    destroy(_sid: string, cb: Function) {
      cb(null);
    }
  }
  return {
    default: vi.fn(() => MockPgStore),
  };
});

// Mock Sentry to avoid real SDK initialization
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  setupExpressErrorHandler: vi.fn(),
  captureException: vi.fn(),
}));

describe('Weds CRM Auth & App', () => {
  let app: Express.Application;

  beforeAll(async () => {
    const module = await import('../src/app.js');
    app = module.app as unknown as Express.Application;
  });

  describe('Health endpoint', () => {
    it('GET /health returns 200 with status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Protected routes', () => {
    it('GET / redirects unauthenticated browser requests to /auth/google', async () => {
      const res = await request(app).get('/');
      // Should redirect (302) to /auth/google
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/auth/google');
    });

    it('GET / returns 401 for unauthenticated JSON API requests', async () => {
      const res = await request(app)
        .get('/')
        .set('Accept', 'application/json');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Auth routes', () => {
    it('GET /auth/google initiates OAuth redirect to Google', async () => {
      const res = await request(app).get('/auth/google');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('accounts.google.com');
    });

    it('GET /auth/failed returns 401 with French message', async () => {
      const res = await request(app).get('/auth/failed');
      expect(res.status).toBe(401);
      expect(res.text).toContain('Acces refuse');
    });
  });
});
