import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock googleapis at module level
vi.mock('googleapis', () => {
  const mockGmail = {
    users: {
      messages: {
        list: vi.fn(),
        get: vi.fn(),
        modify: vi.fn(),
        send: vi.fn(),
      },
      labels: {
        list: vi.fn(),
        create: vi.fn(),
      },
    },
  };

  const mockOAuth2Client = {
    setCredentials: vi.fn(),
  };

  return {
    google: {
      auth: {
        OAuth2: class MockOAuth2 {
          setCredentials = mockOAuth2Client.setCredentials;
        },
      },
      gmail: vi.fn(() => mockGmail),
    },
  };
});

import { google } from 'googleapis';
import {
  getGmailClient,
  searchMessages,
  getMessageContent,
  modifyLabels,
  ensureLabelsExist,
  sendEmail,
  _resetLabelCache,
} from '../src/services/gmail.js';

// Get mock references
const mockGmail = google.gmail({} as never) as unknown as {
  users: {
    messages: {
      list: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
      modify: ReturnType<typeof vi.fn>;
      send: ReturnType<typeof vi.fn>;
    };
    labels: {
      list: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
};

describe('getGmailClient', () => {
  it('creates an OAuth2 client and returns gmail instance', () => {
    const result = getGmailClient('access-token', 'refresh-token');
    expect(google.gmail).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});

describe('searchMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls users.messages.list with the provided labelId and returns messages', async () => {
    const messages = [{ id: 'msg1' }, { id: 'msg2' }];
    mockGmail.users.messages.list.mockResolvedValue({
      data: { messages },
    });

    const result = await searchMessages(mockGmail as never, 'Label_123');

    expect(mockGmail.users.messages.list).toHaveBeenCalledWith({
      userId: 'me',
      labelIds: ['Label_123'],
    });
    expect(result).toEqual(messages);
  });

  it('returns empty array when no messages found', async () => {
    mockGmail.users.messages.list.mockResolvedValue({
      data: {},
    });

    const result = await searchMessages(mockGmail as never, 'Label_123');
    expect(result).toEqual([]);
  });
});

describe('getMessageContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('decodes base64url body from payload.body.data', async () => {
    const bodyContent = 'Hello, this is the email body';
    const base64url = Buffer.from(bodyContent).toString('base64url');

    mockGmail.users.messages.get.mockResolvedValue({
      data: {
        payload: {
          mimeType: 'text/plain',
          body: { data: base64url },
        },
      },
    });

    const result = await getMessageContent(mockGmail as never, 'msg1');
    expect(result).toBe(bodyContent);
    expect(mockGmail.users.messages.get).toHaveBeenCalledWith({
      userId: 'me',
      id: 'msg1',
    });
  });

  it('decodes base64url body from payload.parts (multipart)', async () => {
    const bodyContent = 'Multipart email body';
    const base64url = Buffer.from(bodyContent).toString('base64url');

    mockGmail.users.messages.get.mockResolvedValue({
      data: {
        payload: {
          mimeType: 'multipart/mixed',
          parts: [
            {
              mimeType: 'text/plain',
              body: { data: base64url },
            },
            {
              mimeType: 'text/html',
              body: { data: Buffer.from('<p>HTML</p>').toString('base64url') },
            },
          ],
        },
      },
    });

    const result = await getMessageContent(mockGmail as never, 'msg2');
    expect(result).toBe(bodyContent);
  });
});

describe('modifyLabels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls users.messages.modify with add and remove label IDs', async () => {
    mockGmail.users.messages.modify.mockResolvedValue({ data: {} });

    await modifyLabels(mockGmail as never, 'msg1', ['Label_A'], ['Label_B']);

    expect(mockGmail.users.messages.modify).toHaveBeenCalledWith({
      userId: 'me',
      id: 'msg1',
      requestBody: {
        addLabelIds: ['Label_A'],
        removeLabelIds: ['Label_B'],
      },
    });
  });
});

describe('ensureLabelsExist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetLabelCache();
  });

  it('creates missing labels and returns name->id map', async () => {
    // Only one label exists
    mockGmail.users.labels.list.mockResolvedValue({
      data: {
        labels: [
          { id: 'Label_1', name: 'weds-crm/pending' },
        ],
      },
    });

    // Mock create for the two missing labels
    mockGmail.users.labels.create
      .mockResolvedValueOnce({ data: { id: 'Label_2', name: 'weds-crm/processed' } })
      .mockResolvedValueOnce({ data: { id: 'Label_3', name: 'weds-crm/error' } });

    const result = await ensureLabelsExist(mockGmail as never);

    expect(result['weds-crm/pending']).toBe('Label_1');
    expect(result['weds-crm/processed']).toBe('Label_2');
    expect(result['weds-crm/error']).toBe('Label_3');
    expect(mockGmail.users.labels.create).toHaveBeenCalledTimes(2);
  });

  it('caches results on second call', async () => {
    mockGmail.users.labels.list.mockResolvedValue({
      data: {
        labels: [
          { id: 'Label_1', name: 'weds-crm/pending' },
          { id: 'Label_2', name: 'weds-crm/processed' },
          { id: 'Label_3', name: 'weds-crm/error' },
        ],
      },
    });

    const result1 = await ensureLabelsExist(mockGmail as never);
    const result2 = await ensureLabelsExist(mockGmail as never);

    // list should only be called once (cached on second call)
    expect(mockGmail.users.labels.list).toHaveBeenCalledTimes(1);
    expect(result1).toEqual(result2);
  });
});

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs raw MIME message and calls users.messages.send', async () => {
    mockGmail.users.messages.send.mockResolvedValue({ data: {} });

    await sendEmail(
      mockGmail as never,
      'recipient@example.com',
      'Test Subject',
      'Hello, this is a test.'
    );

    expect(mockGmail.users.messages.send).toHaveBeenCalledTimes(1);
    const callArgs = mockGmail.users.messages.send.mock.calls[0][0];
    expect(callArgs.userId).toBe('me');
    expect(callArgs.requestBody.raw).toBeDefined();

    // Decode the raw message and verify headers
    const decoded = Buffer.from(callArgs.requestBody.raw, 'base64url').toString('utf-8');
    expect(decoded).toContain('To: recipient@example.com');
    expect(decoded).toContain('Subject: Test Subject');
    expect(decoded).toContain('Hello, this is a test.');
  });

  it('includes attachment in MIME when provided', async () => {
    mockGmail.users.messages.send.mockResolvedValue({ data: {} });

    await sendEmail(
      mockGmail as never,
      'recipient@example.com',
      'With Attachment',
      'Body text',
      [{ filename: 'test.vcf', content: 'BEGIN:VCARD', mimeType: 'text/vcard' }]
    );

    const callArgs = mockGmail.users.messages.send.mock.calls[0][0];
    const decoded = Buffer.from(callArgs.requestBody.raw, 'base64url').toString('utf-8');
    expect(decoded).toContain('test.vcf');
    expect(decoded).toContain('text/vcard');
  });
});
