---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed quick-1-PLAN.md
last_updated: "2026-03-15T09:50:38.561Z"
last_activity: 2026-03-14 — Completed 04-06 Lead Detail WhatsApp & Emails UI
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 22
  completed_plans: 21
  percent: 95
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10)

**Core value:** Every Mariages.net lead is captured, organized, and actionable from a single interface — no switching between Gmail, Pipedrive, and phone
**Current focus:** Phase 4 in progress — Gmail Inbox, AI Drafting & WhatsApp

## Current Position

Phase: 4 of 4 (Gmail Inbox, AI Drafting & WhatsApp)
Plan: 6 of 7 in current phase (completed)
Status: Phase 4 In Progress
Last activity: 2026-03-15 - Completed quick task 1: Execute all 8 pending todos

Progress: [█████████░] 95%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 4min
- Total execution time: 0.13 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 2 | 8min | 4min |

**Recent Trend:**
- Last 5 plans: 01-01 (4min), 01-04 (4min)
- Trend: Consistent

*Updated after each plan completion*
| Phase 01 P02 | 5min | 2 tasks | 8 files |
| Phase 01 P03 | 5min | 2 tasks | 8 files |
| Phase 01 P05 | 2min | 3 tasks | 13 files |
| Phase 02 P01 | 4min | 2 tasks | 27 files |
| Phase 02 P02 | 4min | 2 tasks | 7 files |
| Phase 02 P04 | 3min | 2 tasks | 11 files |
| Phase 02 P03 | 5min | 2 tasks | 9 files |
| Phase 02 P05 | 5min | 2 tasks | 12 files |
| Phase 03 P01 | 3min | 2 tasks | 7 files |
| Phase 03 P02 | 3min | 2 tasks | 3 files |
| Phase 03 P03 | 3min | 2 tasks | 3 files |
| Phase 03 P05 | 2min | 1 tasks | 2 files |
| Phase 04 P01 | 5min | 3 tasks | 11 files |
| Phase 03 P04 | 5min | 3 tasks | 5 files |
| Phase 04 P02 | 3min | 2 tasks | 7 files |
| Phase 04 P03 | 4min | 2 tasks | 5 files |
| Phase 04 P05 | 3min | 1 tasks | 7 files |
| Phase 04 P06 | 3min | 2 tasks | 9 files |
| Phase 04 P04 | 4min | 2 tasks | 8 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Coarse granularity — 4 phases; Phase 3 (Pipedrive sync) and Phase 4 (Gmail inbox + AI + WhatsApp) are independent and could parallelize, but sequencing keeps context focused
- WhatsApp (NOTF-04, NOTF-05) promoted to v1 and assigned to Phase 4 alongside Gmail inbox — both are "messaging channel from the lead record" features sharing the same adapter and activity-history integration pattern; Twilio WhatsApp sandbox used for development pending Business API approval
- 01-01: Zod v4 for env validation with production/dev conditional requirements
- 01-01: Lazy DB initialization (getDb()) to avoid connection at import time
- 01-01: Structured JSON logging for Cloud Run log aggregation
- 01-03: Phone normalization returns E.164 format in ParsedLead for downstream consistency
- 01-03: Gmail service uses DI pattern (gmail client as first arg) for testability
- 01-03: Module-scoped label cache with _resetLabelCache() for test isolation
- 01-04: Free Mobile API uses GET with query params (matches their API design)
- 01-04: Triple alerting is best-effort -- never throws even if alert channels fail
- 01-04: Promise.allSettled for independent notification dispatch (not Promise.all)
- [Phase 01-02]: Serialize full user object (tokens) into session for downstream Gmail API access
- [Phase 01-02]: connect-pg-simple with createTableIfMissing for auto session table creation
- [Phase 01-02]: getPool() exported from db/index.ts to share pool between Drizzle and session store
- [Phase 01]: Module-level concurrency guard for pipeline runs
- [Phase 01]: Pub/Sub webhook triggers full sweep not historyId-based
- [Phase 01]: oauthTokens table with upsert for token persistence
- [Phase 01]: Docker Compose on port 8082 to avoid port conflicts
- [Phase 02]: Frontend types defined directly in client/src/types instead of re-exporting from @shared to avoid Vite-to-drizzle-orm build coupling
- [Phase 02-02]: Activities router mounted at /api with full paths for cleaner URL structure
- [Phase 02-02]: POST /api/leads auto-creates status_change activity with from: null, to: nouveau
- [Phase 02-02]: DELETE cascades explicitly: activities first, then lead (no SQL CASCADE)
- [Phase 02-04]: useLeads hook created in 02-04 as blocking dependency from unexecuted 02-03
- [Phase 02-04]: InlineField saves immediately on blur/Enter with no debounce -- single-user CRM
- [Phase 02-04]: Lead detail fetches all leads via useLeads() and filters by id client-side
- [Phase 02-05]: Split name into separate Prenom/Nom fields based on user feedback
- [Phase 02-05]: Budget parsing uses parseInt to match backend z.number().int() validation
- [Phase 03-01]: Default Pipedrive field hash keys embedded as fallbacks in field-config.ts
- [Phase 03-01]: Module-level cached field config with _resetFieldConfig() for test isolation
- [Phase 03-01]: withRetry uses alertNotificationFailure with failedChannel='pipedrive_sync' for SMS alerts
- [Phase 03-02]: Fire-and-forget via setImmediate so API response is never delayed by Pipedrive calls
- [Phase 03-02]: Person search by email before creating to avoid Pipedrive duplicates
- [Phase 03]: Dual-layer loop prevention: Layer 1 discards API-origin events, Layer 2 uses 5s suppression window on CRM-originated syncs
- [Phase 03-03]: Deal deleted only adds warning activity and clears pipedriveDealId -- no status change or lead deletion
- [Phase 03-03]: Deal created performs duplicate detection by email/phone, links existing leads without overwriting CRM values
- [Phase 03-03]: Basic auth with timingSafeEqual for webhook verification, skippable in dev mode
- [Phase 03-05]: All lead mutations use optimistic update with rollback (onMutate/onError/onSettled) for consistent cache strategy
- [Phase 03-05]: handleNameSave uses filter(Boolean).join instead of template literal to avoid trailing spaces
- [Phase 04-01]: DI pattern for HTTP clients: openrouter.ts and whatsapp.ts accept optional axios instance for testing
- [Phase 04-01]: WhatsApp media messages return 'Media recu' placeholder (V1 text-only scope)
- [Phase 04-01]: verifyWebhookSignature uses timingSafeEqual for constant-time comparison
- [Phase 04-01]: LeadContext interface centralizes lead data for AI prompt assembly
- [Phase 03]: Import preserves original Pipedrive dates (add_time) for notes and activities
- [Phase 03]: Manual push endpoint is synchronous (not fire-and-forget) to provide immediate UI feedback
- [Phase 04]: AI draft returned as text only -- no auto-send path, frontend must display in compose window for review
- [Phase 04]: AI prompt config uses sensible French-language default when no DB config exists
- [Phase 04]: Template preview substitutes variables from real lead data via substituteVariables
- [Phase 04]: Raw body captured via express.json verify callback for HMAC signature verification
- [Phase 04]: Phone matching uses or(eq(+prefix), eq(without-prefix)) for E.164 normalization tolerance
- [Phase 04]: Free Mobile SMS alert sent directly via axios in WhatsApp webhook handler (best-effort, never throws)
- [Phase 04]: WhatsApp webhook responds 200 immediately, processes async via setImmediate (same pattern as Gmail/Pipedrive)
- [Phase 04]: Variable chip insertion uses cursor position tracking via textarea ref for precise placement
- [Phase 04]: Template form uses inline editing panel (right side on desktop) rather than modal dialogs
- [Phase 04]: SettingsPage lazy-loaded via React.lazy consistent with InboxPage pattern
- [Phase 04]: AI draft button calls POST /api/ai/generate-draft then navigates to /inbox with draft + leadId + leadEmail state
- [Phase 04]: WhatsApp messages poll every 30s via React Query refetchInterval for near-real-time updates
- [Phase 04]: Lead detail right column reordered: Notes -> Emails -> WhatsApp -> Historique
- [Phase 04]: stripHtml via DOMParser for XSS-safe email body rendering instead of raw innerHTML
- [Phase 04]: Draft-from-lead shows standalone compose when no prior email thread exists for the lead
- [Phase 04]: Location state cleared after consuming draft to prevent stale drafts on refresh

