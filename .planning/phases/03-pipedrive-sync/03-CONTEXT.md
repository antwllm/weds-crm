# Phase 3: Pipedrive Sync - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Bidirectional sync between the CRM and Pipedrive — every CRM lead action propagates to Pipedrive (Person + Deal) and every Pipedrive change propagates back to the CRM, with origin-based loop prevention and no silent data loss. Includes a one-time Pipedrive import (all deals + history) and a manual push button for existing CRM leads. This is a migration safety net so William can use either system during the transition.

</domain>

<decisions>
## Implementation Decisions

### Field Mapping Strategy
- Config file approach — store Pipedrive custom field hash keys in a JSON/env config
- One-time audit script runs against the Pipedrive API to populate the field key config
- Pipeline stage IDs also resolved and stored in config (match existing stages)
- Fields synced: name, email, phone, event date, message body, source, vCard URL, budget, status
- Deal title format: "Prénom Nom (date)" — same as existing email-parser convention

### CRM → Pipedrive Sync
- Immediate sync — every lead create/update fires a sync call to Pipedrive right away
- On Pipedrive API failure: log in syncLog table, retry up to 3 times with exponential backoff
- After 3 failures: alert William via Free Mobile SMS (existing alerting pattern)
- CRM lead status maps 1:1 to Pipedrive pipeline stages (nouveau→contacté→rdv→devis_envoyé→signé→perdu)

### Pipedrive → CRM Sync (Webhooks)
- Direct webhook endpoint: POST /webhook/pipedrive (alongside existing /webhook/gmail)
- Events processed: deal updated (stage change), person updated, deal deleted, deal added
- Deal deleted in Pipedrive → flag lead for review (add warning activity, don't change status or delete)
- Deal added in Pipedrive → create corresponding CRM lead with all fields

### Loop Prevention
- Origin tagging — each change tagged with its origin (crm/pipedrive)
- When a webhook arrives, check if the change originated from the CRM — if so, discard
- Conflict resolution: CRM wins — CRM is the system of record going forward

### Sync Visibility
- Every sync event (push, pull, conflict, failure) logged as 'pipedrive_synced' activity in the lead's timeline
- Full transparency — all sync operations visible in activity history

### Retry & Error Handling
- Retry with exponential backoff, max 3 attempts
- All attempts logged in syncLog table (direction, status, error)
- After exhausting retries: Free Mobile SMS alert to William

### Initial Import from Pipedrive
- One-time import of ALL Pipedrive deals (active + closed/won/lost) — complete historical view
- Import creates CRM leads from Pipedrive deals with all custom field values
- Duplicate handling: if a Pipedrive deal matches an existing CRM lead by email/phone, link them (store pipedrivePersonId/pipedriveDealId) without overwriting CRM field values
- Import deal history: notes, Pipedrive activities (calls, meetings, tasks), and custom field values
- Preserve original Pipedrive dates on imported activities (createdAt = Pipedrive date, not import date)
- Imported activities stored as CRM activities with appropriate types and metadata

### Existing CRM Leads → Pipedrive
- Manual trigger — button in the UI to push a specific CRM lead to Pipedrive on demand
- No automatic backfill of existing CRM leads

### Claude's Discretion
- Pipedrive API client implementation (axios, fetch, etc.)
- Webhook signature verification approach (if Pipedrive supports it)
- Origin tag storage mechanism (in-memory map vs DB column)
- Exact retry backoff timing
- Import script implementation (CLI command vs one-time migration)
- Activity type mapping for Pipedrive activities (calls, meetings → which CRM activity types)
- Manual push button placement in the UI

</decisions>

<specifics>
## Specific Ideas

- Existing `email-parser/src/services/pipedrive.js` has working Person/Deal creation logic — reference for API patterns and custom field hash keys
- Current custom field keys: c76364a6... (event date), 3492fbf7... (message), 7daee8dd... (source), 7a59a127... (vCard URL), 547fb3bf... (GPT prompt)
- Pipedrive domain: "weds" (BASE_URL = https://weds.pipedrive.com/v1)
- STATE.md flags: "Webhooks v2 became default March 2025 — verify exact event format against live weds.fr account"
- User wants complete historical import including notes and activities — "Je veux aussi importer l'historique des actions liées à un deal pipedrive comme les notes, les emails et toutes les informations pertinentes"

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/schema.ts`: Already has `pipedrivePersonId`, `pipedriveDealId` on leads table, `syncLog` table, and `pipedrive_synced` activity type
- `src/routes/webhook.ts`: Existing webhook pattern (POST /webhook/gmail) — Pipedrive webhook follows same structure
- `src/services/alerts.ts`: Free Mobile SMS alerting — reuse for sync failure notifications
- `src/services/notifications.ts`: Promise.allSettled pattern for independent operations
- `email-parser/src/services/pipedrive.js`: Working Pipedrive API calls (addPerson, addDeal, checkEmailExists)

### Established Patterns
- Express Router per webhook type (src/routes/webhook.ts)
- Drizzle ORM for all DB operations
- Activity logging via activities table with type enum
- Best-effort notifications (never throw on alert failure)
- DI pattern for testability (gmail client as first arg)

### Integration Points
- `src/routes/webhook.ts`: Add Pipedrive webhook route alongside Gmail
- `src/db/schema.ts`: syncLog table ready, may need columns for origin tagging
- `src/routes/api/`: Lead CRUD routes — need to hook sync triggers on create/update
- Lead status enum matches Pipedrive pipeline stages — need stage ID mapping in config

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-pipedrive-sync*
*Context gathered: 2026-03-10*
