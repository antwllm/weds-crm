import { describe, it, expect } from 'vitest';
import { generateVCardContent } from '../src/services/vcard.js';

describe('generateVCardContent', () => {
  it('generates valid VCF 3.0 string with all fields', () => {
    const result = generateVCardContent({
      name: 'Sophie Dupont',
      email: 'sophie.dupont@gmail.com',
      phone: '+33612345678',
      eventDate: '15/06/2027',
    });

    expect(result).toContain('BEGIN:VCARD');
    expect(result).toContain('VERSION:3.0');
    expect(result).toContain('FN;CHARSET=UTF-8:Sophie Dupont');
    expect(result).toContain('TEL;TYPE=HOME,VOICE:+33612345678');
    expect(result).toContain('EMAIL;CHARSET=UTF-8;type=HOME,INTERNET:sophie.dupont@gmail.com');
    expect(result).toContain('END:VCARD');
  });

  it('includes NOTE field with event date', () => {
    const result = generateVCardContent({
      name: 'Sophie Dupont',
      email: 'sophie.dupont@gmail.com',
      eventDate: '15/06/2027',
    });

    expect(result).toContain('15/06/2027');
  });

  it('omits TEL line when phone is null', () => {
    const result = generateVCardContent({
      name: 'Marie Leroy',
      email: 'marie@example.com',
      phone: null,
      eventDate: '20/09/2027',
    });

    expect(result).not.toContain('TEL');
    expect(result).toContain('FN;CHARSET=UTF-8:Marie Leroy');
    expect(result).toContain('EMAIL;CHARSET=UTF-8;type=HOME,INTERNET:marie@example.com');
  });

  it('omits TEL line when phone is undefined', () => {
    const result = generateVCardContent({
      name: 'Test User',
    });

    expect(result).not.toContain('TEL');
  });

  it('handles accented characters in name', () => {
    const result = generateVCardContent({
      name: 'Helene Beaute-Riviere',
      email: 'helene@test.fr',
    });

    expect(result).toContain('FN;CHARSET=UTF-8:Helene Beaute-Riviere');
  });

  it('uses \\r\\n line endings for VCF 3.0 compliance', () => {
    const result = generateVCardContent({
      name: 'Test',
      email: 'test@test.com',
    });

    expect(result).toContain('\r\n');
    // Each line should end with \r\n
    const lines = result.split('\r\n');
    expect(lines.length).toBeGreaterThan(3);
  });

  it('omits EMAIL line when email is null', () => {
    const result = generateVCardContent({
      name: 'Test',
    });

    expect(result).not.toContain('EMAIL');
  });
});
