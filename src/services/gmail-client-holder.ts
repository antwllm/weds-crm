import type { gmail_v1 } from 'googleapis';

/**
 * Module-level singleton to hold the authenticated Gmail client instance.
 * Set after OAuth authentication or after restoring tokens from DB.
 * Retrieved by webhook and scheduler when they need to call Gmail APIs.
 */
let _gmailClient: gmail_v1.Gmail | null = null;

/**
 * Store the authenticated Gmail client instance.
 */
export function setGmailClientInstance(gmail: gmail_v1.Gmail): void {
  _gmailClient = gmail;
}

/**
 * Get the stored Gmail client instance.
 * Returns null if not yet authenticated.
 */
export function getGmailClientInstance(): gmail_v1.Gmail | null {
  return _gmailClient;
}
