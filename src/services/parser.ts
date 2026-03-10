import type { ParsedLead } from '../types.js';

// --- Regex patterns for Mariages.net email format ---

const nameRegex = /L'utilisateur\s+(.*?)\s+s'est/i;
const eventDateRegex = /DATE [EÉ]V[EÈÉ]NEMENT:\s*(.*)/i;
const emailRegex = /(?:E-MAIL|EMAIL):\s*(.*)/i;
const phoneRegex = /T[EÉ]L[EÉ]PHONE\s*:\s*(.*)/i;
const messageBlockRegex = /(T[EÉ]L[EÉ]PHONE\s*:[\s\S]*?)(?=\sR[eé]pondez)/i;

/**
 * Normalize a French phone number to E.164 format (+33...).
 * Returns null if the input is null, empty, or not a valid phone number.
 */
export function normalizePhoneNumber(phone: string | null): string | null {
  if (!phone) return null;

  // Strip everything except digits and +
  let p = phone.replace(/[^0-9+]/g, '');

  if (!p) return null;

  // Convert leading 00 to +
  p = p.replace(/^(00)/, '+');

  // Convert leading 0 followed by 9 digits to +33
  p = p.replace(/^0(?=\d{9})/, '+33');

  // Ensure starts with +
  if (p.indexOf('+') !== 0) {
    p = '+' + p;
  }

  // Validate E.164 format
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (e164Regex.test(p)) {
    return p;
  }

  return null;
}

/**
 * Parse a Mariages.net email body into structured lead data.
 * Returns null if the email cannot be parsed (missing name or email).
 */
export function parseMarriagesNetEmail(body: string): ParsedLead | null {
  if (!body) return null;

  try {
    const nameMatch = body.match(nameRegex);
    const eventDateMatch = body.match(eventDateRegex);
    const emailMatch = body.match(emailRegex);
    const phoneMatch = body.match(phoneRegex);
    const messageBlockMatch = body.match(messageBlockRegex);

    // Name and email are required
    if (!nameMatch || !emailMatch) {
      return null;
    }

    const name = nameMatch[1].trim();
    const email = emailMatch[1].trim();
    const eventDate = eventDateMatch ? eventDateMatch[1].trim() : '';
    const rawPhone = phoneMatch ? phoneMatch[1].trim() : null;
    const phone = normalizePhoneNumber(rawPhone);

    // Extract message body from between TELEPHONE line and Repondez marker
    let message = '';
    if (messageBlockMatch) {
      // Remove the TELEPHONE line itself from the block
      message = messageBlockMatch[1]
        .replace(/T[EÉ]L[EÉ]PHONE\s*:.*\n?/i, '')
        .trim();
      // Remove the "Repondez" leftover if present
      message = message
        .replace(/R[eé]pondez [aà] vos demandes depuis le menu de gestion/i, '')
        .trim();
    }

    // Append the person's name (matching original parser behavior)
    message += `\nNom de la personne : ${name}`;

    return {
      name,
      email,
      phone,
      eventDate,
      message,
      rawBody: body,
    };
  } catch {
    return null;
  }
}
