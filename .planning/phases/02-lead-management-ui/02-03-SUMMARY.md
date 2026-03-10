---
phase: 02-lead-management-ui
plan: 03
subsystem: ui
tags: [react, dnd-kit, tanstack-table, tanstack-query, kanban, pipeline]

# Dependency graph
requires:
  - phase: 02-lead-management-ui
    provides: React SPA scaffold, shadcn/ui components, API wrapper, constants, types
  - phase: 02-lead-management-ui
    provides: Leads CRUD API at /api/leads with status change tracking
provides:
  - Pipeline page with Kanban board (6 columns, drag-and-drop)
  - List view with TanStack Table (sortable, responsive)
  - View toggle persisting filters across board/list switch
  - Optimistic status updates via TanStack Query mutations
  - Reusable SourceBadge, FilterBar, ViewToggle components
affects: [02-04, 02-05]

# Tech tracking
tech-stack:
  added: [@tanstack/react-table]
  patterns: [optimistic-mutation-with-rollback, dnd-kit-kanban-with-sortable, tanstack-table-responsive-columns]

key-files:
  created:
    - client/src/hooks/useLeads.ts
    - client/src/components/pipeline/KanbanBoard.tsx
    - client/src/components/pipeline/KanbanColumn.tsx
    - client/src/components/pipeline/LeadCard.tsx
    - client/src/components/pipeline/ListView.tsx
    - client/src/components/common/FilterBar.tsx
    - client/src/components/common/ViewToggle.tsx
    - client/src/components/leads/SourceBadge.tsx
    - client/src/pages/PipelinePage.tsx
  modified: []

key-decisions:
  - "PointerSensor distance:8 activation constraint prevents accidental drags and conflict with tap/scroll on mobile"
  - "TouchSensor with delay:200 as fallback for mobile drag-and-drop"
  - "Optimistic updates use setQueriesData to update all cached lead queries simultaneously"
  - "ListView hides email and phone columns on mobile via TanStack Table column visibility"

patterns-established:
  - "Optimistic mutation: cancelQueries -> snapshot -> setQueriesData -> rollback on error -> invalidate on settle"
  - "Kanban: DndContext with closestCorners + SortableContext per column + DragOverlay for visual feedback"
  - "Responsive table: column visibility based on window width at render time"

requirements-completed: [LEAD-02, LEAD-03, LEAD-06, LEAD-10]

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 02 Plan 03: Pipeline Board & List View Summary

**Kanban board with dnd-kit drag-and-drop status changes, sortable list view with TanStack Table, and reusable FilterBar/ViewToggle components**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-10T16:16:53Z
- **Completed:** 2026-03-10T16:21:45Z
- **Tasks:** 2
- **Files modified:** 9 created

## Accomplishments
- Full Kanban board with 6 pipeline columns always visible, drag-and-drop between columns with optimistic status updates
- List view with sortable columns (name, event date, budget, status, creation date) and responsive mobile layout
- Shared FilterBar (status, source, date range) and ViewToggle components with filter persistence across views
- TanStack Query hooks including useUpdateLeadStatus with full optimistic update pattern (cancel/snapshot/rollback)
- LeadCard with compact layout showing name, event date formatted in French, budget in EUR, and source badge

## Task Commits

Each task was committed atomically:

1. **Task 1: Create TanStack Query hooks, SourceBadge, FilterBar, ViewToggle, and LeadCard** - `f151fef` (feat)
2. **Task 2: Build KanbanBoard, KanbanColumn, ListView, and PipelinePage** - `114805a` (feat)

## Files Created/Modified
- `client/src/hooks/useLeads.ts` - TanStack Query hooks with optimistic status update mutation
- `client/src/components/pipeline/KanbanBoard.tsx` - DndContext with 6 columns, PointerSensor, TouchSensor, DragOverlay
- `client/src/components/pipeline/KanbanColumn.tsx` - Droppable column with SortableContext and sortable LeadCards
- `client/src/components/pipeline/LeadCard.tsx` - Compact draggable card with name, date, budget, source badge
- `client/src/components/pipeline/ListView.tsx` - TanStack Table with sorting, responsive column visibility
- `client/src/components/common/FilterBar.tsx` - Status, source, and date range filter controls
- `client/src/components/common/ViewToggle.tsx` - Board/List toggle buttons
- `client/src/components/leads/SourceBadge.tsx` - Color-coded source badge from constants
- `client/src/pages/PipelinePage.tsx` - Main pipeline page with view toggle, filters, and content switching

## Decisions Made
- Used PointerSensor with distance:8 activation constraint to prevent accidental drags and conflicts with tap/scroll on mobile
- Added TouchSensor with delay:200 as mobile fallback for touch-based drag-and-drop
- Optimistic updates use setQueriesData to update all cached lead query variants simultaneously, with per-query rollback on error
- ListView hides email and phone columns on mobile via TanStack Table column visibility for responsive layout
- Used useNavigate for "Nouveau lead" button instead of Button asChild (base-ui pattern compatibility)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed missing @tanstack/react-table dependency**
- **Found during:** Task 1 (creating ListView)
- **Issue:** @tanstack/react-table not in package.json, required for sortable list view
- **Fix:** Ran `npm install @tanstack/react-table`
- **Files modified:** client/package.json, client/package-lock.json
- **Verification:** Vite build succeeds
- **Committed in:** f151fef (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Dependency installation required for list view. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Pipeline page fully functional with both Kanban and list views
- Ready for 02-04 (Lead detail page) and 02-05 (Lead form) to build on navigation from LeadCard clicks

## Self-Check: PASSED

- All 9 key files: FOUND
- Commit f151fef (Task 1): FOUND
- Commit 114805a (Task 2): FOUND
