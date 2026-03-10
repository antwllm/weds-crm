import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  integer,
  jsonb,
  pgEnum,
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
  lastSyncOrigin: varchar('last_sync_origin', { length: 10 }), // 'crm' | 'pipedrive' | null
  lastSyncAt: timestamp('last_sync_at'), // When last sync occurred (loop prevention)
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
  subject: varchar('subject', { length: 500 }),
  snippet: text('snippet'),
  direction: varchar('direction', { length: 10 }), // 'inbound' | 'outbound'
  receivedAt: timestamp('received_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
