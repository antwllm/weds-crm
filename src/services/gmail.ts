import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';
import { config } from '../config.js';

/**
 * Gmail API wrapper: search, read, modify labels, send email, manage labels.
 * All functions accept the gmail client as first argument for testability (DI).
 */

// --- Label cache ---
let labelCache: Record<string, string> | null = null;

const REQUIRED_LABELS = [
  'weds-crm/pending',
  'weds-crm/processed',
  'weds-crm/error',
];

/**
 * Reset label cache (for testing).
 */
export function _resetLabelCache(): void {
  labelCache = null;
}

/**
 * Create an authenticated Gmail client using OAuth2 credentials.
 */
export function getGmailClient(accessToken: string, refreshToken: string): gmail_v1.Gmail {
  const oauth2Client = new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI,
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Search for messages with a given label ID.
 */
export async function searchMessages(
  gmail: gmail_v1.Gmail,
  labelId: string,
): Promise<gmail_v1.Schema$Message[]> {
  const res = await gmail.users.messages.list({
    userId: 'me',
    labelIds: [labelId],
  });
  return res.data.messages || [];
}

/**
 * Get the decoded text body of a message.
 * Handles both simple and multipart message structures.
 */
export async function getMessageContent(
  gmail: gmail_v1.Gmail,
  messageId: string,
): Promise<string> {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
  });

  const payload = res.data.payload;
  if (!payload) return '';

  // Simple message (no parts)
  if (!payload.parts && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  // Multipart: DFS to find text/plain
  if (payload.parts) {
    const plainBody = findPlainPart(payload.parts);
    if (plainBody) return plainBody;
  }

  return '';
}

function findPlainPart(parts: gmail_v1.Schema$MessagePart[]): string | null {
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64url').toString('utf-8');
    }
    if (part.parts) {
      const found = findPlainPart(part.parts);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Add and/or remove labels from a message.
 */
export async function modifyLabels(
  gmail: gmail_v1.Gmail,
  messageId: string,
  addLabelIds: string[],
  removeLabelIds: string[],
): Promise<void> {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds,
      removeLabelIds,
    },
  });
}

/**
 * Ensure weds-crm labels exist in the Gmail account.
 * Creates missing labels and caches the result.
 * Returns a map of label name -> label ID.
 */
export async function ensureLabelsExist(
  gmail: gmail_v1.Gmail,
): Promise<Record<string, string>> {
  if (labelCache) return labelCache;

  const res = await gmail.users.labels.list({ userId: 'me' });
  const existingLabels = res.data.labels || [];

  const labelMap: Record<string, string> = {};

  for (const requiredLabel of REQUIRED_LABELS) {
    const existing = existingLabels.find(
      (l) => l.name?.toLowerCase() === requiredLabel.toLowerCase(),
    );

    if (existing && existing.id) {
      labelMap[requiredLabel] = existing.id;
    } else {
      // Create the missing label
      const created = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: requiredLabel,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });
      if (created.data.id) {
        labelMap[requiredLabel] = created.data.id;
      }
    }
  }

  labelCache = labelMap;
  return labelMap;
}

// --- Thread operations (Phase 4) ---

export interface ThreadListOptions {
  maxResults?: number;
  pageToken?: string;
  q?: string;
}

export interface ThreadMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  messageId: string;
  inReplyTo?: string;
  references?: string;
  snippet: string;
  body: string;
}

export interface ThreadDetail {
  id: string;
  messages: ThreadMessage[];
}

/**
 * List Gmail threads with pagination and optional search query.
 */
export async function listThreads(
  gmail: gmail_v1.Gmail,
  options: ThreadListOptions,
): Promise<{ threads: gmail_v1.Schema$Thread[]; nextPageToken?: string }> {
  const res = await gmail.users.threads.list({
    userId: 'me',
    maxResults: options.maxResults,
    pageToken: options.pageToken,
    q: options.q,
  });

  return {
    threads: res.data.threads || [],
    nextPageToken: res.data.nextPageToken || undefined,
  };
}

/**
 * Get a full thread with parsed message headers and bodies.
 */
export async function getThread(
  gmail: gmail_v1.Gmail,
  threadId: string,
): Promise<ThreadDetail> {
  const res = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  const messages: ThreadMessage[] = (res.data.messages || []).map((msg) => {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract body using same logic as getMessageContent
    let body = '';
    const payload = msg.payload;
    if (payload) {
      if (!payload.parts && payload.body?.data) {
        body = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
      } else if (payload.parts) {
        body = findPlainPart(payload.parts) || '';
      }
    }

    return {
      id: msg.id || '',
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      date: getHeader('Date'),
      messageId: getHeader('Message-ID'),
      inReplyTo: getHeader('In-Reply-To') || undefined,
      references: getHeader('References') || undefined,
      snippet: msg.snippet || '',
      body,
    };
  });

  return { id: res.data.id || threadId, messages };
}

export interface SendReplyParams {
  threadId: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo: string;
  references: string;
}

/**
 * Send a reply within a thread with proper RFC 2822 headers.
 */
export async function sendReply(
  gmail: gmail_v1.Gmail,
  params: SendReplyParams,
): Promise<void> {
  const subject = params.subject.startsWith('Re: ')
    ? params.subject
    : `Re: ${params.subject}`;

  const messageParts = [
    `To: ${params.to}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${params.inReplyTo}`,
    `References: ${params.references}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    params.body,
  ];

  const raw = Buffer.from(messageParts.join('\n')).toString('base64url');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
      threadId: params.threadId,
    },
  });
}

/**
 * Send an email with optional attachments using raw MIME construction.
 */
export async function sendEmail(
  gmail: gmail_v1.Gmail,
  to: string,
  subject: string,
  body: string,
  attachments?: { filename: string; content: string; mimeType: string }[],
): Promise<void> {
  const boundary = '__weds_crm_boundary__';
  const nl = '\n';

  let messageParts = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
    '',
  ];

  if (attachments) {
    for (const attachment of attachments) {
      const attachmentBase64 = Buffer.from(attachment.content).toString('base64');
      const attachmentPart = [
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        'Content-Transfer-Encoding: base64',
        '',
        attachmentBase64,
        '',
      ];
      messageParts = messageParts.concat(attachmentPart);
    }
  }

  messageParts.push(`--${boundary}--`);

  const raw = Buffer.from(messageParts.join(nl))
    .toString('base64url');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
    },
  });
}
