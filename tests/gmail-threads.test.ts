import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  GMAIL_THREAD_LIST_RESPONSE,
  GMAIL_THREAD_DETAIL,
} from './helpers/fixtures.js';

// Mock googleapis at module level (same pattern as gmail.test.ts)
vi.mock('googleapis', () => {
  const mockGmail = {
    users: {
      messages: {
        list: vi.fn(),
        get: vi.fn(),
        modify: vi.fn(),
        send: vi.fn(),
      },
      threads: {
        list: vi.fn(),
        get: vi.fn(),
      },
      labels: {
        list: vi.fn(),
        create: vi.fn(),
      },
    },
  };

  return {
    google: {
      auth: {
        OAuth2: class MockOAuth2 {
          setCredentials = vi.fn();
        },
      },
      gmail: vi.fn(() => mockGmail),
    },
  };
});

import { google } from 'googleapis';
import { listThreads, getThread, sendReply } from '../src/services/gmail.js';

// Get mock references
const mockGmail = google.gmail({} as never) as unknown as {
  users: {
    messages: {
      send: ReturnType<typeof vi.fn>;
    };
    threads: {
      list: ReturnType<typeof vi.fn>;
      get: ReturnType<typeof vi.fn>;
    };
  };
};

describe('listThreads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns threads array and nextPageToken from gmail API', async () => {
    mockGmail.users.threads.list.mockResolvedValue({
      data: GMAIL_THREAD_LIST_RESPONSE,
    });

    const result = await listThreads(mockGmail as never, { maxResults: 10 });

    expect(mockGmail.users.threads.list).toHaveBeenCalledWith({
      userId: 'me',
      maxResults: 10,
      pageToken: undefined,
      q: undefined,
    });
    expect(result.threads).toHaveLength(2);
    expect(result.threads[0].id).toBe('thread-1');
    expect(result.nextPageToken).toBe('next-page-token-123');
  });

  it('passes pageToken and query string when provided', async () => {
    mockGmail.users.threads.list.mockResolvedValue({
      data: { threads: [], nextPageToken: null },
    });

    await listThreads(mockGmail as never, {
      maxResults: 5,
      pageToken: 'page-2',
      q: 'from:sophie',
    });

    expect(mockGmail.users.threads.list).toHaveBeenCalledWith({
      userId: 'me',
      maxResults: 5,
      pageToken: 'page-2',
      q: 'from:sophie',
    });
  });

  it('returns empty threads array when no threads found', async () => {
    mockGmail.users.threads.list.mockResolvedValue({
      data: {},
    });

    const result = await listThreads(mockGmail as never, {});

    expect(result.threads).toEqual([]);
    expect(result.nextPageToken).toBeUndefined();
  });
});

describe('getThread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts headers and message bodies from thread', async () => {
    mockGmail.users.threads.get.mockResolvedValue({
      data: GMAIL_THREAD_DETAIL,
    });

    const result = await getThread(mockGmail as never, 'thread-1');

    expect(mockGmail.users.threads.get).toHaveBeenCalledWith({
      userId: 'me',
      id: 'thread-1',
      format: 'full',
    });

    expect(result.id).toBe('thread-1');
    expect(result.messages).toHaveLength(2);

    // First message
    const msg1 = result.messages[0];
    expect(msg1.id).toBe('msg-1');
    expect(msg1.from).toBe('sophie.dupont@gmail.com');
    expect(msg1.to).toBe('contact@weds.fr');
    expect(msg1.subject).toBe('Demande de devis mariage');
    expect(msg1.messageId).toBe('<msg-id-001@gmail.com>');
    expect(msg1.body).toContain('Bonjour, nous souhaitons');

    // Second message (reply)
    const msg2 = result.messages[1];
    expect(msg2.inReplyTo).toBe('<msg-id-001@gmail.com>');
    expect(msg2.references).toBe('<msg-id-001@gmail.com>');
  });
});

describe('sendReply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs raw MIME with threadId, In-Reply-To, References, and Re: prefix', async () => {
    mockGmail.users.messages.send.mockResolvedValue({ data: { id: 'sent-msg-1' } });

    await sendReply(mockGmail as never, {
      threadId: 'thread-1',
      to: 'sophie.dupont@gmail.com',
      subject: 'Demande de devis mariage',
      body: 'Voici nos tarifs pour votre mariage.',
      inReplyTo: '<msg-id-001@gmail.com>',
      references: '<msg-id-001@gmail.com>',
    });

    expect(mockGmail.users.messages.send).toHaveBeenCalledTimes(1);
    const callArgs = mockGmail.users.messages.send.mock.calls[0][0];
    expect(callArgs.userId).toBe('me');
    expect(callArgs.requestBody.threadId).toBe('thread-1');

    // Decode the raw message
    const decoded = Buffer.from(callArgs.requestBody.raw, 'base64url').toString('utf-8');
    expect(decoded).toContain('To: sophie.dupont@gmail.com');
    expect(decoded).toContain('Subject: Re: Demande de devis mariage');
    expect(decoded).toContain('In-Reply-To: <msg-id-001@gmail.com>');
    expect(decoded).toContain('References: <msg-id-001@gmail.com>');
    expect(decoded).toContain('Voici nos tarifs pour votre mariage.');
  });

  it('does not double-add Re: prefix when subject already has it', async () => {
    mockGmail.users.messages.send.mockResolvedValue({ data: { id: 'sent-msg-2' } });

    await sendReply(mockGmail as never, {
      threadId: 'thread-1',
      to: 'sophie@example.com',
      subject: 'Re: Demande de devis',
      body: 'Merci.',
      inReplyTo: '<id@example.com>',
      references: '<id@example.com>',
    });

    const callArgs = mockGmail.users.messages.send.mock.calls[0][0];
    const decoded = Buffer.from(callArgs.requestBody.raw, 'base64url').toString('utf-8');
    // Should have exactly one Re: prefix
    expect(decoded).toContain('Subject: Re: Demande de devis');
    expect(decoded).not.toContain('Subject: Re: Re:');
  });
});
