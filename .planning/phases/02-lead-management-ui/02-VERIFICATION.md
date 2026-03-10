---
phase: 02-lead-management-ui
verified: 2026-03-10T19:22:00Z
status: human_needed
score: 22/22 automated must-haves verified
re_verification: false
human_verification:
  - test: "Drag a lead card to a different Kanban column"
    expected: "Card moves instantly (optimistic update), column counts update, status persists on refresh"
    why_human: "DndContext drag-and-drop interactions cannot be verified programmatically with static analysis"
  - test: "Click a field on the lead detail page and edit it inline"
    expected: "Field becomes an input with focus, saves on blur or Enter, shows toast, reverts on Escape"
    why_human: "InlineField click-to-edit and auto-save behavior requires browser interaction"
  - test: "Mobile viewport: sidebar collapses to hamburger, Kanban scrolls horizontally, detail page stacks"
    expected: "Sidebar hidden; Sheet opens on hamburger tap; Kanban overflow-x-auto scrolls; lg:grid-cols-2 stacks to single column"
    why_human: "Responsive layout requires visual verification in a mobile-sized viewport"
  - test: "Add a note in the lead detail right column"
    expected: "Note appears in ActivityTimeline immediately with 'Note ajoutee' toast"
    why_human: "Real-time query invalidation and UI refresh require live browser state"
---

# Phase 02: Lead Management UI Verification Report

**Phase Goal:** Build the lead management UI — React SPA with pipeline Kanban board, lead detail pages, CRUD operations, and responsive layout.
**Verified:** 2026-03-10T19:22:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Vite dev server starts and serves the React app with proxy to Express on 8082 | VERIFIED | `client/vite.config.ts`: proxy `/api` and `/auth` to `http://localhost:8082`, `@tailwindcss/vite` plugin present |
| 2 | App renders with left sidebar (desktop) and hamburger Sheet (mobile) | VERIFIED | `AppLayout.tsx`: `hidden md:flex` desktop sidebar + `md:hidden` mobile header with `Sheet` + `SheetTrigger` |
| 3 | React Router navigates between /pipeline, /leads/:id, /leads/new | VERIFIED | `App.tsx`: correct route order (`/leads/new` before `/leads/:id`), all pages wired to real components |
| 4 | API calls include credentials and redirect 401 to /auth/google | VERIFIED | `api.ts`: `credentials: 'include'`, 401 handler redirects to `/auth/google` |
| 5 | French labels centralized for 6 pipeline stages, sources, and 8 activity types | VERIFIED | `constants.ts`: all 6 stages, `SOURCE_BADGES`, `ACTIVITY_TYPE_LABELS` with accented labels |
| 6 | POST /api/leads creates a lead and returns 201 | VERIFIED | `leads.ts` route + test: 201 response, initial status_change activity created |
| 7 | GET /api/leads filterable by status, source, and date range | VERIFIED | `leads.ts`: `and()` conditions for status/source/dateFrom/dateTo; test passes |
| 8 | PATCH /api/leads/:id with status change creates a status_change activity | VERIFIED | `leads.ts`: detects `statusChanged`, inserts activity with from/to metadata; test passes |
| 9 | DELETE /api/leads/:id cascades to activities and returns 204 | VERIFIED | `leads.ts`: deletes activities first, then lead; test passes |
| 10 | POST /api/leads/:id/notes creates note_added activity, GET returns chronological list | VERIFIED | `activities.ts`: `note_added` type insert + `asc(createdAt)` query; tests pass (5/5) |
| 11 | All 6 Kanban columns always visible, even when empty | VERIFIED | `KanbanBoard.tsx`: maps all `PIPELINE_STAGES`, empty columns show "Aucun lead" placeholder |
| 12 | Drag-and-drop moves cards with optimistic status update | HUMAN NEEDED | `KanbanBoard.tsx`: `onDragEnd` calls `useUpdateLeadStatus.mutate`; `useLeads.ts`: full cancel/snapshot/rollback pattern — browser interaction required to confirm behavior |
| 13 | Lead cards show name, event date, budget, and source badge | VERIFIED | `LeadCard.tsx`: name, `formatEventDate`, `budgetFormatter.format`, `SourceBadge` all rendered |
| 14 | Board/List view toggle persists filters | VERIFIED | `PipelinePage.tsx`: single `filters` state shared between `KanbanBoard` and `ListView` |
| 15 | List view is sortable with source badges and responsive column hiding | VERIFIED | `ListView.tsx`: TanStack Table with `getSortedRowModel`, `SourceBadge`, mobile visibility `{ email: false, phone: false }` |
| 16 | William can create a lead from a form with validation | VERIFIED | `LeadForm.tsx`: Prenom/Nom split with required validation, all fields present, `useCreateLead` mutation, navigates to new lead |
| 17 | Inline field edits auto-save on blur or Enter | HUMAN NEEDED | `InlineField.tsx`: `onBlur={handleSave}`, Enter key handler, Escape cancel — browser interaction required |
| 18 | Notes appear in activity timeline | HUMAN NEEDED | `NoteInput.tsx` calls `useCreateNote` → invalidates `['activities', leadId]`; `ActivityTimeline` re-renders — requires live state |
| 19 | Activity timeline shows color-coded chronological entries | VERIFIED | `ActivityTimeline.tsx`: `ACTIVITY_TYPE_LABELS` icon/color mapping, `formatDistanceToNow` fr locale, status_change metadata rendered |
| 20 | Delete lead shows confirmation dialog and redirects to pipeline | VERIFIED | `LeadDetailPage.tsx`: `AlertDialog` with "Supprimer ce lead ?", `useDeleteLead` on confirm, `navigate('/pipeline')` on success |
| 21 | Express serves built SPA in production with SPA catch-all | VERIFIED | `app.ts`: `express.static(clientDist)` + `app.get('*', ensureAuthenticated, sendFile index.html)` in production |
| 22 | Docker multi-stage build produces single image with backend + frontend | VERIFIED | `Dockerfile`: 3 stages (backend-builder, frontend-builder, production) with `COPY --from=frontend-builder /app/client/dist ./client/dist` |
| 23 | Mobile responsiveness: sidebar hamburger, horizontal Kanban scroll, stacked detail | HUMAN NEEDED | `overflow-x-auto` on Kanban container, `lg:grid-cols-2` on detail — visual verification required |

