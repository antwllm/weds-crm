---
phase: quick-4
plan: 04
subsystem: pipeline-ui, preferences-api
tags: [sorting, preferences, kanban, filter-bar]
dependency_graph:
  requires: [leads-api, kanban-board, pipeline-page]
  provides: [user-preferences-table, preferences-api, sort-controls]
  affects: [FilterBar, KanbanBoard, PipelinePage]
tech_stack:
  added: []
  patterns: [debounced-save, upsert-preferences, null-safe-sort]
key_files:
  created:
    - client/src/hooks/useUserPreferences.ts
  modified:
    - src/db/schema.ts
    - src/routes/api/leads.ts
    - client/src/types/index.ts
    - client/src/components/common/FilterBar.tsx
    - client/src/components/pipeline/KanbanBoard.tsx
    - client/src/pages/PipelinePage.tsx
decisions:
  - "Preferences keyed by userEmail with upsert for single-user CRM"
  - "500ms debounce on filter/sort changes to avoid excessive API calls"
  - "Null eventDate leads sorted to end regardless of sort direction"
  - "staleTime: Infinity on preferences query since they only change from this client"
metrics:
  duration: 3min
  completed: "2026-03-15"
---

# Quick Task 4: Add Column Sorting by Creation/Event Date Summary

Sort controls in FilterBar with database-persisted preferences via userPreferences table and GET/PUT API endpoints with 500ms debounced save.

## What Was Done

### Task 1: Database table, API endpoints, and preferences hook
**Commit:** f3fd265

- Added `userPreferences` table to schema (id, userEmail unique, filters jsonb, sortBy, sortDirection, updatedAt)
- Added `GET /api/leads/preferences` endpoint returning saved or default preferences
- Added `PUT /api/leads/preferences` endpoint with zod validation and upsert on conflict
- Extended `LeadFilters` type with `sortBy` and `sortDirection` fields
- Added `UserPreferences` interface to client types
- Created `useUserPreferences` and `useSavePreferences` React Query hooks

### Task 2: Sort UI in FilterBar and sorted Kanban columns with preference persistence
**Commit:** 6c26b09

- Added sort-by Select dropdown ("Date de creation" / "Date evenement") to FilterBar
- Added sort direction toggle button with ArrowUp/ArrowDown icons
- Updated KanbanBoard to sort leads within each column by selected field/direction
- Null eventDate values pushed to end of list regardless of sort direction
- PipelinePage loads saved preferences on mount and seeds filter/sort state
- Filter and sort changes debounce-saved to backend after 500ms via setTimeout/clearTimeout pattern

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compiles without errors (`npx tsc --noEmit`)
- Client build succeeds (`cd client && npm run build`)

## Self-Check: PASSED
