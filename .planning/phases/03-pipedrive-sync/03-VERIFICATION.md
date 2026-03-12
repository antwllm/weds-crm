---
phase: 03-pipedrive-sync
verified: 2026-03-12T15:31:00Z
status: passed
score: 19/19 must-haves verified
re_verification: false
human_verification:
  - test: "Create a lead in the CRM and verify it appears in Pipedrive (weds.pipedrive.com) as a Person + Deal with all custom fields"
    expected: "Person with email/phone created, Deal with correct title format 'Name (DD/MM/YYYY)', stage matching CRM status, all custom fields populated"
    why_human: "Requires live Pipedrive account access and network — cannot automate without credentials"
  - test: "Change a lead status in the CRM and verify the Pipedrive deal stage updates"
    expected: "Deal stage in Pipedrive changes to correspond to the new CRM status"
    why_human: "Requires live Pipedrive account"
  - test: "Change a deal stage in Pipedrive and verify the CRM lead status updates (check activity timeline)"
    expected: "Lead status updated, pipedrive_synced activity appears in timeline, no loop occurs"
    why_human: "Requires live Pipedrive webhook delivery and network round-trip"
  - test: "Verify loop prevention holds under rapid back-and-forth edits"
    expected: "Changes stabilize after one round-trip — no infinite loop"
    why_human: "Real-time temporal behavior requires live environment"
  - test: "Run scripts/pipedrive-audit.ts and verify JSON output"
    expected: "Outputs PIPEDRIVE_FIELD_CONFIG JSON blob with field keys and stage IDs"
    why_human: "Requires live Pipedrive API credentials in env"
  - test: "Edit Prenom field rapidly on a lead and verify no name accumulation"
    expected: "Editing 'Pierre' to 'Jean' on 'Pierre Dupont' produces 'Jean Dupont', not 'Pierre Jean Dupont'"
    why_human: "UI behavior requires browser interaction — not testable with unit tests"
---

# Phase 3: Bidirectional Pipedrive Sync Verification Report

**Phase Goal:** Bidirectional Pipedrive sync — push CRM changes to Pipedrive, receive Pipedrive webhooks, import existing deals
**Verified:** 2026-03-12T15:31:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Pipedrive API client can make authenticated requests | VERIFIED | `src/services/pipedrive/client.ts` — axios with `params: { api_token: config.PIPEDRIVE_API_TOKEN }` and `baseURL: 'https://api.pipedrive.com/v1'` |
| 2 | Custom field hash keys and stage IDs resolved from config | VERIFIED | `src/services/pipedrive/field-config.ts` — `loadFieldConfig()`, `statusToStageId()`, `stageIdToStatus()` fully implemented with fallback defaults |
| 3 | leads table has lastSyncOrigin and lastSyncAt columns | VERIFIED | `src/db/schema.ts` lines 50-51 — both columns present on the `leads` table |
| 4 | Retry utility wraps API calls with backoff and logs to syncLog | VERIFIED | `src/services/pipedrive/retry.ts` — `withRetry<T>()` with 1s/4s/9s backoff, syncLog inserts, SMS alert on exhaustion |
| 5 | Creating a lead in CRM creates a Person and Deal in Pipedrive | VERIFIED | `src/services/pipedrive/sync-push.ts` `handleCreate()` — searches for existing person, creates if not found, creates deal with all custom fields |
| 6 | Updating a lead status in CRM updates the Pipedrive deal stage | VERIFIED | `sync-push.ts` `handleUpdate()` — calls `PUT /deals/:id` with `stage_id` from `statusToStageId()` |
| 7 | Sync does not block the API response | VERIFIED | `src/routes/api/leads.ts` — POST and PATCH both use `setImmediate()` fire-and-forget pattern |
| 8 | Pipedrive webhook events are received and processed | VERIFIED | `src/routes/webhook.ts` — `POST /webhook/pipedrive` dispatches to all 4 handler types |
| 9 | API-origin webhooks are discarded | VERIFIED | `webhook.ts` line 163 — Layer 1: `if (meta.change_source === 'api') return` |
| 10 | Webhooks within suppression window are discarded | VERIFIED | `webhook.ts` lines 190-201 — Layer 2: `isWithinSuppressionWindow(lead.lastSyncAt)` check |
| 11 | Deal stage change in Pipedrive updates lead status | VERIFIED | `sync-pull.ts` `handleDealUpdate()` — extracts stage_id, calls `stageIdToStatus()`, updates lead.status |
| 12 | New deal in Pipedrive creates a CRM lead | VERIFIED | `sync-pull.ts` `handleDealCreated()` — fetches person, duplicate-checks by email/phone, inserts lead |
| 13 | Deleted deal adds warning activity (no status change) | VERIFIED | `sync-pull.ts` `handleDealDeleted()` — inserts warning activity, clears pipedriveDealId, does NOT change status |
| 14 | All Pipedrive deals can be imported as leads | VERIFIED | `src/services/pipedrive/import.ts` `importAllDeals()` — paginates `GET /deals?status=all_not_deleted` |
| 15 | Imported deals include notes and activities | VERIFIED | `import.ts` `importDeal()` — fetches `/deals/:id/notes` and `/deals/:id/activities`, inserts with original dates |
| 16 | Duplicate deals linked without overwriting CRM values | VERIFIED | `import.ts` — existing lead found by email/phone gets only `pipedriveDealId`/`pipedrivePersonId` updated |
| 17 | Manual push-to-Pipedrive button visible in lead detail | VERIFIED | `client/src/pages/LeadDetailPage.tsx` lines 97-115 — button with "Envoyer vers Pipedrive"/"Re-synchroniser Pipedrive" label based on `pipedriveDealId` |
| 18 | Name editing does not accumulate values | VERIFIED | `client/src/hooks/useLeads.ts` — `useUpdateLead` has `onMutate` optimistic cache update; `LeadDetail.tsx` `handleNameSave` uses fresh `firstName`/`lastName` with `filter(Boolean).join(' ')` |
| 19 | Every processed webhook logs a pipedrive_synced activity | VERIFIED | All 4 handlers in `sync-pull.ts` insert activities with `type: 'pipedrive_synced'` |

