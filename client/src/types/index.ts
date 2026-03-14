// Lead status values matching backend lead_status enum
export const LEAD_STATUSES = [
  'nouveau',
  'contacte',
  'rdv',
  'devis_envoye',
  'signe',
  'perdu',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Activity type values matching backend activity_type enum
export const ACTIVITY_TYPES = [
  'email_received',
  'sms_sent',
  'email_sent',
  'status_change',
  'note_added',
  'duplicate_inquiry',
  'notification_failed',
  'pipedrive_synced',
  'whatsapp_sent',
  'whatsapp_received',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

// --- Lead type matching Drizzle schema (leads table) ---

export interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  eventDate: string | null;
  message: string | null;
  source: string | null;
  status: LeadStatus | null;
  budget: number | null;
  vCardUrl: string | null;
  gmailMessageId: string | null;
  pipedrivePersonId: number | null;
  pipedriveDealId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// --- Activity type matching Drizzle schema (activities table) ---

export interface Activity {
  id: number;
  leadId: number;
  type: ActivityType;
  content: string | null;
  metadata: Record<string, unknown> | null;
  gmailMessageId: string | null;
  createdAt: string | null;
}

// --- Frontend-specific request types ---

export interface LeadFilters {
  status?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateLeadRequest {
  name: string;
  email?: string;
  phone?: string;
  eventDate?: string;
  source?: string;
  budget?: number;
  message?: string;
}

export interface UpdateLeadRequest {
  name?: string;
  email?: string;
  phone?: string;
  eventDate?: string;
  status?: string;
  budget?: number;
  message?: string;
}

export interface CreateNoteRequest {
  content: string;
}

// --- WhatsApp types ---

export interface WhatsAppMessage {
  id: number;
  waMessageId: string;
  direction: 'inbound' | 'outbound';
  body: string;
  status: string;
  createdAt: string;
}

export interface WhatsAppWindow {
  isOpen: boolean;
  expiresAt: string | null;
}

// --- Linked email type ---

export interface LinkedEmail {
  id: number;
  gmailMessageId: string;
  gmailThreadId: string;
  subject: string;
  snippet: string;
  direction: string;
  receivedAt: string;
}

// --- Gmail inbox types ---

export interface GmailThread {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  historyId: string;
  matchedLead?: { id: number; name: string; status: string };
}

export interface GmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  messageId: string;
  inReplyTo?: string;
  references?: string;
}

export interface ThreadDetail {
  messages: GmailMessage[];
  matchedLead?: { id: number; name: string; status: string };
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export interface AiPromptConfig {
  id: number;
  promptTemplate: string;
  model: string;
}
