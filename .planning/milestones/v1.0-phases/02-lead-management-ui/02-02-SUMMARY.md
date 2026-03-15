---
phase: 02-lead-management-ui
plan: 02
subsystem: api
tags: [express, drizzle, zod, rest-api, crud]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Express app, Drizzle ORM schema, ensureAuthenticated middleware
provides:
  - Full leads CRUD API at /api/leads
  - Activities timeline API at /api/leads/:id/activities
  - Notes creation API at /api/leads/:id/notes
  - Budget field on leads table
  - LeadFilters, CreateLeadRequest, UpdateLeadRequest types
affects: [02-lead-management-ui, 03-pipedrive-sync]

# Tech tracking
tech-stack:
  added: []
  patterns: [API router with Zod validation, status change activity tracking, cascading delete]

key-files:
  created:
    - src/routes/api/leads.ts
    - src/routes/api/activities.ts
    - tests/api/leads.test.ts
    - tests/api/activities.test.ts
  modified:
    - src/db/schema.ts
    - src/types.ts
    - src/app.ts

key-decisions:
  - "Activities router mounted at /api with full paths /leads/:id/activities and /leads/:id/notes for cleaner URL structure"
  - "POST /api/leads auto-creates status_change activity with from: null, to: nouveau"
  - "DELETE cascades: activities deleted before lead to respect foreign key constraint"

patterns-established:
  - "API router pattern: Zod validation + Drizzle queries + ensureAuthenticated middleware per router"
  - "Status change tracking: PATCH with status diff creates activity with from/to metadata"

requirements-completed: [LEAD-01, LEAD-02, LEAD-04, LEAD-05, LEAD-06, LEAD-07, LEAD-08, LEAD-10]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 02 Plan 02: Leads CRUD & Activities API Summary

**Full REST API for leads CRUD with status-change tracking, notes, and activity timeline using Drizzle ORM and Zod validation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T16:09:38Z
- **Completed:** 2026-03-10T16:13:51Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Complete leads CRUD API (GET/POST/PATCH/DELETE) with filtering by status, source, and date range
- Automatic status_change activity creation on lead creation and status updates
- Activities timeline and notes endpoints for lead detail view
- Budget field added to leads schema (nullable integer)
- 15 API integration tests, 86 total tests passing with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add budget field to schema and create leads CRUD API with tests**
   - `3151eb7` (test) - TDD RED: failing leads tests
   - `fd5c0b9` (feat) - TDD GREEN: leads CRUD implementation
2. **Task 2: Create activities API routes with tests and mount all API routes**
   - `5ba114e` (test) - TDD RED: failing activities tests
   - `66cd16c` (feat) - TDD GREEN: activities implementation + route mounting

## Files Created/Modified
- `src/db/schema.ts` - Added budget integer field to leads table
- `src/types.ts` - Added LeadFilters, CreateLeadRequest, UpdateLeadRequest interfaces
- `src/routes/api/leads.ts` - Full CRUD router with Zod validation and status tracking
- `src/routes/api/activities.ts` - Activities list and notes creation router
- `src/app.ts` - Mounted leads and activities routers before Sentry handler
- `tests/api/leads.test.ts` - 10 integration tests for leads CRUD
- `tests/api/activities.test.ts` - 5 integration tests for activities and notes

## Decisions Made
- Activities router mounted at `/api` with full paths (`/leads/:id/activities`, `/leads/:id/notes`) rather than nesting under `/api/leads` -- keeps router self-contained and avoids Express param inheritance issues
- POST /api/leads auto-creates a `status_change` activity with `{from: null, to: "nouveau"}` to establish timeline from creation
- DELETE endpoint deletes activities first, then lead, to respect the foreign key constraint without relying on CASCADE (explicit over implicit)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Full REST API surface ready for frontend consumption
- Endpoints: GET/POST/PATCH/DELETE /api/leads, GET /api/leads/:id/activities, POST /api/leads/:id/notes
- All routes protected by ensureAuthenticated middleware

## Self-Check: PASSED

All 7 files verified present. All 4 task commits verified in git log. Budget field confirmed in schema.

---
*Phase: 02-lead-management-ui*
*Completed: 2026-03-10*
