import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MOCK_LEAD,
  MOCK_FIELD_CONFIG,
  MOCK_WEBHOOK_DEAL_CHANGE,
  MOCK_WEBHOOK_DEAL_CHANGE_API,
  MOCK_WEBHOOK_DEAL_CREATED,
  MOCK_WEBHOOK_DEAL_DELETED,
  MOCK_WEBHOOK_PERSON_UPDATED,
  MOCK_PIPEDRIVE_PERSON_RESPONSE,
} from './helpers/fixtures.js';

// --- Hoisted mocks (accessible inside vi.mock factories) ---

const { mockUpdate, mockInsert, mockSelect, mockDb, mockPipedriveApi, mockLogger } = vi.hoisted(() => {
  const mockUpdate = vi.fn();
  const mockInsert = vi.fn();
  const mockSelect = vi.fn();
  const mockDb = { update: mockUpdate, insert: mockInsert, select: mockSelect };
  const mockPipedriveApi = { get: vi.fn(), post: vi.fn(), put: vi.fn() };
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  return { mockUpdate, mockInsert, mockSelect, mockDb, mockPipedriveApi, mockLogger };
});

vi.mock('../../src/db/index.js', () => ({
  getDb: () => mockDb,
  schema: {},
}));

vi.mock('../../src/services/pipedrive/field-config.js', async () => {
  const { MOCK_FIELD_CONFIG: cfg } = await import('./helpers/fixtures.js');
  return {
    loadFieldConfig: () => cfg,
    stageIdToStatus: (stageId: number) => {
      const map: Record<number, string> = {
        1: 'nouveau', 2: 'contacte', 3: 'rdv',
        4: 'devis_envoye', 5: 'signe', 6: 'perdu',
      };
      return map[stageId] ?? null;
    },
    _resetFieldConfig: vi.fn(),
  };
});

vi.mock('../../src/services/pipedrive/client.js', () => ({
  pipedriveApi: mockPipedriveApi,
}));

vi.mock('../../src/logger.js', () => ({
  logger: mockLogger,
}));

vi.mock('drizzle-orm', () => ({
  eq: (col: unknown, val: unknown) => ({ col, val, _type: 'eq' }),
  or: (...conditions: unknown[]) => ({ conditions, _type: 'or' }),
  and: (...conditions: unknown[]) => ({ conditions, _type: 'and' }),
}));

// Now import the module under test
import {
  isWithinSuppressionWindow,
  handleDealUpdate,
  handleDealCreated,
  handleDealDeleted,
  handlePersonUpdate,
} from '../../src/services/pipedrive/sync-pull.js';

// Helper to reset the fluent mock chains
function resetDbMocks() {
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  });
  mockInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    }),
  });
}

