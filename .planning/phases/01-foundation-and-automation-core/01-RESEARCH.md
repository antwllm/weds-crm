# Phase 1: Foundation and Automation Core - Research

**Researched:** 2026-03-10
**Domain:** Node.js/TypeScript backend automation, GCP Cloud Run, Gmail integration, SMS/email notifications
**Confidence:** HIGH

## Summary

Phase 1 rebuilds the existing `email-parser` project as a production-grade TypeScript application with persistent storage, structured error tracking, and reliable notification dispatch. The existing codebase provides proven patterns for Gmail parsing, vCard generation, Twilio/Free Mobile SMS, and Gmail email sending -- these must be ported (not reinvented) into the new architecture.

The core pipeline is: Gmail push notification (Pub/Sub) triggers email fetch, regex parsing extracts lead data, duplicate check runs against DB, lead is created, vCard is generated and uploaded to Cloud Storage, then three independent notifications fire (prospect SMS via Twilio, admin SMS via Free Mobile with vCard link, email recap to contact@weds.fr with vCard attachment). The full database schema should be designed upfront for all 4 phases as per user decision -- empty tables are free and prevent painful migrations later.

**Primary recommendation:** Use TypeScript with Express, Drizzle ORM with PostgreSQL (Neon free tier for cost optimization or Cloud SQL for full GCP integration), Google Cloud Pub/Sub for Gmail push notifications, and `@google-cloud/storage` for vCard hosting with signed URLs.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Gmail push notifications via Google Cloud Pub/Sub for near-instant detection (<30s)
- Periodic fallback sweep every 30-60 min to catch any missed push notifications
- New Gmail label scheme: `weds-crm/pending`, `weds-crm/processed`, `weds-crm/error` (replaces legacy `to-script`)
- On parse failure: flag email with `weds-crm/error` label, log the failure, notify William via SMS, skip to next email
- All notifications fire independently -- a Twilio SMS failure does not block admin SMS or email recap
- Triple alerting on notification failures: SMS (Free Mobile), email (contact@weds.fr), and application logs
- Sentry.io integrated for full error tracking and structured logging throughout the entire processing pipeline
- Prospect SMS is personalized with parsed name: "Bonjour {prenom}, merci pour votre demande..."
- vCard files stored on GCP Cloud Storage with signed URLs (configurable expiry, default 7 days)
- Phase 1 uses Twilio SMS only for prospect outreach -- WhatsApp deferred to Phase 4
- Full database schema designed upfront for all 4 phases (leads, activities, emails, templates, sync tracking) -- empty tables are free
- Single `activities` table with a `type` column (email_received, sms_sent, status_change, note_added, etc.) -- each row links to a lead
- Duplicate detection on email OR phone match
- When duplicate detected: incoming email content logged as activity on the existing lead (nothing lost, no new lead created)

### Claude's Discretion
- Tech stack choice (framework, language, ORM, database engine)
- Exact polling interval for fallback sweep
- vCard signed URL expiry duration
- Sentry.io SDK configuration and log levels
- Database migration tooling
- Exact SMS message templates (within French, personalized constraint)
- Cloud Run service configuration (memory, concurrency, scaling)

