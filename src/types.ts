import type { leads, activities, syncLog, emailTemplates, linkedEmails, whatsappMessages, aiPromptConfig, whatsappAgentConfig, aiDecisions } from './db/schema.js';

// --- Parsed lead data from Mariages.net email ---

export interface ParsedLead {
  name: string;
  email: string;
  phone: string | null;
  eventDate: string;
  message: string;
  rawBody: string;
}

// --- Notification result ---

export interface NotificationResult {
  channel: string;
  success: boolean;
  error?: string;
}

// --- Pipeline processing result ---

export interface PipelineResult {
  leadId: number;
  isDuplicate: boolean;
  notifications: NotificationResult[];
}

// --- API request/response types ---

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
  message?: string;
  budget?: number;
  source?: string;
}

export interface UpdateLeadRequest {
  name?: string;
  email?: string;
  phone?: string;
  eventDate?: string;
  message?: string;
  budget?: number;
  source?: string;
  status?: string;
}

// --- Drizzle inferred types ---

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

export type SyncLogEntry = typeof syncLog.$inferSelect;
export type NewSyncLogEntry = typeof syncLog.$inferInsert;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;

export type LinkedEmail = typeof linkedEmails.$inferSelect;
export type NewLinkedEmail = typeof linkedEmails.$inferInsert;

export type WhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type NewWhatsAppMessage = typeof whatsappMessages.$inferInsert;

export type AiPromptConfig = typeof aiPromptConfig.$inferSelect;
export type NewAiPromptConfig = typeof aiPromptConfig.$inferInsert;

export type WhatsAppAgentConfig = typeof whatsappAgentConfig.$inferSelect;
export type NewWhatsAppAgentConfig = typeof whatsappAgentConfig.$inferInsert;

export type AiDecision = typeof aiDecisions.$inferSelect;
export type NewAiDecision = typeof aiDecisions.$inferInsert;

// --- Lead context for AI draft generation ---

export interface LeadContext {
  name: string;
  eventDate: string | null;
  budget: number | null;
  status: string | null;
  recentEmails: { direction: string; snippet: string; date: string }[];
  notes: string[];
}
