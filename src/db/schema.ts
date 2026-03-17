import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  jsonb,
  pgEnum,
  boolean,
} from 'drizzle-orm/pg-core';

// --- Enums ---

export const leadStatusEnum = pgEnum('lead_status', [
  'nouveau',
  'contacte',
  'rdv',
  'devis_envoye',
  'signe',
  'perdu',
]);

export const activityTypeEnum = pgEnum('activity_type', [
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
]);

// --- Phase 1: Core tables ---

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }), // E.164 normalized
  eventDate: varchar('event_date', { length: 50 }),
  message: text('message'),
  budget: integer('budget'), // Nullable -- not all leads have a budget
  source: varchar('source', { length: 50 }).default('mariages.net'),
  status: leadStatusEnum('status').default('nouveau'),
  vCardUrl: text('vcard_url'),
  gmailMessageId: varchar('gmail_message_id', { length: 255 }),
  pipedrivePersonId: integer('pipedrive_person_id'), // Phase 3
  pipedriveDealId: integer('pipedrive_deal_id'), // Phase 3
  archived: boolean('archived').default(false),
  lastSyncOrigin: varchar('last_sync_origin', { length: 10 }), // 'crm' | 'pipedrive' | null
  lastSyncAt: timestamp('last_sync_at'), // When last sync occurred (loop prevention)
  whatsappAiEnabled: boolean('whatsapp_ai_enabled').default(false),
  whatsappAiHandoffAt: timestamp('whatsapp_ai_handoff_at'),
  whatsappAiLastAlertAt: timestamp('whatsapp_ai_last_alert_at'),
  whatsappAiConsecutiveCount: integer('whatsapp_ai_consecutive_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id')
    .references(() => leads.id)
    .notNull(),
  type: activityTypeEnum('type').notNull(),
  content: text('content'),
  metadata: jsonb('metadata'),
  gmailMessageId: varchar('gmail_message_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- OAuth token persistence (survives Cloud Run restarts) ---

export const oauthTokens = pgTable('oauth_tokens', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- Phase 3: Pipedrive sync tracking ---

export const syncLog = pgTable('sync_log', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').references(() => leads.id),
  direction: varchar('direction', { length: 10 }), // 'push' | 'pull'
  status: varchar('status', { length: 20 }),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Phase 4: Email templates ---

export const emailTemplates = pgTable('email_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }),
  body: text('body'),
  variables: jsonb('variables'), // ['nom', 'date_evenement', ...]
  isDefault: boolean('is_default').default(false),
  contentType: varchar('content_type', { length: 10 }).default('text'), // 'text' | 'html'
  attachments: jsonb('attachments'), // [{filename, path, mimeType}]
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- Phase 4: Linked emails ---

export const linkedEmails = pgTable('linked_emails', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id')
    .references(() => leads.id)
    .notNull(),
  gmailMessageId: varchar('gmail_message_id', { length: 255 }).notNull(),
  gmailThreadId: varchar('gmail_thread_id', { length: 255 }),
  subject: varchar('subject', { length: 500 }),
  snippet: text('snippet'),
  direction: varchar('direction', { length: 10 }), // 'inbound' | 'outbound'
  receivedAt: timestamp('received_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Phase 4: WhatsApp messages ---

export const whatsappMessages = pgTable('whatsapp_messages', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id')
    .references(() => leads.id)
    .notNull(),
  waMessageId: varchar('wa_message_id', { length: 255 }),
  direction: varchar('direction', { length: 10 }).notNull(), // 'inbound' | 'outbound'
  body: text('body'),
  status: varchar('status', { length: 20 }), // 'sent' | 'delivered' | 'read' | 'failed'
  sentBy: varchar('sent_by', { length: 10 }).default('human'), // 'human' | 'ai'
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Phase 4: AI prompt configuration ---

export const aiPromptConfig = pgTable('ai_prompt_config', {
  id: serial('id').primaryKey(),
  promptTemplate: text('prompt_template').notNull(),
  model: varchar('model', { length: 100 }).default('anthropic/claude-sonnet-4'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- Phase 6: WhatsApp AI agent configuration ---

export const whatsappAgentConfig = pgTable('whatsapp_agent_config', {
  id: serial('id').primaryKey(),
  promptTemplate: text('prompt_template').notNull(),
  knowledgeBase: text('knowledge_base'),
  model: varchar('model', { length: 100 }).default('anthropic/claude-sonnet-4'),
  langfusePromptName: varchar('langfuse_prompt_name', { length: 100 }).default('whatsapp-agent-prompt'),
  langfuseSyncedAt: timestamp('langfuse_synced_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- Phase 7: AI decision tracking ---

export const aiDecisions = pgTable('ai_decisions', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').references(() => leads.id).notNull(),
  messageId: integer('message_id'), // whatsapp_messages.id of the inbound message
  action: varchar('action', { length: 20 }).notNull(), // 'reply' | 'pass_to_human'
  reason: text('reason'),
  responseText: text('response_text'),
  prospectMessage: text('prospect_message'),
  model: varchar('model', { length: 100 }),
  latencyMs: integer('latency_ms'),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  promptVersion: varchar('prompt_version', { length: 20 }),
  score: integer('score'), // 0 or 1, null if unscored
  scoreComment: text('score_comment'),
  langfuseTraceId: varchar('langfuse_trace_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// --- Notification settings (per-channel toggles) ---

export const notificationSettings = pgTable('notification_settings', {
  id: serial('id').primaryKey(),
  channel: varchar('channel', { length: 50 }).notNull().unique(),
  enabled: boolean('enabled').default(true).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// --- User preferences (filter/sort persistence) ---

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userEmail: varchar('user_email', { length: 255 }).notNull().unique(),
  filters: jsonb('filters'), // {status?, source?, dateFrom?, dateTo?}
  sortBy: varchar('sort_by', { length: 20 }).default('createdAt'),
  sortDirection: varchar('sort_direction', { length: 4 }).default('desc'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