**Score:** 19/19 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/services/pipedrive/client.ts` | Authenticated axios instance | VERIFIED | Exports `pipedriveApi` with token auth, baseURL, timeout |
| `src/services/pipedrive/field-config.ts` | Field config type + loaders | VERIFIED | Exports `PipedriveFieldConfig`, `loadFieldConfig`, `statusToStageId`, `stageIdToStatus`, `_resetFieldConfig` |
| `src/services/pipedrive/retry.ts` | Retry with backoff + syncLog | VERIFIED | Exports `withRetry<T>`, logs to syncLog on success/failure, SMS alert on exhaustion |
| `src/services/pipedrive/sync-push.ts` | CRM-to-Pipedrive push | VERIFIED | Exports `syncLeadToPipedrive(lead, action)`, handles create and update flows |
| `src/services/pipedrive/sync-pull.ts` | Webhook event handlers | VERIFIED | Exports `handleDealUpdate`, `handleDealCreated`, `handleDealDeleted`, `handlePersonUpdate`, `isWithinSuppressionWindow` |
| `src/services/pipedrive/import.ts` | Import service | VERIFIED | Exports `importAllDeals`, `importDeal` with pagination, dedup, history import |
| `src/routes/webhook.ts` | POST /webhook/pipedrive | VERIFIED | Adds Pipedrive route alongside Gmail route, basic auth, Zod validation, dual-layer loop prevention |
| `src/routes/api/leads.ts` | setImmediate hooks + /sync-pipedrive | VERIFIED | POST and PATCH use fire-and-forget sync; `POST /:id/sync-pipedrive` endpoint exists |
| `scripts/pipedrive-audit.ts` | Audit CLI script | VERIFIED | Calls `/dealFields`, `/pipelines`, `/stages`, outputs PIPEDRIVE_FIELD_CONFIG JSON |
| `scripts/pipedrive-import.ts` | Import CLI script | VERIFIED | Calls `importAllDeals()`, prints summary, exits cleanly |
| `tests/pipedrive/helpers/fixtures.ts` | Mock data for all Phase 3 tests | VERIFIED | 9 exports: MOCK_FIELD_CONFIG, MOCK_LEAD, MOCK_PIPEDRIVE_PERSON_RESPONSE, MOCK_PIPEDRIVE_DEAL_RESPONSE, 4 webhook mocks, MOCK_WEBHOOK_DEAL_CHANGE_API |
| `tests/pipedrive/sync-push.test.ts` | Push sync unit tests | VERIFIED | 8 tests, all passing |
| `tests/pipedrive/webhook.test.ts` | Webhook + sync-pull unit tests | VERIFIED | 17 tests, all passing |
| `client/src/pages/LeadDetailPage.tsx` | Manual push button | VERIFIED | Button with conditional label/icon, calls `syncLeadToPipedrive`, shows loading state and toast |
| `client/src/lib/api.ts` | `syncLeadToPipedrive` client function | VERIFIED | Exported function calling `POST /api/leads/:id/sync-pipedrive` |
| `client/src/hooks/useLeads.ts` | Optimistic update on useUpdateLead | VERIFIED | `onMutate`/`onError`/`onSettled` pattern matching `useUpdateLeadStatus` |
| `src/db/schema.ts` | lastSyncOrigin + lastSyncAt columns | VERIFIED | Both columns present on `leads` table |
| `src/config.ts` | Pipedrive env vars | VERIFIED | `PIPEDRIVE_API_TOKEN`, `PIPEDRIVE_FIELD_CONFIG`, `PIPEDRIVE_WEBHOOK_USER`, `PIPEDRIVE_WEBHOOK_PASSWORD` all present |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/services/pipedrive/client.ts` | `src/config.ts` | `config.PIPEDRIVE_API_TOKEN` | WIRED | Line 10: `params: { api_token: config.PIPEDRIVE_API_TOKEN }` |
| `src/services/pipedrive/retry.ts` | `src/db/schema.ts` | `syncLog` insert | WIRED | Lines 26-30, 37-41: `db.insert(syncLog).values(...)` |
| `src/services/pipedrive/retry.ts` | `src/services/alerts.ts` | `alertNotificationFailure` | WIRED | Lines 53-57: called with `failedChannel='pipedrive_sync'` on exhaustion |
| `src/routes/api/leads.ts` | `src/services/pipedrive/sync-push.ts` | `setImmediate` after insert/update | WIRED | Lines 114-123 (POST) and 192-201 (PATCH): `setImmediate(() => syncLeadToPipedrive(...))` |
| `src/services/pipedrive/sync-push.ts` | `src/services/pipedrive/client.ts` | `pipedriveApi` HTTP calls | WIRED | Lines 37, 52, 76, 155, 164, 177: `pipedriveApi.get/post/put` |
| `src/services/pipedrive/sync-push.ts` | `src/services/pipedrive/retry.ts` | `withRetry` wrapper | WIRED | All Pipedrive API calls wrapped in `withRetry()` |
| `src/routes/webhook.ts` | `src/services/pipedrive/sync-pull.ts` | event dispatch switch | WIRED | Lines 206-223: switch on `eventType` dispatches to all 4 handlers |
| `src/services/pipedrive/sync-pull.ts` | `src/db/schema.ts` | `pipedriveDealId` lookups | WIRED | `eq(leads.pipedriveDealId, ...)` used throughout handlers |
| `src/routes/webhook.ts` | `src/config.ts` | `PIPEDRIVE_WEBHOOK_USER/PASSWORD` | WIRED | Lines 94-95: `verifyPipedriveAuth()` reads both config values |
| `scripts/pipedrive-import.ts` | `src/services/pipedrive/import.ts` | `importAllDeals()` | WIRED | Line 10-17: imports and calls `importAllDeals()` |
| `src/services/pipedrive/import.ts` | `src/services/pipedrive/client.ts` | `pipedriveApi.get` | WIRED | Lines 27, 91, 167, 185: paginated deal/person/notes/activities fetches |
| `client/src/pages/LeadDetailPage.tsx` | `client/src/lib/api.ts` | `syncLeadToPipedrive` call | WIRED | Line 17: imported, line 37: called in `handleSync()` |
| `client/src/hooks/useLeads.ts` | `/api/leads/:id` | PATCH with optimistic rollback | WIRED | `onMutate` cancels queries, updates cache, `onError` rolls back, `onSettled` invalidates |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|---------|
| SYNC-01 | 03-01, 03-02, 03-04, 03-05 | System pushes new leads to Pipedrive as Person + Deal with all custom fields | SATISFIED | `sync-push.ts` creates Person (search-or-create) + Deal with custom fields; fires from `leads.ts` POST/PATCH; manual push button in UI; optimistic name editing fixed |
| SYNC-02 | 03-01, 03-02 | System syncs status changes from CRM to Pipedrive deal stage | SATISFIED | `handleUpdate()` calls `PUT /deals/:id` with `stage_id` from `statusToStageId()`; 'perdu' correctly sets `status: 'lost'` |
| SYNC-03 | 03-01, 03-03, 03-04 | System receives Pipedrive webhook events and updates local leads | SATISFIED | `POST /webhook/pipedrive` with Zod validation; 4 handlers for deal/person events; `importAllDeals` for historical data |
| SYNC-04 | 03-01, 03-03 | System prevents sync loops | SATISFIED | Dual-layer: Layer 1 discards `change_source='api'`; Layer 2 discards within 5s suppression window of `lastSyncOrigin='crm'`; columns present in schema |

