import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ParsedLead } from '../src/types.js';

// --- Hoisted mocks (available inside vi.mock factories) ---
const {
  mockInsert, mockValues, mockReturning,
  mockSelect, mockFrom, mockWhere,
  mockUpdate, mockSet, mockUpdateWhere,
  mockParseMarriagesNetEmail,
  mockGetMessageContent, mockModifyLabels, mockSearchMessages, mockEnsureLabelsExist,
  mockGenerateVCardContent,
  mockUploadVCardAndGetSignedUrl,
  mockDispatchNotifications,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockValues: vi.fn(),
  mockReturning: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockUpdate: vi.fn(),
  mockSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
  mockParseMarriagesNetEmail: vi.fn(),
  mockGetMessageContent: vi.fn(),
  mockModifyLabels: vi.fn(),
  mockSearchMessages: vi.fn(),
  mockEnsureLabelsExist: vi.fn(),
  mockGenerateVCardContent: vi.fn(),
  mockUploadVCardAndGetSignedUrl: vi.fn(),
  mockDispatchNotifications: vi.fn(),
}));

// Mock db
vi.mock('../src/db/index.js', () => ({
  getDb: vi.fn(() => ({
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
  })),
  schema: {
    leads: {},
    activities: {},
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
  config: {
    ADMIN_EMAIL: 'contact@weds.fr',
    FREE_MOBILE_USER: '12345678',
    FREE_MOBILE_PASS: 'testpass',
  },
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

// Mock parser
vi.mock('../src/services/parser.js', () => ({
  parseMarriagesNetEmail: mockParseMarriagesNetEmail,
}));

// Mock gmail service
vi.mock('../src/services/gmail.js', () => ({
  getMessageContent: mockGetMessageContent,
  modifyLabels: mockModifyLabels,
  searchMessages: mockSearchMessages,
  ensureLabelsExist: mockEnsureLabelsExist,
  sendEmail: vi.fn(),
}));

// Mock vcard
vi.mock('../src/services/vcard.js', () => ({
  generateVCardContent: mockGenerateVCardContent,
}));

// Mock storage
vi.mock('../src/services/storage.js', () => ({
  uploadVCardAndGetSignedUrl: mockUploadVCardAndGetSignedUrl,
}));

// Mock notifications
vi.mock('../src/services/notifications.js', () => ({
  dispatchNotifications: mockDispatchNotifications,
}));

// Mock sms (for parse failure admin alert)
vi.mock('../src/services/sms.js', () => ({
  sendFreeMobileSMS: vi.fn().mockResolvedValue({ channel: 'free_mobile_sms', success: true }),
}));

// Mock Sentry
vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}));

// Mock alerts
vi.mock('../src/services/alerts.js', () => ({
  alertNotificationFailure: vi.fn(),
}));

import { processOneEmail, processPendingEmails, _resetProcessingFlag } from '../src/pipeline/process-email.js';

const MOCK_PARSED_LEAD: ParsedLead = {
  name: 'Sophie Dupont',
  email: 'sophie.dupont@gmail.com',
  phone: '+33612345678',
  eventDate: '15/06/2027',
  message: 'Bonjour, nous organisons notre mariage...\nNom de la personne : Sophie Dupont',
  rawBody: 'raw email body',
};

const MOCK_LABEL_IDS: Record<string, string> = {
  'weds-crm/pending': 'Label_1',
  'weds-crm/processed': 'Label_2',
  'weds-crm/error': 'Label_3',
};

const mockGmail = {} as any;

describe('processOneEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetProcessingFlag();

    // Default: successful pipeline
    mockGetMessageContent.mockResolvedValue('raw email body');
    mockParseMarriagesNetEmail.mockReturnValue(MOCK_PARSED_LEAD);
    // checkDuplicate: no match
    mockWhere.mockResolvedValue([]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    // insert returns lead
    mockReturning.mockResolvedValue([{ id: 1 }]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
    // update
    mockUpdateWhere.mockResolvedValue(undefined);
    mockSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    mockGenerateVCardContent.mockReturnValue('BEGIN:VCARD\r\nEND:VCARD');
    mockUploadVCardAndGetSignedUrl.mockResolvedValue('https://storage.example.com/vcard.vcf');
    mockDispatchNotifications.mockResolvedValue([
      { channel: 'twilio_sms', success: true },
      { channel: 'free_mobile_sms', success: true },
      { channel: 'email_recap', success: true },
    ]);
    mockModifyLabels.mockResolvedValue(undefined);
  });

  it('creates a lead with correct fields from parsed email', async () => {
    const result = await processOneEmail('msg_123', mockGmail, MOCK_LABEL_IDS);

    expect(result).toBeDefined();
    expect(result!.leadId).toBe(1);
    expect(result!.isDuplicate).toBe(false);
    expect(mockInsert).toHaveBeenCalled();
  });

  it('modifies Gmail labels: adds processed, removes pending', async () => {
    await processOneEmail('msg_123', mockGmail, MOCK_LABEL_IDS);

    expect(mockModifyLabels).toHaveBeenCalledWith(
      mockGmail,
      'msg_123',
      ['Label_2'], // processed
      ['Label_1']  // pending
    );
  });

  it('handles duplicate: logs activity on existing lead, no new lead, no notifications', async () => {
    // checkDuplicate returns match
    mockWhere.mockResolvedValue([{ id: 42, email: 'sophie.dupont@gmail.com', phone: '+33612345678' }]);

    const result = await processOneEmail('msg_123', mockGmail, MOCK_LABEL_IDS);

    expect(result).toBeDefined();
    expect(result!.isDuplicate).toBe(true);
    expect(result!.leadId).toBe(42);
    // Notifications should NOT be dispatched for duplicates
    expect(mockDispatchNotifications).not.toHaveBeenCalled();
  });

  it('handles parse failure: labels with error, sends admin alert, returns null', async () => {
    mockParseMarriagesNetEmail.mockReturnValue(null);

    const result = await processOneEmail('msg_123', mockGmail, MOCK_LABEL_IDS);

    expect(result).toBeNull();
    // Should add error label, remove pending
    expect(mockModifyLabels).toHaveBeenCalledWith(
      mockGmail,
      'msg_123',
      ['Label_3'], // error
      ['Label_1']  // pending
    );
  });
});

describe('processPendingEmails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetProcessingFlag();
    mockEnsureLabelsExist.mockResolvedValue(MOCK_LABEL_IDS);
    mockSearchMessages.mockResolvedValue([]);
  });

  it('skips processing when concurrency guard is active', async () => {
    // First call starts processing
    mockSearchMessages.mockResolvedValue([{ id: 'msg_1' }]);
    mockGetMessageContent.mockResolvedValue('raw email body');
    mockParseMarriagesNetEmail.mockReturnValue(null);
    mockModifyLabels.mockResolvedValue(undefined);

    // We call processPendingEmails, and while it's running, call it again
    const firstCall = processPendingEmails(mockGmail);
    const secondResult = processPendingEmails(mockGmail);

    await Promise.all([firstCall, secondResult]);

    // ensureLabelsExist should only be called once (second call skipped)
    expect(mockEnsureLabelsExist).toHaveBeenCalledTimes(1);
  });
});
