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
