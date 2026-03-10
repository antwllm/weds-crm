import { describe, it, expect } from 'vitest';
import { parseMarriagesNetEmail, normalizePhoneNumber } from '../src/services/parser.js';
import type { ParsedLead } from '../src/types.js';
import {
  VALID_MARIAGES_EMAIL,
  VALID_MARIAGES_EMAIL_NO_PHONE,
  VALID_MARIAGES_EMAIL_DUPLICATE,
  INVALID_EMAIL_BODY,
  EXPECTED_PARSED_LEAD,
} from './helpers/fixtures.js';

describe('normalizePhoneNumber', () => {
  it('normalizes French mobile "06 12 34 56 78" to E.164', () => {
    expect(normalizePhoneNumber('06 12 34 56 78')).toBe('+33612345678');
  });

  it('normalizes "0033612345678" to E.164', () => {
    expect(normalizePhoneNumber('0033612345678')).toBe('+33612345678');
  });

  it('normalizes "+33612345678" (already E.164)', () => {
    expect(normalizePhoneNumber('+33612345678')).toBe('+33612345678');
  });

  it('returns null for null input', () => {
    expect(normalizePhoneNumber(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizePhoneNumber('')).toBeNull();
  });

  it('returns null for invalid phone number', () => {
    expect(normalizePhoneNumber('invalid')).toBeNull();
  });

  it('normalizes phone with dots "06.12.34.56.78"', () => {
    expect(normalizePhoneNumber('06.12.34.56.78')).toBe('+33612345678');
  });
});

describe('parseMarriagesNetEmail', () => {
  it('parses a valid Mariages.net email body into a ParsedLead', () => {
    const result = parseMarriagesNetEmail(VALID_MARIAGES_EMAIL);
    expect(result).not.toBeNull();
    const lead = result as ParsedLead;
    expect(lead.name).toBe('Sophie Dupont');
    expect(lead.email).toBe('sophie.dupont@gmail.com');
    expect(lead.phone).toBe('+33612345678');
    expect(lead.eventDate).toBe('15/06/2027');
    expect(lead.message).toContain('Bonjour, nous organisons notre mariage');
    expect(lead.message).toContain('Nom de la personne : Sophie Dupont');
    expect(lead.rawBody).toBe(VALID_MARIAGES_EMAIL);
  });

  it('parses email with empty phone as phone: null', () => {
    const result = parseMarriagesNetEmail(VALID_MARIAGES_EMAIL_NO_PHONE);
    expect(result).not.toBeNull();
    const lead = result as ParsedLead;
    expect(lead.name).toBe('Marie Leroy');
    expect(lead.email).toBe('marie.leroy@outlook.fr');
    expect(lead.phone).toBeNull();
    expect(lead.eventDate).toBe('20/09/2027');
    expect(lead.message).toContain('Nous cherchons un photographe');
  });

  it('parses a duplicate email correctly', () => {
    const result = parseMarriagesNetEmail(VALID_MARIAGES_EMAIL_DUPLICATE);
    expect(result).not.toBeNull();
    const lead = result as ParsedLead;
    expect(lead.name).toBe('Sophie Dupont');
    expect(lead.email).toBe('sophie.dupont@gmail.com');
    expect(lead.phone).toBe('+33612345678');
  });

  it('returns null for an invalid/non-Mariages.net email', () => {
    const result = parseMarriagesNetEmail(INVALID_EMAIL_BODY);
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = parseMarriagesNetEmail('');
    expect(result).toBeNull();
  });

  it('extracts message body from between TELEPHONE line and Repondez marker', () => {
    const result = parseMarriagesNetEmail(VALID_MARIAGES_EMAIL);
    expect(result).not.toBeNull();
    const lead = result as ParsedLead;
    // The message should NOT contain the TELEPHONE line itself
    expect(lead.message).not.toMatch(/TELEPHONE/i);
    // The message should NOT contain the "Repondez" marker
    expect(lead.message).not.toContain('Repondez a vos demandes depuis le menu de gestion');
  });
});
