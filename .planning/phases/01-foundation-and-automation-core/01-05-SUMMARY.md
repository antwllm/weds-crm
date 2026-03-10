---
phase: 01-foundation-and-automation-core
plan: 05
subsystem: pipeline
tags: [gmail, pubsub, cron, oauth, drizzle, docker, pipeline, dedup, vcard, notifications]

# Dependency graph
requires:
  - phase: 01-02
    provides: Express app, Google OAuth, session management
  - phase: 01-03
    provides: Email parser, Gmail service, vCard generation, GCS upload
  - phase: 01-04
    provides: SMS notifications (Twilio + Free Mobile), email recap, notification orchestrator
provides:
  - Full end-to-end email processing pipeline (parse, dedup, lead creation, vCard, notify)
  - Pub/Sub webhook trigger for Gmail push notifications
  - Cron-based fallback sweep for missed emails
  - OAuth token persistence in database (survives Cloud Run restarts)
  - Concurrency guard for pipeline runs
  - Docker Compose setup for local development
affects: [02-dashboard, 03-pipedrive-sync]

# Tech tracking
tech-stack:
  added: [node-cron]
  patterns: [pipeline orchestrator, concurrency guard, token persistence, pubsub webhook, docker-compose]

key-files:
  created:
    - src/pipeline/process-email.ts
    - src/pipeline/scheduler.ts
    - src/services/token-store.ts
    - src/services/pubsub.ts
    - src/services/gmail-client-holder.ts
    - src/routes/webhook.ts
    - tests/pipeline.test.ts
    - tests/duplicate.test.ts
    - docker-compose.yml
  modified:
    - src/app.ts
    - src/auth/passport.ts
    - src/db/schema.ts
    - src/index.ts

key-decisions:
  - "Module-level concurrency guard (isProcessing flag) for pipeline runs"
  - "Pub/Sub webhook triggers full sweep (not historyId-based) for simplicity"
  - "oauthTokens table with upsert for token persistence"
  - "Docker Compose with PostgreSQL 16 + app on port 8082 for local dev"

patterns-established:
  - "Pipeline orchestrator: parse -> dedup -> create -> vCard -> notify -> relabel"
  - "Concurrency guard: module-level boolean flag with try/finally reset"
  - "Token persistence: DB-backed OAuth tokens restored on startup"

requirements-completed: [PARS-02, LEAD-09]

# Metrics
duration: 2min
completed: 2026-03-10
---

# Phase 1 Plan 5: Pipeline Assembly Summary

**End-to-end email pipeline with Pub/Sub webhook, cron fallback, duplicate detection, token persistence, and Docker Compose for local dev**

## Performance

- **Duration:** 2 min (continuation from checkpoint -- tasks 1-2 completed by previous agent)
- **Started:** 2026-03-10T09:08:34Z
- **Completed:** 2026-03-10T09:10:29Z
- **Tasks:** 3 (1 TDD + 1 auto + 1 checkpoint verification)
- **Files modified:** 13

## Accomplishments
- Full email processing pipeline: parse -> dedup check -> create lead -> generate vCard -> upload to GCS -> dispatch notifications -> relabel Gmail
- Duplicate lead detection by normalized email or phone with activity logging on existing lead
- Pub/Sub webhook receives Gmail push notifications and triggers pipeline sweep
- Cron fallback sweep (every 30 min) and daily Gmail watch renewal
- OAuth token persistence in oauthTokens table -- pipeline auto-restores after restart
- Concurrency guard prevents overlapping pipeline runs
- Docker Compose with PostgreSQL + app verified on port 8082

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD pipeline orchestrator and duplicate detection** - `430590f` (test: RED), `9befd8c` (feat: GREEN)
2. **Task 2: Token persistence, Pub/Sub webhook, cron scheduler, app wiring** - `1190f19` (feat)
3. **Task 3: Docker Compose and verification** - `74e43dc` (chore)

_Note: Task 1 followed TDD with separate RED and GREEN commits._

## Files Created/Modified
- `src/pipeline/process-email.ts` - Full pipeline orchestrator with processOneEmail and processPendingEmails
- `src/pipeline/scheduler.ts` - Cron scheduler for fallback sweep and Gmail watch renewal
- `src/services/token-store.ts` - OAuth token persistence (saveTokens/loadTokens) via oauthTokens table
- `src/services/pubsub.ts` - Pub/Sub message decoder and validator
- `src/services/gmail-client-holder.ts` - Singleton holder for authenticated Gmail client
- `src/routes/webhook.ts` - POST /webhook/gmail endpoint for Pub/Sub push
- `tests/pipeline.test.ts` - Pipeline orchestrator tests (create lead, archive, skip, duplicate, parse failure)
- `tests/duplicate.test.ts` - Duplicate detection tests (email match, phone match, no match, null handling)
- `docker-compose.yml` - PostgreSQL 16 + app services for local development
- `src/app.ts` - Mounted webhook router, JSON body parsing
- `src/auth/passport.ts` - Token persistence on OAuth callback
- `src/db/schema.ts` - Added oauthTokens table
- `src/index.ts` - Token restoration on startup, scheduler initialization

## Decisions Made
- Module-level concurrency guard (isProcessing boolean with try/finally) -- simple and effective for single-instance Cloud Run
- Pub/Sub webhook triggers full pending-email sweep rather than historyId-based processing -- simpler, concurrency guard prevents redundancy
- oauthTokens table with upsert (INSERT ON CONFLICT UPDATE) for token persistence
- Docker Compose uses port 8082 to avoid conflicts with ports 8080 and 3000 already in use

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ALLOWED_USER_EMAIL validation in Docker**
- **Found during:** Task 3 (Docker verification)
- **Issue:** docker-compose passed empty string for ALLOWED_USER_EMAIL which failed Zod .email() validation
- **Fix:** Commented out ALLOWED_USER_EMAIL from docker-compose env (must be set in .env if needed)
- **Files modified:** docker-compose.yml
- **Verification:** Container starts successfully, health endpoint responds
- **Committed in:** 74e43dc (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor env var handling fix. No scope creep.

## Issues Encountered
None beyond the env var validation issue documented above.

## User Setup Required

**External services require manual configuration.** The plan's `user_setup` section lists:
- GCP Pub/Sub topic and subscription for Gmail push notifications
- GCS bucket for vCard file hosting
- Twilio account for prospect SMS
- Free Mobile API for admin SMS alerts

These are configured via environment variables in `.env` (see `.env.example`).

## Next Phase Readiness
- Phase 1 foundation complete: all 5 plans executed
- Full headless automation pipeline operational
- Ready for Phase 2 (Dashboard) development
- Blocker: OAuth consent screen must be set to Production status before production deploy

## Self-Check: PASSED

All 9 created files verified on disk. All 4 commit hashes verified in git log.

---
*Phase: 01-foundation-and-automation-core*
*Completed: 2026-03-10*