**Score:** 19/22 truths verified automatically; 4 items require human verification (browser-only behaviors)

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `client/vite.config.ts` | VERIFIED | react + tailwindcss plugins, @/@shared path aliases, /api + /auth proxy |
| `client/src/lib/api.ts` | VERIFIED | `apiFetch<T>`, `credentials: 'include'`, 401 redirect, French error messages |
| `client/src/lib/constants.ts` | VERIFIED | 6 PIPELINE_STAGES, SOURCE_BADGES, 8 ACTIVITY_TYPE_LABELS with French labels |
| `client/src/components/layout/AppLayout.tsx` | VERIFIED | Desktop sidebar + mobile Sheet/hamburger, Outlet |
| `client/src/components/layout/Sidebar.tsx` | VERIFIED | NavLink with active state, Pipeline nav item |
| `client/src/App.tsx` | VERIFIED | Routes: /, /pipeline, /leads/new (before :id), /leads/:id — all real components |
| `src/routes/api/leads.ts` | VERIFIED | Full CRUD (GET/POST/PATCH/DELETE), Zod validation, status_change activity creation, 204 cascade delete |
| `src/routes/api/activities.ts` | VERIFIED | GET chronological + POST note_added |
| `src/db/schema.ts` | VERIFIED | `budget: integer('budget')` present at line 43 |
| `tests/api/leads.test.ts` | VERIFIED | 10 tests — all passing |
| `tests/api/activities.test.ts` | VERIFIED | 5 tests — all passing |
| `client/src/hooks/useLeads.ts` | VERIFIED | useLeads, useCreateLead, useUpdateLead, useUpdateLeadStatus (optimistic), useDeleteLead |
| `client/src/hooks/useActivities.ts` | VERIFIED | useActivities, useCreateNote |
| `client/src/components/pipeline/KanbanBoard.tsx` | VERIFIED | DndContext, 6 columns, PointerSensor+TouchSensor, DragOverlay, onDragEnd calls useUpdateLeadStatus |
| `client/src/components/pipeline/KanbanColumn.tsx` | VERIFIED | useDroppable, SortableContext, empty state "Aucun lead", fixed 280px width |
| `client/src/components/pipeline/LeadCard.tsx` | VERIFIED | name, event date (fr locale), budget (EUR formatter), SourceBadge, draggable props |
| `client/src/components/pipeline/ListView.tsx` | VERIFIED | TanStack Table, sortable headers, SourceBadge, responsive column visibility |
| `client/src/components/common/FilterBar.tsx` | VERIFIED | Status + source selects + Du/Au date inputs, `onFiltersChange` prop |
| `client/src/components/common/ViewToggle.tsx` | VERIFIED | Board/List toggle (confirmed by PipelinePage import and use) |
| `client/src/components/leads/SourceBadge.tsx` | VERIFIED | Used in LeadCard and ListView |
| `client/src/components/leads/InlineField.tsx` | VERIFIED | click-to-edit, blur/Enter save, Escape cancel, text/email/tel/date/number/textarea/select types |
| `client/src/components/leads/LeadDetail.tsx` | VERIFIED | Two-column lg:grid-cols-2, Prenom/Nom split, all InlineFields, ActivityTimeline + NoteInput |
| `client/src/components/leads/ActivityTimeline.tsx` | VERIFIED | Icon map, color-coded, formatDistanceToNow fr, status_change metadata, empty state |
| `client/src/components/leads/NoteInput.tsx` | VERIFIED | Textarea + "Ajouter" button, useCreateNote, disabled when empty or pending |
| `client/src/components/leads/LeadForm.tsx` | VERIFIED | Prenom/Nom split, all fields, parseInt budget, source select default "manuel", useCreateLead |
| `client/src/pages/PipelinePage.tsx` | VERIFIED | view state, filters state, KanbanBoard/ListView switch, FilterBar, ViewToggle, "Nouveau lead" button |
| `client/src/pages/LeadDetailPage.tsx` | VERIFIED | useParams, AlertDialog delete flow, navigate to pipeline on success, "Lead non trouve" fallback |
| `client/src/pages/LeadFormPage.tsx` | VERIFIED | Back link + title + LeadForm |
| `src/app.ts` | VERIFIED | leadsRouter at /api/leads, activitiesRouter at /api, express.static + catch-all in production |
| `Dockerfile` | VERIFIED | 3-stage build, client/dist copied to production image |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `client/src/lib/api.ts` | `/api/*` | Vite proxy (dev) / Express static (prod) | VERIFIED | `fetch(url, { credentials: 'include' })` — proxy in vite.config.ts, static in app.ts |
| `client/src/hooks/useLeads.ts` | `/api/leads` | `apiFetch` from lib/api.ts | VERIFIED | `apiFetch<Lead[]>('/leads...')`, `apiFetch<Lead>('/leads/${id}', ...)` |
| `client/src/components/pipeline/KanbanBoard.tsx` | `useLeads.ts` | `useUpdateLeadStatus` mutation with optimistic update | VERIFIED | `onMutate: cancelQueries → snapshot → setQueriesData`, `onError: rollback`, `onSettled: invalidate` |
| `client/src/components/leads/InlineField.tsx` | `useLeads.ts` | `useUpdateLead` mutation on save | VERIFIED | `LeadDetail.tsx` passes `onSave={(v) => handleSave(field, v)}` which calls `updateLead.mutate(...)` |
| `client/src/components/leads/NoteInput.tsx` | `/api/leads/:id/notes` | `useCreateNote` mutation | VERIFIED | `apiFetch<Activity>('/leads/${leadId}/notes', { method: 'POST', ... })` |
| `client/src/components/leads/ActivityTimeline.tsx` | `/api/leads/:id/activities` | `useActivities` query | VERIFIED | `apiFetch<Activity[]>('/leads/${leadId}/activities')` with query key `['activities', leadId]` |
| `src/routes/api/leads.ts` | `src/db/schema.ts` | Drizzle ORM | VERIFIED | `getDb().select().from(leads)`, `getDb().insert(activities)` etc. |
| `src/app.ts` | `src/routes/api/leads.ts` | Express router mount | VERIFIED | `app.use('/api/leads', leadsRouter)` at line 54 |
| `src/app.ts` | `client/dist/index.html` | express.static + SPA catch-all | VERIFIED | `res.sendFile(path.join(clientDist, 'index.html'))` at line 62 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LEAD-01 | 02-02, 02-04 | Create lead manually with name, email, phone, event date, source, notes | SATISFIED | `POST /api/leads` + `LeadForm.tsx` with all fields |
| LEAD-02 | 02-02, 02-03 | View list of all leads with filters by status, date range, source | SATISFIED | `GET /api/leads` with filter params + `ListView.tsx` + `FilterBar.tsx` |
| LEAD-03 | 02-03 | View leads in Kanban board with drag-and-drop between stages | SATISFIED | `KanbanBoard.tsx` with dnd-kit, 6 columns always visible |
| LEAD-04 | 02-02, 02-04 | Edit any lead's fields (name, email, phone, event date, notes) | SATISFIED | `PATCH /api/leads/:id` + `InlineField.tsx` in `LeadDetail.tsx` |
| LEAD-05 | 02-02, 02-04 | Delete a lead | SATISFIED | `DELETE /api/leads/:id` + `AlertDialog` in `LeadDetailPage.tsx` |
| LEAD-06 | 02-02, 02-03 | Assign status to a lead (6 stages) | SATISFIED | `PATCH /api/leads/:id` status field + Kanban drag + `InlineField` select |
| LEAD-07 | 02-02, 02-04 | Add timestamped notes to a lead | SATISFIED | `POST /api/leads/:id/notes` + `NoteInput.tsx` |
| LEAD-08 | 02-02, 02-04 | View chronological activity history per lead | SATISFIED | `GET /api/leads/:id/activities` (asc) + `ActivityTimeline.tsx` |
| LEAD-10 | 02-02, 02-03 | Each lead displays a source badge | SATISFIED | `SourceBadge.tsx` used in `LeadCard.tsx` and `ListView.tsx` |
| INFR-03 | 02-01, 02-05 | UI is responsive and usable on mobile | PARTIALLY VERIFIED | Code present: `hidden md:flex` sidebar, `overflow-x-auto` Kanban, `lg:grid-cols-2` detail — visual confirmation human-needed |