---

### Test Results

**All 25 Pipedrive tests pass:**

```
tests/pipedrive/sync-push.test.ts  — 8 tests passed
tests/pipedrive/webhook.test.ts    — 17 tests passed
Total: 25/25 passed (418ms)
```

Tests cover: person creation, dedup, custom fields, deal title format, stage updates, skip logic, activity logging, all 4 webhook event types, loop prevention (both layers), suppression window, unknown entity handling.

---

### Anti-Patterns Found

None. No TODOs, FIXMEs, placeholder returns, or stub implementations detected in the phase files.

Notable: `import.ts` line 153 uses `status as any` — acceptable cast since Drizzle enum typing is strict and the value is validated via `stageIdToStatus()` one line above.

---

### Human Verification Required

The following scenarios require live environment testing against the Pipedrive API:

**1. Push on lead creation**
- **Test:** Create a lead in the CRM (POST /api/leads or via UI form)
- **Expected:** Person + Deal appear in weds.pipedrive.com with correct title (Name (DD/MM/YYYY)), stage = "nouveau", all custom fields populated
- **Why human:** Requires live Pipedrive API credentials and network

**2. Push on status change**
- **Test:** Change a lead status to "contacte" via PATCH /api/leads/:id
- **Expected:** Pipedrive deal stage changes to the mapped "contacte" stage
- **Why human:** Requires live Pipedrive account

