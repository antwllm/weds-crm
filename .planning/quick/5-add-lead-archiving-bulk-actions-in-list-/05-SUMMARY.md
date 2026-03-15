---
phase: quick-5
plan: 01
subsystem: pipeline
tags: [archiving, bulk-actions, list-view]
dependency_graph:
  requires: []
  provides: [lead-archiving, bulk-actions]
  affects: [leads-api, pipeline-views]
tech_stack:
  added: []
  patterns: [controlled-alert-dialog, bulk-mutation-hooks]
key_files:
  created: [src/db/migrations/0002_mean_loki.sql]
  modified:
    - src/db/schema.ts
    - src/routes/api/leads.ts
    - client/src/types/index.ts
    - client/src/hooks/useLeads.ts
    - client/src/components/pipeline/ListView.tsx
    - client/src/components/common/FilterBar.tsx
    - client/src/pages/PipelinePage.tsx
    - client/src/pages/LeadDetailPage.tsx
decisions:
  - Controlled AlertDialog with open/onOpenChange for status change bulk action (Select triggers dialog open)
  - Bulk endpoints use inArray for batch operations
  - Archived leads filtered at API level (eq(leads.archived, false) default)
metrics:
  duration: 5min
  completed: 2026-03-15
---

# Quick Task 5: Lead Archiving & Bulk Actions Summary

Archived column on leads, bulk archive/delete/status-change endpoints, checkbox selection with bulk action bar in list view, and archive toggle in filter bar.

## What Was Built

### Backend
- Added `archived` boolean column to leads table (default false) with migration
- GET /api/leads filters out archived leads by default; `?includeArchived=true` overrides
- PATCH /api/leads/:id accepts `archived` boolean for single archive/unarchive
- POST /api/leads/bulk-archive: batch archive/unarchive by IDs
- POST /api/leads/bulk-delete: batch delete with cascade (activities first, then leads)
- POST /api/leads/bulk-status: batch status change with per-lead activity logging

### Frontend
- Archive/Unarchive button on lead detail page (reversible, no confirmation needed)
- Checkbox column in list view for row selection (select all / individual)
- Bulk action bar appears when leads selected: Archive, Status Change, Delete
- All bulk actions have confirmation dialogs (AlertDialog)
- Status change uses Select dropdown that opens a controlled AlertDialog for confirmation
- "Afficher les archives" checkbox toggle in filter bar (list view only)
- Archived leads rendered with opacity-50 when shown via toggle
- New hooks: useBulkArchive, useBulkDelete, useBulkStatus (all invalidate leads cache)

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Backend -- archived field, filtering, and bulk endpoints | 2049da2 | schema.ts, leads.ts, types/index.ts, migration |
| 2 | Frontend -- archive button, bulk actions, archived toggle | 6cd656d | useLeads.ts, ListView.tsx, FilterBar.tsx, PipelinePage.tsx, LeadDetailPage.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed status change bulk action dialog pattern**
- **Found during:** Task 2
- **Issue:** Nesting AlertDialog around Select doesn't work for controlled open/close -- base-ui AlertDialog needs explicit open prop
- **Fix:** Refactored to controlled AlertDialog (open={!!pendingBulkStatus}) triggered by Select onValueChange
- **Files modified:** ListView.tsx
- **Commit:** 6cd656d (amended)

## Verification

- Backend: `bun run build` (tsc) passes
- Frontend: `bunx --bun vite build` passes
- Kanban view: archived leads filtered by default at API level (no includeArchived param sent)
- List view: checkboxes, bulk bar, archived toggle all compile and render