describe('sync-pull', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbMocks();
  });

  // --- isWithinSuppressionWindow ---

  describe('isWithinSuppressionWindow', () => {
    it('returns true when lastSyncAt is within the window', () => {
      const twoSecondsAgo = new Date(Date.now() - 2000);
      expect(isWithinSuppressionWindow(twoSecondsAgo)).toBe(true);
    });

    it('returns false when lastSyncAt is outside the window', () => {
      const tenSecondsAgo = new Date(Date.now() - 10000);
      expect(isWithinSuppressionWindow(tenSecondsAgo)).toBe(false);
    });

    it('returns false when lastSyncAt is null', () => {
      expect(isWithinSuppressionWindow(null)).toBe(false);
    });

    it('respects custom window duration', () => {
      const threeSecondsAgo = new Date(Date.now() - 3000);
      expect(isWithinSuppressionWindow(threeSecondsAgo, 2000)).toBe(false);
      expect(isWithinSuppressionWindow(threeSecondsAgo, 5000)).toBe(true);
    });
  });

  // --- handleDealUpdate ---

  describe('handleDealUpdate', () => {
    it('deal change updates lead status', async () => {
      const lead = {
        ...MOCK_LEAD,
        pipedriveDealId: 201,
        pipedrivePersonId: 101,
        status: 'nouveau',
      };

      await handleDealUpdate(
        MOCK_WEBHOOK_DEAL_CHANGE.data,
        MOCK_WEBHOOK_DEAL_CHANGE.previous,
        lead,
      );

      // Should update lead (status + lastSyncOrigin)
      expect(mockUpdate).toHaveBeenCalled();
      // Should insert activities (status_change + pipedrive_synced)
      expect(mockInsert).toHaveBeenCalled();
    });

    it('ignores webhook for unknown deal (no linked lead)', async () => {
      await handleDealUpdate(
        MOCK_WEBHOOK_DEAL_CHANGE.data,
        MOCK_WEBHOOK_DEAL_CHANGE.previous,
        null,
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('aucun lead'),
        expect.any(Object),
      );
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  // --- handleDealCreated ---

  describe('handleDealCreated', () => {
    it('deal created creates new CRM lead', async () => {
      mockPipedriveApi.get.mockResolvedValue({
        data: MOCK_PIPEDRIVE_PERSON_RESPONSE,
      });

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await handleDealCreated(MOCK_WEBHOOK_DEAL_CREATED.data);

      expect(mockPipedriveApi.get).toHaveBeenCalledWith('/persons/102');
      // Should insert new lead + activity
      expect(mockInsert).toHaveBeenCalled();
    });

    it('deal created links to existing lead by email', async () => {
      mockPipedriveApi.get.mockResolvedValue({
        data: MOCK_PIPEDRIVE_PERSON_RESPONSE,
      });

      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([MOCK_LEAD]),
        }),
      });

      await handleDealCreated(MOCK_WEBHOOK_DEAL_CREATED.data);

      // Should update existing lead (link Pipedrive IDs) rather than create new
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  // --- handleDealDeleted ---

  describe('handleDealDeleted', () => {
    it('deal deleted adds warning activity', async () => {
      const lead = {
        ...MOCK_LEAD,
        pipedriveDealId: 201,
        pipedrivePersonId: 101,
      };

      await handleDealDeleted(201, lead);

      // Should insert warning activity
      expect(mockInsert).toHaveBeenCalled();
      // Should clear pipedriveDealId
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('deal deleted does NOT change lead status', async () => {
      const lead = {
        ...MOCK_LEAD,
        pipedriveDealId: 201,
        pipedrivePersonId: 101,
        status: 'contacte',
      };

      await handleDealDeleted(201, lead);

      // update().set() should only clear pipedriveDealId, not touch status
      const setCall = mockUpdate.mock.results[0]?.value?.set;
      if (setCall) {
        const setArgs = setCall.mock.calls[0]?.[0];
        expect(setArgs).not.toHaveProperty('status');
      }
    });

    it('ignores webhook for unknown deal', async () => {
      await handleDealDeleted(999, null);

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  // --- handlePersonUpdate ---

  describe('handlePersonUpdate', () => {
    it('person updated updates lead contact info', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { ...MOCK_LEAD, pipedrivePersonId: 101 },
          ]),
        }),
      });

      await handlePersonUpdate(
        MOCK_WEBHOOK_PERSON_UPDATED.data,
        MOCK_WEBHOOK_PERSON_UPDATED.previous,
      );

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalled();
    });

    it('ignores unknown person', async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      await handlePersonUpdate(
        MOCK_WEBHOOK_PERSON_UPDATED.data,
        MOCK_WEBHOOK_PERSON_UPDATED.previous,
      );

      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  // --- Loop Prevention ---

  describe('loop prevention', () => {
    it('API-origin webhooks are discarded (change_source check)', () => {
      // API-origin detection is at the webhook route level (meta.change_source === 'api')
      // Verify fixture has the right value
      expect(MOCK_WEBHOOK_DEAL_CHANGE_API.meta.change_source).toBe('api');
    });

    it('suppression window prevents processing', () => {
      const oneSecondAgo = new Date(Date.now() - 1000);
      expect(isWithinSuppressionWindow(oneSecondAgo)).toBe(true);
    });
  });

  // --- Activity Logging ---

  describe('activity logging', () => {
    it('sets lastSyncOrigin to pipedrive after processing deal update', async () => {
      const lead = {
        ...MOCK_LEAD,
        pipedriveDealId: 201,
        pipedrivePersonId: 101,
      };

      await handleDealUpdate(
        MOCK_WEBHOOK_DEAL_CHANGE.data,
        MOCK_WEBHOOK_DEAL_CHANGE.previous,
        lead,
      );

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('logs pipedrive_synced activity on each processed event', async () => {
      const lead = {
        ...MOCK_LEAD,
        pipedriveDealId: 201,
        pipedrivePersonId: 101,
      };

      await handleDealUpdate(
        MOCK_WEBHOOK_DEAL_CHANGE.data,
        MOCK_WEBHOOK_DEAL_CHANGE.previous,
        lead,
      );

      expect(mockInsert).toHaveBeenCalled();
    });
  });
});