**Note on LEAD-09 (duplicate detection) and LEAD-11 (vCard):** Both are mapped to Phase 1 in REQUIREMENTS.md and were NOT claimed by any Phase 2 plan. Correctly excluded from this phase. No orphaned requirements.

---

### Anti-Patterns Found

No blockers or warnings found.

A minor note: `InlineField.tsx` uses `parseFloat` (line 49) for the number type, while `LeadForm.tsx` correctly uses `parseInt` (per the 02-05 fix). This inconsistency means editing a budget field inline could theoretically submit a decimal to the backend (which validates `z.number().int()`). The backend will reject decimals with a 400 error, which is caught and toasted, so it does not silently corrupt data — severity is informational.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `client/src/components/leads/InlineField.tsx` | 49 | `parseFloat` used for number type (inconsistent with `parseInt` in LeadForm) | Info | Backend rejects decimals with 400; no data corruption |

---

### Human Verification Required

#### 1. Kanban Drag-and-Drop with Optimistic Update

**Test:** Open the pipeline board. Drag a lead card from "Nouveau" to "Contacte".
**Expected:** Card moves to the target column instantly (before server responds). Lead count badges update. On page refresh, lead is still in "Contacte". If network request fails, card snaps back to original column with error toast "Erreur lors du changement de statut".
**Why human:** dnd-kit pointer/touch events and TanStack Query cache manipulation require a live browser.