### Deferred Ideas (OUT OF SCOPE)
- WhatsApp notifications to prospects on lead creation -- Phase 4 (WhatsApp Business API)
- WhatsApp conversation viewing in lead detail -- Phase 4
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-01 | User authenticates via Google OAuth 2.0 | Passport.js + Google Strategy, session persistence via connect-pg-simple in PostgreSQL |
| INFR-02 | All UI text and notifications in French | SMS templates, email subjects/bodies, error messages -- all hardcoded in French |
| INFR-03 | UI is responsive and usable on mobile | Phase 1 is headless -- minimal admin dashboard only; responsive concern is light |
| INFR-04 | Application deploys on GCP Cloud Run via Docker | Dockerfile, Secret Manager integration, Cloud SQL/Neon connection |
| PARS-01 | System polls Gmail for Mariages.net emails and extracts lead data | Pub/Sub push + fallback cron; regex parser ported from email-parser |
| PARS-02 | System creates a new lead in the database from parsed email data | Drizzle ORM insert with full schema; activity log entry |
| PARS-03 | System archives processed emails and removes the trigger label | Gmail API modifyMessage -- add `weds-crm/processed`, remove `weds-crm/pending` |
| PARS-04 | System skips already-processed emails (duplicate email detection) | Gmail message ID stored in DB; label-based filtering prevents reprocessing |
| LEAD-09 | System detects duplicate leads by email and phone before creation | DB query on email OR normalized phone; if match, log activity on existing lead |
| LEAD-11 | System generates a vCard file for each lead and stores a download link | vCard content generation (ported), upload to Cloud Storage, signed URL stored on lead |
| NOTF-01 | System sends SMS to prospect via Twilio when new lead captured | Twilio REST API via axios (ported pattern), personalized French message |
| NOTF-02 | System sends SMS to admin via Free Mobile with vCard download link | Free Mobile sendmsg API (ported pattern), includes signed URL to vCard |
| NOTF-03 | System sends email recap to contact@weds.fr with vCard attachment | Gmail API sendEmail with MIME multipart attachment (ported pattern) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type safety across entire codebase | Catches errors at compile time; existing JS is untyped |
| Express | 5.x | HTTP server and routing | Already used in email-parser; v5 is stable since 2024 |
| Drizzle ORM | 0.39+ | Database ORM and migrations | Zero codegen, SQL-like control, ~7kb bundle, instant type updates; ideal for Cloud Run cold starts |
| PostgreSQL | 16 | Relational database | ACID compliance, session storage, full-text search for later phases |
| `@google-cloud/pubsub` | 4.x | Gmail push notification handler | Official Google library for Pub/Sub integration |
| `@google-cloud/storage` | 7.x | vCard file upload + signed URLs | Official library for GCS operations |
| `googleapis` | 128+ | Gmail API (read, modify, send, labels) | Already proven in email-parser |
| `@sentry/node` | 8.x | Error tracking and structured logging | User decision: Sentry.io for full pipeline observability |
| Passport.js | 0.7+ | Google OAuth 2.0 authentication | Already proven in email-parser; mature, well-documented |
| `passport-google-oauth20` | 2.x | Google OAuth strategy | Standard Passport strategy for Google |
| `connect-pg-simple` | 10.x | PostgreSQL session store for Express | Sessions survive Cloud Run restarts (unlike in-memory default) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `drizzle-kit` | latest | Schema migrations CLI | Run `drizzle-kit push` or `drizzle-kit migrate` for schema changes |
| `pg` | 8.x | PostgreSQL client driver | Required by Drizzle and connect-pg-simple |
| `node-cron` | 4.x | Fallback sweep scheduler | Already used in email-parser; schedules periodic Gmail poll |
| `axios` | 1.x | HTTP client for Twilio + Free Mobile APIs | Already proven in email-parser for SMS sending |
| `dotenv` | 16.x | Local development env vars | Load .env locally; Cloud Run uses Secret Manager in prod |
| `zod` | 3.x | Runtime validation for parsed email data | Validates parser output before DB insert |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle | Prisma | Prisma has better DX for simple queries but heavier bundle, codegen step, slower cold starts on Cloud Run. Prisma 7 (late 2025) dropped Rust engine but Drizzle remains lighter. |
| PostgreSQL (Cloud SQL) | Neon (serverless PG) | Neon free tier: 0.5GB storage, auto-suspend. Saves ~$10/mo vs Cloud SQL. Good for single-user. Recommendation: start with Neon, migrate to Cloud SQL if needed. |
| PostgreSQL | SQLite/Turso | Single-writer limitation problematic with concurrent Pub/Sub + cron writes. PostgreSQL is safer. |
| Express 5 | Fastify | Fastify is faster but Express is already proven in the codebase and has wider middleware ecosystem (Passport, session stores). |