**3. Webhook pull (stage change)**
- **Test:** Change a deal stage manually in weds.pipedrive.com
- **Expected:** CRM lead status updates within seconds, `pipedrive_synced` activity appears in the timeline
- **Why human:** Requires live webhook delivery; Pipedrive webhook endpoint must be registered and accessible

**4. Loop prevention under live conditions**
- **Test:** Change CRM status, then immediately check Pipedrive webhook does not re-update CRM
- **Expected:** No infinite update loop; changes stabilize after one round-trip
- **Why human:** 5-second suppression window behavior requires timing in a live environment

**5. Audit script against live Pipedrive account**
- **Test:** Run `npx tsx scripts/pipedrive-audit.ts` with `PIPEDRIVE_API_TOKEN` set
- **Expected:** Outputs JSON blob with current field keys and stage IDs
- **Why human:** Requires live credentials

**6. Name editing no-accumulation (UAT Test 3)**
- **Test:** In the lead detail page, edit "Prenom" field from "Pierre" to "Jean" multiple times in rapid succession on a lead named "Pierre Dupont"
- **Expected:** Final name is "Jean Dupont" — no accumulation like "Pierre Jean Jean Dupont"
- **Why human:** Optimistic update behavior requires browser interaction to verify

---

### Gaps Summary

No automated gaps. All 19 truths verified across the codebase. The phase goal of bidirectional Pipedrive sync is fully implemented:

- **Push (CRM → Pipedrive):** Fire-and-forget sync on every lead create/update; manual push button in UI
- **Pull (Pipedrive → CRM):** POST /webhook/pipedrive with dual-layer loop prevention; all 4 event types handled
- **Import:** CLI script with paginated deal fetch, history import (notes + activities), duplicate linking
- **Infrastructure:** Authenticated client, field config, retry-with-syncLog, schema columns, comprehensive test fixtures
- **Bug fix:** Name accumulation fixed via optimistic cache update in useUpdateLead

The 6 human verification items are all live-environment or visual checks that cannot be automated without a running instance and Pipedrive credentials.

---

_Verified: 2026-03-12T15:31:00Z_
_Verifier: Claude (gsd-verifier)_
