---
phase: quick-4
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - src/db/schema.ts
  - src/routes/api/leads.ts
  - client/src/types/index.ts
  - client/src/hooks/useLeads.ts
  - client/src/hooks/useUserPreferences.ts
  - client/src/components/common/FilterBar.tsx
  - client/src/components/pipeline/KanbanBoard.tsx
  - client/src/pages/PipelinePage.tsx
autonomous: true
requirements: [QUICK-4]

must_haves:
  truths:
    - "Leads within each Kanban column can be sorted by creation date or event date"
    - "Sort direction toggles between ascending and descending"
    - "Filter and sort preferences persist in database and restore on page load"
    - "Preferences survive browser changes (not localStorage)"
  artifacts:
    - path: "src/db/schema.ts"
      provides: "userPreferences table"
      contains: "userPreferences"
    - path: "src/routes/api/leads.ts"
      provides: "GET/PUT /api/preferences endpoint"
    - path: "client/src/hooks/useUserPreferences.ts"
      provides: "React Query hook for preferences CRUD"
    - path: "client/src/components/common/FilterBar.tsx"
      provides: "Sort field and direction selectors"
  key_links:
    - from: "client/src/pages/PipelinePage.tsx"
      to: "/api/preferences"
      via: "useUserPreferences hook loads prefs on mount, seeds filters+sort state"
      pattern: "useUserPreferences"
    - from: "client/src/components/pipeline/KanbanBoard.tsx"
      to: "sort state"
      via: "sortBy and sortDirection props control lead ordering within columns"
      pattern: "sortedLeads"
---

<objective>
Add column sorting by creation/event date to the pipeline Kanban board and persist all filter/sort preferences in the database.

Purpose: Lets the user control lead ordering within columns and ensures their view preferences survive across devices and browser changes.
Output: Sort controls in FilterBar, sorted Kanban columns, userPreferences table with GET/PUT API, preferences auto-loaded on page mount.
</objective>

<execution_context>
@/Users/william/.claude/get-shit-done/workflows/execute-plan.md
@/Users/william/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/db/schema.ts
@src/routes/api/leads.ts
@client/src/types/index.ts
@client/src/hooks/useLeads.ts
@client/src/components/common/FilterBar.tsx
@client/src/components/pipeline/KanbanBoard.tsx
@client/src/components/pipeline/KanbanColumn.tsx
@client/src/pages/PipelinePage.tsx

<interfaces>
From client/src/types/index.ts:
```typescript
export interface LeadFilters {
  status?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface Lead {
  id: number;
  name: string;
  eventDate: string | null;
  createdAt: string | null;
  // ... other fields
}
```

From client/src/hooks/useLeads.ts:
```typescript
export function useLeads(filters?: LeadFilters): UseQueryResult<Lead[]>;
```