**Installation:**
```bash
npm install typescript express @types/express drizzle-orm pg @types/pg \
  @google-cloud/pubsub @google-cloud/storage googleapis \
  @sentry/node passport passport-google-oauth20 @types/passport-google-oauth20 \
  express-session @types/express-session connect-pg-simple @types/connect-pg-simple \
  node-cron @types/node-cron axios zod dotenv

npm install -D drizzle-kit tsx @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── index.ts              # Entry point: Sentry init, then import app
├── app.ts                # Express app setup, middleware, routes
├── db/
│   ├── schema.ts         # Drizzle schema (ALL tables for 4 phases)
│   ├── index.ts          # DB connection pool
│   └── migrations/       # Generated by drizzle-kit
├── services/
│   ├── gmail.ts          # Gmail API: search, read, modify, send, labels
│   ├── parser.ts         # Mariages.net email regex extraction
│   ├── storage.ts        # GCS upload + signed URL generation
│   ├── sms.ts            # Twilio + Free Mobile SMS
│   ├── vcard.ts          # vCard content generation
│   ├── notifications.ts  # Orchestrates all 3 notifications independently
│   └── pubsub.ts         # Pub/Sub subscription handler
├── pipeline/
│   ├── process-email.ts  # Full pipeline: parse → dedup → create → notify
│   └── scheduler.ts      # Fallback cron sweep
├── auth/
│   ├── passport.ts       # Passport Google strategy config
│   └── middleware.ts     # ensureAuthenticated, email allowlist
├── routes/
│   ├── auth.ts           # /auth/google, /auth/google/callback, /logout
│   ├── health.ts         # /health for Cloud Run
│   └── webhook.ts        # POST /webhook/gmail (Pub/Sub push endpoint)
├── config.ts             # Centralized env var access with validation
├── logger.ts             # Structured logging (Sentry + console)
└── types.ts              # Shared TypeScript types
```

### Pattern 1: Independent Notification Dispatch
**What:** Each notification (prospect SMS, admin SMS, email recap) fires independently with its own try/catch. A failure in one does not block others.
**When to use:** Always, for all notification triggers.
**Example:**
```typescript
async function dispatchNotifications(lead: Lead, vCardUrl: string, vCardContent: string): Promise<void> {
  const results = await Promise.allSettled([
    sendTwilioSMS(lead.name, lead.eventDate, lead.phone),
    sendFreeMobileSMS(lead, vCardUrl),
    sendEmailRecap(lead, vCardContent),
  ]);

  for (const [i, result] of results.entries()) {
    if (result.status === 'rejected') {
      const channel = ['twilio_sms', 'free_mobile_sms', 'email_recap'][i];
      logger.error(`Notification failed: ${channel}`, { error: result.reason, leadId: lead.id });
      Sentry.captureException(result.reason, { tags: { channel } });
      // Triple alert on failure (except don't alert about the channel that just failed)
      await alertNotificationFailure(channel, lead, result.reason);
    }
  }
}
```

### Pattern 2: Pipeline with Concurrency Guard
**What:** Prevent overlapping parser runs (Pub/Sub push + cron could trigger simultaneously).
**When to use:** Both the Pub/Sub handler and cron scheduler entry points.
**Example:**
```typescript
let isProcessing = false;

async function processPendingEmails(): Promise<void> {
  if (isProcessing) {
    logger.info('Pipeline already running, skipping');
    return;
  }
  isProcessing = true;
  try {
    const messages = await searchMessages('label:weds-crm/pending');
    for (const msg of messages) {
      await processOneEmail(msg.id);
    }
  } finally {
    isProcessing = false;
  }
}
```

### Pattern 3: Duplicate Detection with Activity Logging
**What:** On duplicate match (email OR phone), log the incoming data as an activity on the existing lead instead of creating a new one.
**When to use:** Before every lead creation.
**Example:**
```typescript
async function checkDuplicateAndHandle(parsed: ParsedLead, gmailMessageId: string): Promise<{ isDuplicate: boolean; leadId: number }> {
  const normalizedPhone = normalizePhoneNumber(parsed.phone);
  const existing = await db.select().from(leads)
    .where(or(
      eq(leads.email, parsed.email.toLowerCase()),
      normalizedPhone ? eq(leads.phone, normalizedPhone) : undefined
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.insert(activities).values({
      leadId: existing[0].id,
      type: 'duplicate_inquiry',
      content: JSON.stringify(parsed),
      gmailMessageId,
    });
    return { isDuplicate: true, leadId: existing[0].id };
  }
  return { isDuplicate: false, leadId: 0 };
}
```

### Pattern 4: Gmail Pub/Sub Watch Renewal
**What:** Gmail push notifications expire after 7 days. Must renew daily.
**When to use:** On app startup + daily cron.
**Example:**
```typescript
async function renewGmailWatch(auth: OAuth2Client): Promise<void> {
  const gmail = google.gmail({ version: 'v1', auth });
  await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: 'projects/YOUR_PROJECT/topics/gmail-notifications',
      labelIds: ['Label_weds-crm/pending'], // Only watch the pending label
    },
  });
  logger.info('Gmail watch renewed');
}
```

