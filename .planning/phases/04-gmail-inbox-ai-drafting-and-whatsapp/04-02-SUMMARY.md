---
phase: 04-gmail-inbox-ai-drafting-and-whatsapp
plan: 02
subsystem: api
tags: [gmail-inbox, email-templates, ai-drafting, openrouter, express-routes]

requires:
  - phase: 04-gmail-inbox-ai-drafting-and-whatsapp
    provides: Gmail thread ops, OpenRouter service, schema tables
provides:
  - Gmail inbox API routes (list threads, get thread, reply, lead emails, link email)
  - Email template CRUD API with variable preview
  - AI prompt config CRUD API
  - AI draft generation endpoint (OpenRouter proxied, API key never exposed)
affects: [04-03, 04-04, 04-05, 04-06]

tech-stack:
  added: []
  patterns: [template-variable-preview, ai-draft-without-auto-send]

key-files:
  created:
    - src/routes/api/inbox.ts
    - src/routes/api/templates.ts
    - src/routes/api/ai.ts
    - tests/api/inbox.test.ts
    - tests/api/templates.test.ts
    - tests/api/ai.test.ts
  modified:
    - src/app.ts

key-decisions:
  - "AI draft returned as text only -- no auto-send path exists, frontend must display in compose window for review"
  - "AI prompt config uses sensible French-language default when no DB config exists"
  - "Template preview substitutes variables from real lead data via substituteVariables"
  - "Inbox reply records outbound email link with placeholder leadId, matches recipient to lead afterward"

patterns-established:
  - "API route pattern: Router with ensureAuthenticated, Zod validation, JSON responses"
  - "Template preview: fetch template + lead, substitute variables, return rendered result"
  - "AI draft safety: draft text returned to frontend, never sent as email without user action"

requirements-completed: [MAIL-01, MAIL-02, MAIL-03, MAIL-04, MAIL-05, MAIL-06, MAIL-08]

duration: 3min
completed: 2026-03-14
---

# Phase 4 Plan 02: Backend API Routes Summary

**Gmail inbox endpoints with email-to-lead auto-linking, email template CRUD with preview, and AI draft generation via OpenRouter**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T18:37:25Z
- **Completed:** 2026-03-14T18:41:17Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Gmail inbox API: list threads, get thread with auto-linking, send reply, lead emails, manual linking
- Email template CRUD with variable substitution preview from real lead data
- AI prompt config with default French photographer template
- AI draft generation proxied through backend -- API key never exposed to frontend
- 24 new tests passing across inbox, templates, and AI endpoints

## Task Commits

Each task was committed atomically:

1. **Task 1: Gmail inbox API routes + email-to-lead linking** - `f9d54f0` (test) + `ef46853` (feat) [from prior execution]
2. **Task 2: Templates CRUD + AI prompt config + AI draft generation** - `5de9575` (test) + `31190b7` (feat)

_Note: TDD tasks have RED (test) and GREEN (feat) commits_

## Files Created/Modified
- `src/routes/api/inbox.ts` - Gmail inbox API: list threads, get thread detail with auto-linking, reply, lead emails, manual link
- `src/routes/api/templates.ts` - Email template CRUD with variable preview
- `src/routes/api/ai.ts` - AI prompt config CRUD + draft generation endpoint
- `src/app.ts` - Mounted templatesRouter and aiRouter
- `tests/api/inbox.test.ts` - 10 tests for inbox endpoints
- `tests/api/templates.test.ts` - 7 tests for template CRUD + preview
- `tests/api/ai.test.ts` - 7 tests for AI prompt + draft generation

## Decisions Made
- AI draft returned as text only -- no auto-send path. Frontend must display in compose window for user review
- AI prompt config has a sensible French-language default when no DB row exists
- Template preview uses substituteVariables from openrouter service for consistency
- Inbox reply records outbound linked email immediately, then matches recipient to lead for activity logging

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed mock chain for AI route tests**
- **Found during:** Task 2 (TDD GREEN)
- **Issue:** AI route calls `db.select().from().limit()` but test mock chain only had `from().where().limit()`, not `from().limit()`
- **Fix:** Added `limit: mockLimit` to mockFrom return value
- **Files modified:** tests/api/ai.test.ts
- **Verification:** All 14 template + AI tests pass
- **Committed in:** 31190b7 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Test mock fix only, no scope creep.

## Issues Encountered
- Pre-existing auth.test.ts failures (2 tests) and webhook-whatsapp.test.ts failure (1 test) unrelated to this plan -- not addressed per scope boundary rules
- Task 1 was completed in a prior execution attempt (commits f9d54f0 and ef46853 already existed)

## User Setup Required

None - no additional external service configuration required beyond what Plan 01 established.

## Next Phase Readiness
- Complete API surface ready for frontend consumption
- Plans 04-03 through 04-06 can build UI components on top of these endpoints
- All inbox, template, and AI endpoints tested and functional

---
*Phase: 04-gmail-inbox-ai-drafting-and-whatsapp*
*Completed: 2026-03-14*
