/**
 * vCard content generation in VCF 3.0 format.
 */

interface VCardInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  eventDate?: string | null;
}

/**
 * Generate vCard content in VCF 3.0 format with proper \r\n line endings.
 * Handles missing fields gracefully by omitting the corresponding line.
 */
export function generateVCardContent(lead: VCardInput): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN;CHARSET=UTF-8:${lead.name}`,
    `N;CHARSET=UTF-8:;${lead.name};;;`,
  ];

  if (lead.email) {
    lines.push(`EMAIL;CHARSET=UTF-8;type=HOME,INTERNET:${lead.email}`);
  }

  if (lead.phone) {
    lines.push(`TEL;TYPE=HOME,VOICE:${lead.phone}`);
  }

  if (lead.eventDate) {
    lines.push(`ORG;CHARSET=UTF-8:Mariage le ${lead.eventDate}`);
    lines.push(`NOTE;CHARSET=UTF-8:Date evenement: ${lead.eventDate}`);
  }

  lines.push('REV:' + new Date().toISOString());
  lines.push('END:VCARD');

  return lines.join('\r\n');
}