### Anti-Patterns to Avoid
- **Sequential notification sending:** Never await each notification in sequence. Use `Promise.allSettled` for parallel independent dispatch.
- **In-memory session store on Cloud Run:** Cloud Run instances are ephemeral. Sessions MUST be stored in PostgreSQL via `connect-pg-simple`.
- **Storing secrets in environment variables directly:** Use GCP Secret Manager, mounted as env vars at deploy time via Cloud Run configuration.
- **Skipping Gmail message ID tracking:** Without storing processed Gmail message IDs, the fallback cron sweep will reprocess already-handled emails.
- **Blocking on vCard upload:** Upload vCard to GCS before sending notifications (admin SMS needs the signed URL), but generate the vCard content synchronously since it's just string concatenation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence | Custom DB session logic | `connect-pg-simple` | Handles serialization, expiry, cleanup automatically |
| OAuth 2.0 flow | Manual token management | Passport.js + `passport-google-oauth20` | Token refresh, session serialization, route guards handled |
| Database migrations | Manual SQL files | `drizzle-kit` | Schema diffing, migration generation, type safety |
| Phone normalization to E.164 | Custom regex | Port existing `normalizePhoneNumber` from helpers.js | Already handles French numbers (0X -> +33X), validated with E.164 regex |
| vCard generation | Custom builder | Port existing `createVCardContent` from helpers.js | VCF 3.0 format is simple but has encoding gotchas |
| Email MIME construction | Custom MIME builder | Port existing `sendEmail` from google.js | Multipart MIME with attachment boundaries already working |
| Error tracking | Custom error logging | `@sentry/node` with `Sentry.setupExpressErrorHandler(app)` | Captures unhandled exceptions, adds request context, source maps |
| Signed URLs | Custom token-based links | `@google-cloud/storage` `getSignedUrl()` | Handles expiry, IAM, URL signing automatically |

**Key insight:** The existing email-parser project contains battle-tested implementations for parsing, vCard generation, phone normalization, SMS sending, and email construction. Port these to TypeScript rather than rewriting from scratch.

## Common Pitfalls

### Pitfall 1: Gmail Watch Expiry
**What goes wrong:** Push notifications silently stop after 7 days if `watch()` is not renewed.
**Why it happens:** Gmail API watch has a max expiration of 7 days. No warning is sent before expiry.
**How to avoid:** Renew watch on every app startup AND via a daily cron job. Log the expiration timestamp returned by `watch()`.
**Warning signs:** Pub/Sub handler stops receiving messages; only fallback cron catches new emails.

### Pitfall 2: OAuth Consent Screen in Testing Mode
**What goes wrong:** Refresh tokens are revoked every 7 days in Testing mode, breaking automation.
**Why it happens:** Google OAuth consent screen defaults to "Testing" status, which limits token lifetime.
**How to avoid:** Set OAuth consent screen to "Production" before first deploy. This is called out in STATE.md as a known blocker.
**Warning signs:** `invalid_grant` errors appearing after ~7 days of running.

### Pitfall 3: Cloud Run Cold Start Drops Pub/Sub Messages
**What goes wrong:** If Cloud Run instance is cold, Pub/Sub push may time out before the app is ready.
**Why it happens:** Cloud Run scales to zero by default. Pub/Sub has a configurable acknowledgment deadline (default 10s).
**How to avoid:** Set Cloud Run `min-instances: 1` to keep one warm instance, OR set Pub/Sub acknowledgment deadline to 60s+. Also: the fallback cron sweep is the safety net.
**Warning signs:** Occasional missed emails that only appear during fallback sweep.

### Pitfall 4: Free Mobile API Rate Limiting
**What goes wrong:** Free Mobile SMS API has undocumented rate limits (~1 SMS per 10 seconds).
**Why it happens:** Free Mobile's API is a consumer feature, not enterprise-grade.
**How to avoid:** Add a small delay between Free Mobile API calls if processing multiple leads. For Phase 1 (single-lead processing), this is unlikely to be an issue.
**Warning signs:** HTTP 429 or 500 responses from smsapi.free-mobile.fr.

