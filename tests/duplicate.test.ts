import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock drizzle db
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();

vi.mock('../src/db/index.js', () => ({
  getDb: vi.fn(() => ({
    select: mockSelect,
  })),
  schema: {
    leads: {},
  },
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ op: 'eq', val })),
  or: vi.fn((...args: unknown[]) => ({ op: 'or', args })),
  and: vi.fn((...args: unknown[]) => ({ op: 'and', args })),
  isNotNull: vi.fn((_col: unknown) => ({ op: 'isNotNull' })),
  sql: vi.fn(),
}));

// Mock config
vi.mock('../src/config.js', () => ({
  config: {},
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

import { checkDuplicate } from '../src/pipeline/process-email.js';

describe('checkDuplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default chain: select().from().where()
    mockWhere.mockResolvedValue([]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it('returns isDuplicate: true when email matches existing lead', async () => {
    mockWhere.mockResolvedValue([{ id: 42, email: 'test@example.com', phone: null }]);

    const result = await checkDuplicate('test@example.com', null);

    expect(result.isDuplicate).toBe(true);
    expect(result.existingLeadId).toBe(42);
  });

  it('returns isDuplicate: true when phone matches (different email)', async () => {
    mockWhere.mockResolvedValue([{ id: 99, email: 'other@example.com', phone: '+33612345678' }]);

    const result = await checkDuplicate('new@example.com', '+33612345678');

    expect(result.isDuplicate).toBe(true);
    expect(result.existingLeadId).toBe(99);
  });

  it('returns isDuplicate: false when no match found', async () => {
    mockWhere.mockResolvedValue([]);

    const result = await checkDuplicate('unique@example.com', '+33600000000');

    expect(result.isDuplicate).toBe(false);
    expect(result.existingLeadId).toBeUndefined();
  });

  it('does not match null phone against null phone', async () => {
    // When phone is null, we should NOT include phone in the query condition
    mockWhere.mockResolvedValue([]);

    const result = await checkDuplicate('unique@example.com', null);

    expect(result.isDuplicate).toBe(false);
  });
});
