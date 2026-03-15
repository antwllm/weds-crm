# Phase 2: Lead Management UI - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

William can manage his entire pipeline from one screen — viewing all leads in a Kanban board or list view, dragging them between stages, creating leads manually, editing their details, adding notes, and reading the full interaction history — entirely in French. Responsive on mobile.

</domain>

<decisions>
## Implementation Decisions

### Frontend Stack
- React SPA with Vite, inside a /client folder in the existing monorepo
- Tailwind CSS for styling
- shadcn/ui component library (Radix UI primitives + Tailwind)
- Shared TypeScript types between Express backend and React frontend
- Vite dev server proxies API calls to Express during development
- Single Docker build for production

### Pipeline Board (Kanban)
- Compact cards: name (prénom nom), event date, budget, source badge
- Budget field to be added to leads table (new numeric field)
- All 6 columns always visible: Nouveau → Contacté → RDV → Devis envoyé → Signé → Perdu
- Drag-and-drop: instant move, no confirmation dialog — status updates in background
- Board/List toggle buttons at the top of the pipeline page — same URL, filters persist across views

### Lead Detail Page
- Full page navigation (dedicated /leads/:id route) — not a slide-over or modal
- Two-column layout: editable fields on left, activity timeline + notes input on right
- Inline editing: click a field to edit in place, auto-saves on blur or Enter (Notion-style)
- Activity timeline: all types together (emails, notes, status changes) in chronological order, color-coded by type

### App Layout & Navigation
- Left sidebar with nav items (Pipeline, etc.) + main content area — classic CRM layout, extensible for Phase 3/4
- Sidebar collapses to hamburger menu on mobile
- Kanban board adapts to horizontal scroll between columns on mobile (swipe left/right)

### Claude's Discretion
- Drag-and-drop library choice (dnd-kit, react-beautiful-dnd, etc.)
- React Router setup and route structure
- State management approach (React Query, Zustand, context, etc.)
- Exact color scheme and visual design within Tailwind/shadcn defaults
- Loading states and skeleton designs
- Error state handling and toast notification library
- List view table implementation details (sorting, pagination)
- "Nouveau lead" form fields and validation approach
- Lead deletion flow (confirmation dialog)

</decisions>

<specifics>
## Specific Ideas

- Cards should be compact — name + event date + budget + source badge. Maximum leads visible per column.
- Inline editing like Notion properties — no separate "edit mode"
- All 6 pipeline stages always visible even when empty, so William sees the full funnel shape at a glance

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/db/schema.ts`: leads table with status enum (nouveau→perdu), activities table with type enum — ready for API queries
- `src/types.ts`: Lead, Activity, NewLead, NewActivity TypeScript types inferred from Drizzle schema — shareable with frontend
- `src/auth/middleware.ts`: ensureAuthenticated middleware — protects API routes

### Established Patterns
- Express + Drizzle ORM + PostgreSQL — API routes will follow existing route patterns (src/routes/)
- Session-based auth with Passport Google OAuth — frontend needs to work with cookie-based sessions
- Zod for validation (used in config) — can extend to API input validation

### Integration Points
- `src/app.ts`: Express app needs to serve React static files in production and add API routes for leads CRUD
- `src/db/schema.ts`: Budget field needs to be added to leads table
- New API routes needed: /api/leads (CRUD), /api/leads/:id/notes, /api/leads/:id/activities

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-lead-management-ui*
*Context gathered: 2026-03-10*