### Pitfall 5: Gmail Label IDs vs Names
**What goes wrong:** Using label names in API calls that expect label IDs.
**Why it happens:** `searchMessages` uses label names (e.g., `label:weds-crm/pending`), but `modifyMessage` requires label IDs.
**How to avoid:** On startup, resolve all label names to IDs using `getLabelIdByName()` and cache them. Create labels programmatically if they don't exist.
**Warning signs:** "Label not found" errors; emails not getting relabeled.

### Pitfall 6: Drizzle Schema Must Cover All 4 Phases
**What goes wrong:** Adding tables later causes migration conflicts or requires schema redesign.
**Why it happens:** User explicitly decided to design full schema upfront.
**How to avoid:** Define ALL tables in `schema.ts` from day one -- leads, activities, emails, templates, sync_tracking, etc. Tables can be empty; the schema just needs to be stable.
**Warning signs:** N/A -- this is a design decision, not a runtime issue.

## Code Examples

### Existing Parser Logic (to port from email-parser)
```typescript
// Source: /Users/william/Documents/Development/email-parser/src/utils/parser.js
// These regex patterns are PROVEN for Mariages.net email format:
const nameRegex = /L'utilisateur\s+(.*?)\s+s'est/i;
const eventDateRegex = /DATE ÉV[ÈÉ]NEMENT:\s*(.*)/i;
const emailRegex = /(?:E-MAIL|EMAIL):\s*(.*)/i;
const phoneRegex = /TÉLÉPHONE\s*:\s*(.*)/i;
const messageBlockRegex = /(TÉLÉPHONE\s*:[\s\S]*?)(?=\sRépondez)/i;
```

### Phone Normalization (to port)
```typescript
// Source: /Users/william/Documents/Development/email-parser/src/utils/helpers.js
function normalizePhoneNumber(phone: string | null): string | null {
  if (!phone) return null;
  let p = phone.replace(/[^0-9+]/g, '');
  p = p.replace(/^(0{2})/, '+');
  p = p.replace(/^0?(?=\d{9})/, '+33');
  if (p.indexOf('+') !== 0) p = '+' + p;
  return /^\+[1-9]\d{1,14}$/.test(p) ? p : null;
}
```

### Twilio SMS (to port)
```typescript
// Source: /Users/william/Documents/Development/email-parser/src/services/sms.js
// Key: uses axios with URLSearchParams, Basic auth from accountId:authToken
const message = `Bonjour ${name}, merci d'avoir pris contact avec weds.fr. Nous avons bien reçu votre demande de photographe pour votre mariage le ${date}. Nous revenons vers vous d'ici 24h. \n\nL'équipe de weds.fr`;
```

### Free Mobile SMS (to port, updated with vCard link)
```typescript
// Source: /Users/william/Documents/Development/email-parser/src/services/sms.js
// Updated for Phase 1: now includes vCard download link
const message = `Mariages.net - ${name} se marie le ${eventDate}\n\nPhone : ${phone}\nEmail : ${email}\n\nVoici son message :${messageBody}\n\nvCard : ${vCardSignedUrl}`;
// POST to https://smsapi.free-mobile.fr/sendmsg with { user, pass, msg }
```

### GCS Upload + Signed URL
```typescript
// Source: Google Cloud official docs
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);

async function uploadVCardAndGetSignedUrl(
  name: string, eventDate: string, vCardContent: string, expiryDays = 7
): Promise<string> {
  const fileName = `vcards/${Date.now()}-${name.replace(/\s+/g, '-')}.vcf`;
  const file = bucket.file(fileName);

  await file.save(vCardContent, { contentType: 'text/vcard' });

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiryDays * 24 * 60 * 60 * 1000,
  });

  return signedUrl;
}
```

### Sentry Setup (must be first import)
```typescript
// Source: https://docs.sentry.io/platforms/javascript/guides/express/
// File: src/index.ts -- MUST be entry point
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
});

// Import app AFTER Sentry.init
import { app } from './app';

