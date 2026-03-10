import { google } from 'googleapis';
import type { gmail_v1 } from 'googleapis';

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
  const oauth2Client = new google.auth.OAuth2();
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
