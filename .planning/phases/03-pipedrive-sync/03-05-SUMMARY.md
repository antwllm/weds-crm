---
phase: 03-pipedrive-sync
plan: 05
subsystem: ui
tags: [react-query, optimistic-update, mutation, name-editing]

# Dependency graph
requires:
  - phase: 02-frontend
    provides: "LeadDetail component and useLeads hooks"
provides:
  - "Optimistic cache update for useUpdateLead mutation"
  - "Clean name field editing without accumulation"
affects: [03-pipedrive-sync, 04-gmail-ai-whatsapp]

# Tech tracking
tech-stack:
  added: []
  patterns: [optimistic-update-with-rollback]

key-files:
  created: []
  modified:
    - client/src/hooks/useLeads.ts
    - client/src/components/leads/LeadDetail.tsx

key-decisions:
  - "Replicated useUpdateLeadStatus optimistic pattern for useUpdateLead -- consistent cache strategy"
  - "handleNameSave uses filter(Boolean).join instead of template literal to avoid trailing spaces"

patterns-established:
  - "All lead mutations use optimistic update with rollback: onMutate/onError/onSettled"

requirements-completed: [SYNC-01]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 03 Plan 05: Name Accumulation Bug Fix Summary

**Optimistic cache update on useUpdateLead prevents stale closure reads, fixing name field concatenation on rapid edits**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T14:25:01Z
- **Completed:** 2026-03-12T14:27:02Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Added onMutate optimistic update to useUpdateLead matching existing useUpdateLeadStatus pattern
- Simplified handleNameSave to use fresh firstName/lastName from optimistically-updated cache
- Eliminated name accumulation bug ("New 2 2 2 2 2 2 Lead") on rapid Prenom/Nom edits

## Task Commits

Each task was committed atomically:

1. **Task 1: Add optimistic update to useUpdateLead and fix handleNameSave** - `50f0b3f` (fix)

## Files Created/Modified
- `client/src/hooks/useLeads.ts` - Added optimistic cache update (onMutate/onError/onSettled) to useUpdateLead
- `client/src/components/leads/LeadDetail.tsx` - Simplified handleNameSave to use fresh derived firstName/lastName

## Decisions Made
- Replicated the exact useUpdateLeadStatus optimistic pattern for useUpdateLead for consistency
- Used filter(Boolean).join(' ') instead of template literal to avoid leading/trailing spaces when one name part is empty
- Kept existing space-based name split logic (lines 49-51) unchanged -- root cause was staleness, not the split

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing auth.test.ts failures (2 tests) observed during verification -- unrelated to this change, out of scope

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Name editing works correctly with optimistic updates
- All useUpdateLead consumers now benefit from immediate cache updates
- Ready for UAT re-test of name editing scenarios

---
*Phase: 03-pipedrive-sync*
*Completed: 2026-03-12*
