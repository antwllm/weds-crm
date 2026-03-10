import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Lead } from '../../src/types.js';
import {
  MOCK_LEAD,
  MOCK_FIELD_CONFIG,
  MOCK_PIPEDRIVE_PERSON_RESPONSE,
  MOCK_PIPEDRIVE_DEAL_RESPONSE,
} from './helpers/fixtures.js';

// --- Hoisted mocks ---
const {
  mockPipedriveGet,
  mockPipedrivePost,
  mockPipedrivePut,
  mockDbInsert,
  mockDbInsertValues,
  mockDbUpdate,
  mockDbUpdateSet,
  mockDbUpdateWhere,
  mockWithRetry,
} = vi.hoisted(() => ({
  mockPipedriveGet: vi.fn(),
  mockPipedrivePost: vi.fn(),
  mockPipedrivePut: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbInsertValues: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbUpdateSet: vi.fn(),
  mockDbUpdateWhere: vi.fn(),
  mockWithRetry: vi.fn(),
}));

// Mock Pipedrive client
vi.mock('../../src/services/pipedrive/client.js', () => ({
  pipedriveApi: {
    get: mockPipedriveGet,
    post: mockPipedrivePost,
    put: mockPipedrivePut,
  },
}));

// Mock field config
vi.mock('../../src/services/pipedrive/field-config.js', () => ({
  loadFieldConfig: vi.fn(() => MOCK_FIELD_CONFIG),
  statusToStageId: vi.fn((status: string) => {
    const map: Record<string, number> = MOCK_FIELD_CONFIG.stages;
    return map[status];
  }),
}));

// Mock retry — just execute the fn directly
vi.mock('../../src/services/pipedrive/retry.js', () => ({
  withRetry: mockWithRetry,
}));

// Mock db
vi.mock('../../src/db/index.js', () => ({
  getDb: vi.fn(() => ({
    insert: mockDbInsert,
    update: mockDbUpdate,
  })),
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ op: 'eq', val })),
}));