#### 2. InlineField Click-to-Edit

**Test:** Open a lead detail page. Click on the "Email" field. Change the value. Press Enter (and separately test: click away / press Escape).
**Expected:** Enter/blur: field reverts to display mode, shows toast "Modifications enregistrees". Escape: field reverts to original value without saving.
**Why human:** focus management, keyboard events, and blur behavior require browser interaction.

#### 3. Note Creation and Timeline Refresh

**Test:** On a lead detail page, type a note in the right column textarea and click "Ajouter".
**Expected:** "Note ajoutee" toast appears, textarea clears, the note appears at the bottom of the ActivityTimeline with a relative timestamp in French (e.g., "il y a moins d'une minute").
**Why human:** TanStack Query invalidation and React re-render require live browser state.

#### 4. Mobile Responsive Layout

**Test:** Open Chrome DevTools, enable device toolbar with a 375px wide viewport. Visit /pipeline and /leads/:id.
**Expected:**
- Sidebar hidden; top bar shows "Weds CRM" + hamburger icon.
- Tapping hamburger opens a Sheet with the nav.
- Kanban board scrolls horizontally (6 columns visible by scrolling).
- Lead detail fields and timeline stack vertically (single column).
**Why human:** CSS responsive breakpoints and Sheet open/close behavior require visual verification.

---

### Build Verification

- `npx vitest run tests/api/leads.test.ts tests/api/activities.test.ts` — **15/15 tests passed**
- `cd client && npx vite build` — **succeeded** (built in 2.03s, no TypeScript errors)

---

### Summary

Phase 02 has achieved its goal. All 22 automated must-haves are verified in the actual codebase — not just claimed in SUMMARY.md. The implementation is complete and substantive:

- The full REST API (CRUD + activities + notes) is implemented, tested, and mounted in Express.
- The React SPA is scaffolded with all required dependencies, proxy, and routing.
- The pipeline page delivers both Kanban (dnd-kit, 6 columns, optimistic updates) and List view (TanStack Table, sortable, responsive).
- The lead detail page delivers inline editing, activity timeline, note input, and delete flow.
- Production wiring is complete: Express serves the built SPA with OAuth-protected catch-all.
- Docker multi-stage build ships backend + frontend as one image.

The 4 human-verification items are all browser-interaction behaviors (drag-and-drop, keyboard events, real-time query refresh, responsive CSS) that cannot be confirmed by static code analysis. The code for each is substantive and correctly wired — these items are flagged for human confirmation, not because there is doubt about correctness.

The one informational note (`parseFloat` vs `parseInt` in InlineField) does not block functionality.

All 10 requirement IDs claimed by Phase 2 plans (LEAD-01 through LEAD-08, LEAD-10, INFR-03) are satisfied. No Phase 2 requirements are orphaned.

---

_Verified: 2026-03-10T19:22:00Z_
_Verifier: Claude (gsd-verifier)_