From client/src/components/common/FilterBar.tsx:
```typescript
interface FilterBarProps {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Database table, API endpoints, and preferences hook</name>
  <files>src/db/schema.ts, src/routes/api/leads.ts, client/src/types/index.ts, client/src/hooks/useUserPreferences.ts</files>
  <action>
1. In `src/db/schema.ts`, add a `userPreferences` table after the `aiPromptConfig` table:
   - `id` serial primary key
   - `userEmail` varchar(255) not null, unique (use ALLOWED_USER_EMAIL as identifier -- single-user CRM)
   - `filters` jsonb -- stores {status?, source?, dateFrom?, dateTo?}
   - `sortBy` varchar(20) default 'createdAt' -- 'createdAt' | 'eventDate'
   - `sortDirection` varchar(4) default 'desc' -- 'asc' | 'desc'
   - `updatedAt` timestamp defaultNow

2. In `client/src/types/index.ts`:
   - Add `sortBy` and `sortDirection` to `LeadFilters`: `sortBy?: 'createdAt' | 'eventDate'; sortDirection?: 'asc' | 'desc';`
   - Add `UserPreferences` interface: `{ filters: LeadFilters; sortBy: 'createdAt' | 'eventDate'; sortDirection: 'asc' | 'desc'; }`

3. In `src/routes/api/leads.ts`, add two endpoints BEFORE the `/:id` routes (to avoid route conflicts):
   - `GET /preferences` -- queries `userPreferences` table by session user email (`req.user.email` or the `ALLOWED_USER_EMAIL` env var). Returns `{ filters, sortBy, sortDirection }` or defaults `{ filters: {}, sortBy: 'createdAt', sortDirection: 'desc' }` if no row exists.
   - `PUT /preferences` -- upserts (insert on conflict update) the preferences row. Validate with zod: filters is optional object, sortBy is enum, sortDirection is enum.

4. Create `client/src/hooks/useUserPreferences.ts`:
   - `useUserPreferences()` -- React Query hook, queryKey `['userPreferences']`, fetches `GET /api/leads/preferences`
   - `useSavePreferences()` -- mutation calling `PUT /api/leads/preferences`, invalidates `['userPreferences']` on success
   - Export both hooks
  </action>
  <verify>
    <automated>cd /Users/william/Documents/Development/weds-crm && npx drizzle-kit generate 2>&1 | head -5 && curl -s http://localhost:8082/api/leads/preferences 2>/dev/null | head -1 || echo "Server not running -- schema check only"</automated>
  </verify>
  <done>userPreferences table defined in schema, GET/PUT /api/leads/preferences endpoints return/save preferences, useUserPreferences hook created</done>
</task>

<task type="auto">
  <name>Task 2: Sort UI in FilterBar and sorted Kanban columns with preference persistence</name>
  <files>client/src/components/common/FilterBar.tsx, client/src/components/pipeline/KanbanBoard.tsx, client/src/pages/PipelinePage.tsx</files>
  <action>
1. Update `FilterBar` props to include sort state:
   - Add to `FilterBarProps`: `sortBy: 'createdAt' | 'eventDate'; sortDirection: 'asc' | 'desc'; onSortChange: (sortBy: 'createdAt' | 'eventDate', sortDirection: 'asc' | 'desc') => void;`
   - Add a sort Select dropdown after the date filters with options: "Date de creation" (createdAt) and "Date evenement" (eventDate)
   - Add a sort direction toggle button (ArrowUpDown or ArrowUp/ArrowDown icon from lucide-react) that toggles asc/desc on click. Show ArrowUp for asc, ArrowDown for desc.
   - Labels in French: "Trier par" before the select

2. Update `KanbanBoard`:
   - Add props: `sortBy: 'createdAt' | 'eventDate'; sortDirection: 'asc' | 'desc';`
   - In the `leadsByStage` useMemo, after grouping leads by status, sort each group's array. Sort logic:
     - For `createdAt`: compare `lead.createdAt` strings (ISO dates, string comparison works)
     - For `eventDate`: compare `lead.eventDate` strings. Leads with null eventDate go to the end regardless of direction.
     - Apply `sortDirection`: 'desc' = newest first (default), 'asc' = oldest first
   - Add `sortBy` and `sortDirection` to the useMemo dependency array

3. Update `PipelinePage`:
   - Import `useUserPreferences` and `useSavePreferences` from the new hook
   - Add sort state: `const [sortBy, setSortBy] = useState<'createdAt' | 'eventDate'>('createdAt');` and `const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');`
   - On mount, when `useUserPreferences` data loads, seed both `filters` and `sortBy`/`sortDirection` state from the saved preferences (use a useEffect that runs when preferences data first loads)
   - When filters change OR sort changes, debounce-save to backend via `useSavePreferences().mutate({ filters, sortBy, sortDirection })`. Use a 500ms debounce (simple setTimeout + clearTimeout ref pattern, no library needed) to avoid saving on every keystroke in date inputs.
   - Pass `sortBy`, `sortDirection`, and `onSortChange` handler to `FilterBar`
   - Pass `sortBy` and `sortDirection` to `KanbanBoard`
   - Also pass `sortBy` and `sortDirection` to `ListView` if it accepts them (if not, just pass to KanbanBoard for now)
  </action>
  <verify>
    <automated>cd /Users/william/Documents/Development/weds-crm && npx tsc --noEmit 2>&1 | tail -20</automated>
  </verify>
  <done>Sort controls visible in FilterBar, Kanban columns sort leads by selected field/direction, changing any filter or sort preference auto-saves to database after 500ms debounce, preferences restore on page load</done>
</task>

</tasks>

<verification>
1. TypeScript compiles without errors: `npx tsc --noEmit`
2. Build succeeds: `cd client && npm run build`
3. Manual: Open pipeline page, change sort to "Date evenement" ascending, refresh page -- sort selection should persist
4. Manual: Change a filter (e.g., source), close browser, reopen -- filter should persist
</verification>

<success_criteria>
- Sort dropdown in FilterBar with "Date de creation" and "Date evenement" options
- Sort direction toggle (asc/desc) with visual indicator
- Leads within each Kanban column sorted according to selection
- Null eventDate leads sorted to end when sorting by eventDate
- All filter + sort preferences saved to userPreferences table in PostgreSQL
- Preferences restored from database on page load (not localStorage)
</success_criteria>

<output>
After completion, create `.planning/quick/4-add-column-sorting-by-creation-event-dat/04-SUMMARY.md`
</output>
