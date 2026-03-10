# Phase 1: Foundation and Automation Core - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

The system runs headlessly in production — new Mariages.net leads are captured automatically from Gmail, stored in the database, deduplicated, vCards generated and uploaded, and all notifications dispatched (SMS to prospect, SMS to admin with vCard link, email recap to contact@weds.fr) — without any manual intervention or UI interaction. Includes Google OAuth authentication, GCP Cloud Run deployment, and Sentry.io error tracking.

</domain>

<decisions>
## Implementation Decisions

### Email Polling Strategy
- Gmail push notifications via Google Cloud Pub/Sub for near-instant detection (<30s)
- Periodic fallback sweep every 30-60 min to catch any missed push notifications
- New Gmail label scheme: `weds-crm/pending`, `weds-crm/processed`, `weds-crm/error` (replaces legacy `to-script`)
- On parse failure: flag email with `weds-crm/error` label, log the failure, notify William via SMS, skip to next email

### Notification Flow
- All notifications fire independently — a Twilio SMS failure does not block admin SMS or email recap
- Triple alerting on notification failures: SMS (Free Mobile), email (contact@weds.fr), and application logs
- Sentry.io integrated for full error tracking and structured logging throughout the entire processing pipeline
- Prospect SMS is personalized with parsed name: "Bonjour {prénom}, merci pour votre demande..."
- vCard files stored on GCP Cloud Storage with signed URLs (configurable expiry, default 7 days)
- Phase 1 uses Twilio SMS only for prospect outreach — WhatsApp deferred to Phase 4

### Data Model
- Full database schema designed upfront for all 4 phases (leads, activities, emails, templates, sync tracking) — empty tables are free, avoids painful migrations later
- Single `activities` table with a `type` column (email_received, sms_sent, status_change, note_added, etc.) — each row links to a lead for easy chronological timeline
- Duplicate detection on email OR phone match — covers cases where same person uses different email but same phone
- When duplicate detected: incoming email content logged as activity on the existing lead (nothing lost, no new lead created)

### Claude's Discretion
- Tech stack choice (framework, language, ORM, database engine)
- Exact polling interval for fallback sweep
- vCard signed URL expiry duration
- Sentry.io SDK configuration and log levels
- Database migration tooling
- Exact SMS message templates (within French, personalized constraint)
- Cloud Run service configuration (memory, concurrency, scaling)

</decisions>

<specifics>
## Specific Ideas

- Existing email-parser project (`/Users/william/Documents/Development/email-parser`) contains working parsing logic, vCard generation, SMS flows, and Pipedrive integration — reference for field extraction patterns and service integrations
- Current Pipedrive custom field IDs are hardcoded in `email-parser/src/services/pipedrive.js` — will need mapping config for Phase 3
- GPT prompt template currently stored in a Google Doc (referenced by `GPT_PROMPT_DOC_ID`) — will move to in-app management in Phase 4
- User wants comprehensive logging: "log tout ce qui se passe dans le process"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `email-parser/src/utils/parser.js`: Regex extraction patterns for Mariages.net email format (name, date, email, phone, message)
- `email-parser/src/utils/helpers.js`: French phone normalization (E.164), vCard content generation, date formatting
- `email-parser/src/services/google.js`: Gmail search/read/modify, Drive file creation, Docs read patterns
- `email-parser/src/services/sms.js`: Twilio + Free Mobile API integration
- `email-parser/src/config.js`: Centralized env var configuration pattern

### Established Patterns
- Gmail label-based workflow: search by label → process → remove label + archive
- Pipedrive field mapping via hardcoded custom field IDs (will need abstraction for Phase 3)
- `isRunning` concurrency guard in server.js prevents overlapping parser runs

### Integration Points
- Google OAuth: needs `gmail.modify`, `drive`, `documents.readonly` scopes (existing)
- Cloud Storage: new integration for vCard hosting (replaces Google Drive)
- Sentry.io: new integration for error tracking
- Google Cloud Pub/Sub: new integration for Gmail push notifications

</code_context>

<deferred>
## Deferred Ideas

- WhatsApp notifications to prospects on lead creation — Phase 4 (WhatsApp Business API)
- WhatsApp conversation viewing in lead detail — Phase 4

</deferred>

---

*Phase: 01-foundation-and-automation-core*
*Context gathered: 2026-03-10*