// Mock logger
vi.mock('../../src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock config (needed by transitive imports)
vi.mock('../../src/config.js', () => ({
  config: {
    PIPEDRIVE_API_TOKEN: 'test-token',
    PIPEDRIVE_FIELD_CONFIG: JSON.stringify(MOCK_FIELD_CONFIG),
  },
}));

describe('syncLeadToPipedrive', () => {
  let syncLeadToPipedrive: (lead: Lead, action: 'create' | 'update') => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: withRetry executes the fn immediately
    mockWithRetry.mockImplementation(async (fn: () => Promise<any>) => fn());

    // Default: DB insert chain
    mockDbInsertValues.mockReturnValue(undefined);
    mockDbInsert.mockReturnValue({ values: mockDbInsertValues });

    // Default: DB update chain
    mockDbUpdateWhere.mockResolvedValue(undefined);
    mockDbUpdateSet.mockReturnValue({ where: mockDbUpdateWhere });
    mockDbUpdate.mockReturnValue({ set: mockDbUpdateSet });

    // Default: Pipedrive search returns no results (no existing person)
    mockPipedriveGet.mockResolvedValue({
      data: { success: true, data: { items: [] } },
    });

    // Default: Pipedrive create person
    mockPipedrivePost.mockImplementation(async (url: string) => {
      if (url === '/persons') return { data: MOCK_PIPEDRIVE_PERSON_RESPONSE };
      if (url === '/deals') return { data: MOCK_PIPEDRIVE_DEAL_RESPONSE };
      return { data: { success: true, data: {} } };
    });

    // Default: Pipedrive update
    mockPipedrivePut.mockResolvedValue({ data: { success: true, data: {} } });

    const mod = await import('../../src/services/pipedrive/sync-push.js');
    syncLeadToPipedrive = mod.syncLeadToPipedrive;
  });

  it('creates person and deal on new lead', async () => {
    const lead = { ...MOCK_LEAD };

    await syncLeadToPipedrive(lead, 'create');

    // Should search for existing person first
    expect(mockWithRetry).toHaveBeenCalled();

    // Should call POST /persons then POST /deals via withRetry
    expect(mockPipedrivePost).toHaveBeenCalledWith(
      '/persons',
      expect.objectContaining({
        name: 'Sophie Dupont',
        email: [{ value: 'sophie@example.com', primary: true }],
        phone: [{ value: '+33612345678', primary: true }],
      })
    );
    expect(mockPipedrivePost).toHaveBeenCalledWith(
      '/deals',
      expect.objectContaining({
        person_id: 101,
        pipeline_id: MOCK_FIELD_CONFIG.pipelineId,
        stage_id: MOCK_FIELD_CONFIG.stages.nouveau,
      })
    );

    // Should update lead with Pipedrive IDs
    expect(mockDbUpdate).toHaveBeenCalled();
    expect(mockDbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        pipedrivePersonId: 101,
        pipedriveDealId: 201,
        lastSyncOrigin: 'crm',
      })
    );

    // Should log activity
    expect(mockDbInsert).toHaveBeenCalled();
  });

  it('finds existing person by email before creating', async () => {
    // Person search returns a match
    mockPipedriveGet.mockResolvedValue({
      data: {
        success: true,
        data: {
          items: [{ item: { id: 99, name: 'Sophie Dupont' } }],
        },
      },
    });

    const lead = { ...MOCK_LEAD };

    await syncLeadToPipedrive(lead, 'create');

    // Should NOT create a new person
    expect(mockPipedrivePost).not.toHaveBeenCalledWith(
      '/persons',
      expect.anything()
    );

    // Should create deal with existing person_id
    expect(mockPipedrivePost).toHaveBeenCalledWith(
      '/deals',
      expect.objectContaining({
        person_id: 99,
      })
    );
  });

  it('custom fields populated in deal', async () => {
    const lead = { ...MOCK_LEAD };
    const cfg = MOCK_FIELD_CONFIG;

    await syncLeadToPipedrive(lead, 'create');

    expect(mockPipedrivePost).toHaveBeenCalledWith(
      '/deals',
      expect.objectContaining({
        [cfg.fields.eventDate]: '15/06/2027',
        [cfg.fields.message]: 'Bonjour, nous cherchons un photographe pour notre mariage.',
        [cfg.fields.source]: 'mariages.net',
        [cfg.fields.vcardUrl]: 'https://storage.googleapis.com/weds-crm-vcards/sophie-dupont.vcf',
      })
    );
  });

  it('deal title format is Prenom Nom (date)', async () => {
    const lead = { ...MOCK_LEAD };

    await syncLeadToPipedrive(lead, 'create');

    expect(mockPipedrivePost).toHaveBeenCalledWith(
      '/deals',
      expect.objectContaining({
        title: 'Sophie Dupont (15/06/2027)',
      })
    );
  });

  it('stage update on status change', async () => {
    const lead: Lead = {
      ...MOCK_LEAD,
      status: 'contacte',
      pipedriveDealId: 201,
      pipedrivePersonId: 101,
    };

    await syncLeadToPipedrive(lead, 'update');

    expect(mockPipedrivePut).toHaveBeenCalledWith(
      '/deals/201',
      expect.objectContaining({
        stage_id: MOCK_FIELD_CONFIG.stages.contacte,
      })
    );
  });

  it('updates deal custom fields on lead update', async () => {
    const cfg = MOCK_FIELD_CONFIG;
    const lead: Lead = {
      ...MOCK_LEAD,
      status: 'contacte',
      pipedriveDealId: 201,
      pipedrivePersonId: 101,
      message: 'Nouveau message',
    };

    await syncLeadToPipedrive(lead, 'update');

    expect(mockPipedrivePut).toHaveBeenCalledWith(
      '/deals/201',
      expect.objectContaining({
        [cfg.fields.message]: 'Nouveau message',
      })
    );
  });

  it('skips sync if lead has no pipedriveDealId on update', async () => {
    const lead = { ...MOCK_LEAD, pipedriveDealId: null };

    await syncLeadToPipedrive(lead, 'update');

    // Should not call any Pipedrive API
    expect(mockPipedrivePost).not.toHaveBeenCalled();
    expect(mockPipedrivePut).not.toHaveBeenCalled();
    expect(mockPipedriveGet).not.toHaveBeenCalled();
  });

  it('logs pipedrive_synced activity on success', async () => {
    const lead = { ...MOCK_LEAD };

    await syncLeadToPipedrive(lead, 'create');

    // Should insert activity with type pipedrive_synced
    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockDbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 42,
        type: 'pipedrive_synced',
        metadata: expect.objectContaining({
          direction: 'push',
          action: 'create',
        }),
      })
    );
  });
});
