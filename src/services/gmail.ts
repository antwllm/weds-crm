import type { gmail_v1 } from 'googleapis';

export interface EmailAttachment {
  filename: string;
  content: string;
  mimeType: string;
}

/**
 * Send an email via Gmail API.
 * Full implementation will be provided in plan 01-05.
 */
export async function sendEmail(
  gmailClient: gmail_v1.Gmail,
  to: string,
  subject: string,
  htmlBody: string,
  attachments?: EmailAttachment[]
): Promise<void> {
  // Placeholder -- full implementation in plan 01-05
  throw new Error('sendEmail not yet implemented -- see plan 01-05');
}