### Pending Todos

5 pending — /gsd:check-todos to review

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Execute all 8 pending todos: fix firstname bug, fix accents, add euro to budget, color-code statuses, remove source column, collapse activity history, condense lead info, reorganize lead detail layout | 2026-03-15 | d142dfa | [1-execute-all-8-pending-todos-fix-firstnam](./quick/1-execute-all-8-pending-todos-fix-firstnam/) |

### Blockers/Concerns

- Phase 1: OAuth consent screen must be set to Production status before first production deploy — Testing status revokes refresh tokens every 7 days
- Phase 1: NOTF-02 admin SMS must include a vCard download link — vCard file must be uploaded to GCP bucket before the SMS is sent; storage step is part of Phase 1 notification flow
- Phase 3: Pipedrive Webhooks v2 became default March 2025 — verify exact event format against live weds.fr account before planning this phase (research-phase recommended)
- Phase 3: Custom Pipedrive field hash key audit needed before Phase 3 planning — run against live weds.fr account to produce field mapping config
- Phase 4: WhatsApp Business API approval process takes weeks — begin the application during Phase 2 or 3 so approval lands before Phase 4 planning; Twilio WhatsApp sandbox used for development in the interim

## Session Continuity

Last session: 2026-03-15T09:50:38.551Z
Stopped at: Completed quick-1-PLAN.md
Resume file: None