// At the end of middleware chain:
// Sentry.setupExpressErrorHandler(app);
```

### Database Schema (upfront design for all phases)
```typescript
// src/db/schema.ts -- Drizzle schema
import { pgTable, serial, text, timestamp, varchar, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const leadStatusEnum = pgEnum('lead_status', [
  'nouveau', 'contacte', 'rdv', 'devis_envoye', 'signe', 'perdu'
]);

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }), // E.164 normalized
  eventDate: varchar('event_date', { length: 50 }),
  message: text('message'),
  source: varchar('source', { length: 50 }).default('mariages.net'),
  status: leadStatusEnum('status').default('nouveau'),
  vCardUrl: text('vcard_url'),
  gmailMessageId: varchar('gmail_message_id', { length: 255 }),
  pipedrivePersonId: integer('pipedrive_person_id'),  // Phase 3
  pipedriveDealId: integer('pipedrive_deal_id'),      // Phase 3
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const activityTypeEnum = pgEnum('activity_type', [
  'email_received', 'sms_sent', 'email_sent', 'status_change',
  'note_added', 'duplicate_inquiry', 'notification_failed',
  'pipedrive_synced',  // Phase 3
]);

export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').references(() => leads.id).notNull(),
  type: activityTypeEnum('type').notNull(),
  content: text('content'),
  metadata: jsonb('metadata'),
  gmailMessageId: varchar('gmail_message_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// Phase 3: Pipedrive sync tracking
export const syncLog = pgTable('sync_log', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').references(() => leads.id),
  direction: varchar('direction', { length: 10 }), // 'push' | 'pull'
  status: varchar('status', { length: 20 }),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Phase 4: Email templates
export const emailTemplates = pgTable('email_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }),
  body: text('body'),
  variables: jsonb('variables'), // ['nom', 'date_evenement', ...]
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Phase 4: Linked emails
export const linkedEmails = pgTable('linked_emails', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').references(() => leads.id).notNull(),
  gmailMessageId: varchar('gmail_message_id', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }),
  snippet: text('snippet'),
  direction: varchar('direction', { length: 10 }), // 'inbound' | 'outbound'
  receivedAt: timestamp('received_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Session table (managed by connect-pg-simple, defined here for reference)
// CREATE TABLE "session" ("sid" varchar NOT NULL, "sess" json NOT NULL, "expire" timestamp(6) NOT NULL);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prisma with Rust query engine | Prisma 7 pure TypeScript engine | Late 2025 | Reduced cold starts, but Drizzle still lighter |
| Express 4 | Express 5 (stable) | 2024 | Async error handling, promise support built-in |
| Google Drive for vCard hosting | GCS with signed URLs | User decision | Better access control, configurable expiry |
| `label:to-script` Gmail label | `weds-crm/pending`, `weds-crm/processed`, `weds-crm/error` | User decision | Clearer workflow states |
| Pipedrive as source of truth | Local PostgreSQL DB | Architecture change | Enables Phase 2-4 features |
| Sentry v7 | Sentry v8 (`@sentry/node` 8.x) | 2024 | New `setupExpressErrorHandler()`, modular imports |

**Deprecated/outdated:**
- `@google-cloud/local-auth`: Only for CLI tools; Cloud Run uses service account or stored refresh tokens
- `socket.io` for live logs: Not needed in Phase 1 (headless); Sentry replaces real-time log streaming
- Google Drive for file storage: Replaced by GCS per user decision

## Open Questions

1. **Database hosting choice: Neon vs Cloud SQL**
   - What we know: Neon free tier is 0.5GB with auto-suspend; Cloud SQL cheapest is ~$7-10/mo for db-f1-micro
   - What's unclear: Whether Neon's cold start (auto-suspend wake) causes issues with Pub/Sub webhook latency
   - Recommendation: Start with Neon free tier; if latency is an issue, migrate to Cloud SQL. Schema is portable since both are PostgreSQL.

2. **Gmail OAuth refresh token storage on Cloud Run**
   - What we know: email-parser stores refresh token in `token.json` file; Cloud Run filesystem is ephemeral
   - What's unclear: Best practice for storing Gmail OAuth refresh token that survives restarts
   - Recommendation: Store the refresh token in Secret Manager (or in the database). On startup, load it and create the OAuth2 client. When the token refreshes, update the stored value.

3. **Pub/Sub push endpoint authentication**
   - What we know: Pub/Sub push sends HTTP POST to a Cloud Run URL; needs authentication to prevent spoofed requests
   - What's unclear: Whether to use Pub/Sub's built-in OIDC token verification or a shared secret
   - Recommendation: Use Pub/Sub's built-in push authentication with OIDC tokens -- Cloud Run verifies the token automatically when configured correctly.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` (Wave 0) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFR-01 | Google OAuth login + session persist | integration | `npx vitest run tests/auth.test.ts -t "oauth"` | No -- Wave 0 |
| INFR-04 | Docker builds and starts cleanly | smoke | `docker build -t weds-crm . && docker run --rm weds-crm node -e "console.log('ok')"` | No -- Wave 0 |
| PARS-01 | Mariages.net email parsed correctly | unit | `npx vitest run tests/parser.test.ts` | No -- Wave 0 |
| PARS-02 | Parsed data creates lead in DB | integration | `npx vitest run tests/pipeline.test.ts -t "create lead"` | No -- Wave 0 |
| PARS-03 | Processed email gets relabeled | integration | `npx vitest run tests/pipeline.test.ts -t "archive"` | No -- Wave 0 |
| PARS-04 | Already-processed emails skipped | unit | `npx vitest run tests/pipeline.test.ts -t "skip processed"` | No -- Wave 0 |
| LEAD-09 | Duplicate detected by email or phone | unit | `npx vitest run tests/duplicate.test.ts` | No -- Wave 0 |
| LEAD-11 | vCard generated and uploaded, URL stored | unit | `npx vitest run tests/vcard.test.ts` | No -- Wave 0 |
| NOTF-01 | Twilio SMS sent to prospect | unit | `npx vitest run tests/notifications.test.ts -t "twilio"` | No -- Wave 0 |
| NOTF-02 | Free Mobile SMS sent with vCard link | unit | `npx vitest run tests/notifications.test.ts -t "free mobile"` | No -- Wave 0 |
| NOTF-03 | Email recap sent with vCard attachment | unit | `npx vitest run tests/notifications.test.ts -t "email recap"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest configuration
- [ ] `tests/parser.test.ts` -- Mariages.net email parsing with real email samples
- [ ] `tests/duplicate.test.ts` -- Email/phone duplicate detection
- [ ] `tests/vcard.test.ts` -- vCard generation content validation
- [ ] `tests/notifications.test.ts` -- SMS/email dispatch (mocked external APIs)
- [ ] `tests/pipeline.test.ts` -- Full pipeline integration (parse -> dedup -> create -> notify)
- [ ] `tests/auth.test.ts` -- OAuth flow and session persistence
- [ ] `tests/helpers/` -- Test fixtures: sample Mariages.net email bodies
- [ ] Framework install: `npm install -D vitest @vitest/coverage-v8`

## Sources

### Primary (HIGH confidence)
- `/Users/william/Documents/Development/email-parser/` -- Existing working codebase with proven patterns for Gmail, parsing, SMS, vCard
- [Google Gmail API Push Notifications](https://developers.google.com/gmail/api/guides/push) -- Pub/Sub watch setup, 7-day renewal requirement
- [Google Cloud Storage Signed URLs](https://docs.cloud.google.com/storage/docs/access-control/signed-urls) -- V4 signing, expiry configuration
- [Cloud Run Secret Manager](https://docs.cloud.google.com/run/docs/configuring/services/secrets) -- Mounting secrets as env vars
- [Sentry Express Guide](https://docs.sentry.io/platforms/javascript/guides/express/) -- SDK setup, error handler, init-first requirement
- [connect-pg-simple](https://github.com/voxpelli/node-connect-pg-simple) -- PostgreSQL session store

### Secondary (MEDIUM confidence)
- [Drizzle vs Prisma comparison 2026](https://www.bytebase.com/blog/drizzle-vs-prisma/) -- Bundle size, cold start performance
- [Node.js ORMs 2025](https://thedataguy.pro/blog/2025/12/nodejs-orm-comparison-2025/) -- Ecosystem landscape

### Tertiary (LOW confidence)
- Free Mobile SMS API rate limits -- undocumented, based on community reports
- Neon cold start latency impact on Pub/Sub webhook response times -- needs validation in production

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- based on existing email-parser patterns + verified current library versions
- Architecture: HIGH -- pipeline design mirrors existing working system with added persistence
- Pitfalls: HIGH -- Gmail watch expiry and OAuth consent screen are documented; Cloud Run session is well-known
- Database schema: MEDIUM -- upfront 4-phase design may need adjustments as later phases are planned

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (30 days -- stable technology stack, no fast-moving dependencies)
