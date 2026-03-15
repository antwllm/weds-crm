# Phase 2: Lead Management UI - Research

**Researched:** 2026-03-10
**Domain:** React SPA with Kanban board, list view, lead CRUD, activity timeline
**Confidence:** HIGH

## Summary

Phase 2 adds a React SPA frontend to the existing Express + Drizzle + PostgreSQL backend. The user (William) has locked the stack: React with Vite, Tailwind CSS, and shadcn/ui. The frontend lives in `/client` within the monorepo, sharing TypeScript types with the backend. The Vite dev server proxies API calls to Express on port 8082; in production, Express serves the built static files directly.

The core UI features are a Kanban pipeline board with drag-and-drop between 6 columns, a filterable list view with the same data, a full-page lead detail view with inline editing and activity timeline, and a manual lead creation form. All UI text must be in French. The app must be responsive on mobile.

**Primary recommendation:** Use @dnd-kit for drag-and-drop (modern, well-maintained, excellent for Kanban multi-container patterns), TanStack Query v5 for server state management, React Router v7 in library mode for client-side routing, and Sonner (via shadcn/ui) for toast notifications.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- React SPA with Vite, inside a /client folder in the existing monorepo
- Tailwind CSS for styling
- shadcn/ui component library (Radix UI primitives + Tailwind)
- Shared TypeScript types between Express backend and React frontend
- Vite dev server proxies API calls to Express during development
- Single Docker build for production
- Compact cards: name (prenom nom), event date, budget, source badge
- Budget field to be added to leads table (new numeric field)
- All 6 columns always visible: Nouveau, Contacte, RDV, Devis envoye, Signe, Perdu
- Drag-and-drop: instant move, no confirmation dialog -- status updates in background
- Board/List toggle buttons at top -- same URL, filters persist across views
- Lead detail: full page navigation at /leads/:id (not modal/slide-over)
- Two-column layout: editable fields on left, activity timeline + notes input on right
- Inline editing: click to edit, auto-saves on blur or Enter (Notion-style)
- Activity timeline: all types together, chronological, color-coded by type
- Left sidebar nav + main content area (classic CRM layout, extensible)
- Sidebar collapses to hamburger on mobile
- Kanban horizontal scroll on mobile

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

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEAD-01 | Manual lead creation with name, email, phone, event date, source, notes | shadcn/ui form components + Zod validation; budget field migration |
| LEAD-02 | List view with filters by status, date range, source | TanStack Table + shadcn DataTable; server-side filtering API |
| LEAD-03 | Kanban board with drag-and-drop between pipeline stages | @dnd-kit sortable containers pattern; optimistic updates via TanStack Query |
| LEAD-04 | Edit any lead field (name, email, phone, event date, notes) | Inline editing pattern with auto-save on blur; PATCH API endpoint |
| LEAD-05 | Delete a lead | shadcn AlertDialog for confirmation; DELETE API endpoint |
| LEAD-06 | Assign status to lead (6 stages) | Kanban drag or manual select; status enum already in schema |
| LEAD-07 | Add timestamped notes to a lead | Notes input on detail page; POST /api/leads/:id/notes; creates activity |
| LEAD-08 | View chronological activity history per lead | Activity timeline component; GET /api/leads/:id/activities; color-coded by type |
| LEAD-10 | Source badge on each lead | Badge component from shadcn/ui with color mapping per source |
| INFR-03 | UI responsive and usable on mobile | Tailwind responsive classes; sidebar hamburger; Kanban horizontal scroll |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^18 | UI framework | Locked decision |
| react-dom | ^18 | DOM rendering | Required with React |
| vite | ^6 | Build tool + dev server | Locked decision; fast HMR, proxy support |
| tailwindcss | ^4 | Utility-first CSS | Locked decision |
| @tailwindcss/vite | ^4 | Tailwind Vite plugin | Required for Tailwind v4 + Vite integration |
| shadcn/ui | latest CLI | Component library (Radix + Tailwind) | Locked decision; copy-paste components |
| @dnd-kit/core | ^6.3 | Drag-and-drop primitives | Best DnD library for Kanban multi-container patterns |
| @dnd-kit/sortable | ^10.0 | Sortable preset for dnd-kit | Provides useSortable hook for items within/across columns |
| @dnd-kit/utilities | ^3.2 | CSS transform utilities | Helper for drag transform styles |
| @tanstack/react-query | ^5.90 | Server state management | Industry standard for async state; caching, optimistic updates, mutations |
| @tanstack/react-table | ^8 | Headless table logic | Powers shadcn/ui DataTable; sorting, filtering, pagination |
| react-router | ^7 | Client-side routing | Latest stable; library mode for SPA |
| react-router-dom | ^7 | DOM bindings for React Router | BrowserRouter, Link, etc. |
| zod | ^4 (shared) | Schema validation | Already in backend; share validation schemas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2 | Toast notifications | Success/error feedback on mutations (shadcn/ui default) |
| @tanstack/react-query-devtools | ^5 | Query debugging | Development only; inspect cache, queries |
| lucide-react | latest | Icon library | shadcn/ui default icon set |
| date-fns | ^4 | Date formatting/parsing | French locale date display; event date formatting |
| clsx + tailwind-merge | latest | Class merging utility | shadcn/ui cn() helper dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit | @hello-pangea/dnd | Pangea is higher-level (easier Kanban setup) but less flexible, less actively maintained |
| @dnd-kit | react-beautiful-dnd | Deprecated by Atlassian; @hello-pangea/dnd is its successor |
| TanStack Query | Zustand + fetch | TanStack Query handles caching, deduplication, optimistic updates out of the box |
| TanStack Table | Manual table | TanStack Table handles sorting, filtering, pagination with shadcn/ui integration |
| react-router v7 | TanStack Router | React Router is simpler for this use case; no need for file-based routing |

**Installation (client/):**
```bash
npm create vite@latest client -- --template react-ts
cd client
npm install react-router react-router-dom @tanstack/react-query @tanstack/react-table @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities sonner lucide-react date-fns zod
npm install -D @tailwindcss/vite @tanstack/react-query-devtools @types/react @types/react-dom
npx shadcn@latest init
```

## Architecture Patterns

### Recommended Project Structure
```
client/
├── index.html
├── vite.config.ts           # Proxy /api to Express, path aliases
├── tsconfig.json             # Extends shared types
├── components.json           # shadcn/ui config
├── src/
│   ├── main.tsx              # BrowserRouter + QueryClientProvider + App
│   ├── App.tsx               # Route definitions
│   ├── components/
│   │   ├── ui/               # shadcn/ui generated components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx   # Left nav sidebar
│   │   │   └── AppLayout.tsx # Sidebar + main content wrapper
│   │   ├── pipeline/
│   │   │   ├── KanbanBoard.tsx    # DndContext + columns
│   │   │   ├── KanbanColumn.tsx   # SortableContext + droppable
│   │   │   ├── LeadCard.tsx       # Compact draggable card
│   │   │   └── ListView.tsx       # TanStack Table data table
│   │   ├── leads/
│   │   │   ├── LeadDetail.tsx     # Two-column detail page
│   │   │   ├── LeadForm.tsx       # Create/edit form fields
│   │   │   ├── InlineField.tsx    # Click-to-edit field component
│   │   │   ├── ActivityTimeline.tsx
│   │   │   ├── NoteInput.tsx
│   │   │   └── SourceBadge.tsx
│   │   └── common/
│   │       ├── FilterBar.tsx
│   │       └── ViewToggle.tsx
│   ├── hooks/
│   │   ├── useLeads.ts       # TanStack Query hooks for leads CRUD
│   │   ├── useActivities.ts  # TanStack Query hooks for activities
│   │   └── useDragAndDrop.ts # Kanban DnD logic encapsulation
│   ├── lib/
│   │   ├── api.ts            # Fetch wrapper with credentials: 'include'
│   │   ├── utils.ts          # cn() helper from shadcn
│   │   └── constants.ts      # Pipeline stages, French labels
│   └── types/
│       └── index.ts          # Re-exports from shared types or local types
src/                          # Existing Express backend
├── routes/
│   ├── api/
│   │   ├── leads.ts          # CRUD: GET, POST, PATCH, DELETE /api/leads
│   │   └── activities.ts     # GET /api/leads/:id/activities, POST notes
│   └── ...existing routes
├── app.ts                    # Updated: serve client/dist in production
└── db/schema.ts              # Updated: budget field added
```

### Pattern 1: Vite Proxy for Development
**What:** Vite dev server proxies `/api` requests to Express backend
**When to use:** During development, frontend on port 5173, backend on port 8082
**Example:**
```typescript
// client/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
    },
  },
});
```

### Pattern 2: Express Serves Static Files in Production
**What:** Express serves the built React app as static files and falls back to index.html for SPA routing
**When to use:** Production build in Docker
**Example:**
```typescript
// In src/app.ts (production)
import path from 'path';
import express from 'express';

// After API routes, serve static frontend
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}
```

### Pattern 3: TanStack Query with Cookie-Based Auth
**What:** All API calls use `credentials: 'include'` so session cookies are sent automatically
**When to use:** Every API call from the frontend
**Example:**
```typescript
// client/src/lib/api.ts
const API_BASE = '/api';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    window.location.href = '/auth/google';
    throw new Error('Non authentifie');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(error.error || `Erreur ${res.status}`);
  }

  return res.json();
}
```

### Pattern 4: Optimistic Kanban Drag-and-Drop
**What:** When a card is dropped in a new column, update UI instantly and sync in background
**When to use:** Status changes via drag-and-drop
**Example:**
```typescript
// client/src/hooks/useLeads.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, status }: { leadId: number; status: string }) =>
      apiFetch(`/leads/${leadId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onMutate: async ({ leadId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['leads'] });
      const previous = queryClient.getQueryData(['leads']);

      queryClient.setQueryData(['leads'], (old: Lead[]) =>
        old.map((lead) => (lead.id === leadId ? { ...lead, status } : lead))
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['leads'], context?.previous);
      toast.error('Erreur lors du changement de statut');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
```

### Pattern 5: dnd-kit Multi-Container Kanban
**What:** DndContext with multiple SortableContext containers for Kanban columns
**When to use:** Pipeline board with cards draggable between columns
**Example:**
```typescript
// Kanban board skeleton
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

function KanbanBoard({ leads }: { leads: Lead[] }) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const updateStatus = useUpdateLeadStatus();

  const columns = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => l.status === stage.value),
  }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.data.current?.sortable?.containerId || over.id;
    const leadId = active.id as number;

    updateStatus.mutate({ leadId, status: newStatus as string });
    setActiveId(null);
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveId(active.id as number)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <KanbanColumn key={col.value} column={col} />
        ))}
      </div>
      <DragOverlay>
        {activeId ? <LeadCard lead={leads.find((l) => l.id === activeId)!} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### Pattern 6: Inline Editing (Notion-Style)
**What:** Click on a field to turn it into an input; saves on blur or Enter
**When to use:** Lead detail page field editing
**Example:**
```typescript
function InlineField({ value, onSave, label }: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function handleSave() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  if (!editing) {
    return (
      <div onClick={() => setEditing(true)} className="cursor-pointer hover:bg-muted rounded px-2 py-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <p>{value || '—'}</p>
      </div>
    );
  }

  return (
    <Input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
    />
  );
}
```

### Anti-Patterns to Avoid
- **Storing server data in local state:** Use TanStack Query as the single source of truth for leads data. Never copy query data into useState.
- **Blocking DnD on server response:** Always do optimistic updates for drag-and-drop. Waiting for the server makes the UI feel sluggish.
- **Separate API client per component:** Create one shared `apiFetch` wrapper; do not scatter fetch calls with different credential handling.
- **Hardcoded French strings in components:** Centralize all French labels in a constants file for consistency and future i18n.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop | Custom mouse/touch event handlers | @dnd-kit | Accessibility (keyboard DnD), touch support, collision detection |
| Data table | Custom table with sort/filter | TanStack Table + shadcn DataTable | Sorting, filtering, pagination, column visibility |
| Toast notifications | Custom notification system | Sonner (shadcn/ui integrated) | Positioning, animations, auto-dismiss, accessibility |
| Form validation | Manual if/else validation | Zod schemas | Already used in backend; share validation logic |
| Date formatting | Manual date string manipulation | date-fns with fr locale | French date formatting, relative dates, edge cases |
| Component primitives | Custom dialog/dropdown/select | shadcn/ui (Radix) | Accessibility, keyboard navigation, focus management |
| Server state caching | Manual cache with useState/useEffect | TanStack Query | Deduplication, background refetch, optimistic updates, cache invalidation |

**Key insight:** This is a single-user CRM -- simplicity beats over-engineering. No need for WebSocket real-time sync, complex global state, or elaborate caching strategies. TanStack Query's defaults handle everything.

## Common Pitfalls

### Pitfall 1: Vite Proxy Not Working with Cookie Auth
**What goes wrong:** API calls from Vite dev server don't include session cookies, resulting in 401s.
**Why it happens:** Browser blocks cookies on cross-origin requests; Vite proxy must be configured correctly.
**How to avoid:** Set `credentials: 'include'` on every fetch. The Vite proxy handles the origin mismatch. Ensure `cookie.secure` is false in development (already handled in existing app.ts).
**Warning signs:** 401 errors on API calls from the frontend during development.

### Pitfall 2: SPA Routing 404 on Refresh
**What goes wrong:** Navigating to `/leads/5` and refreshing returns 404 because Express has no route for it.
**Why it happens:** Express tries to match `/leads/5` as an API route instead of serving index.html.
**How to avoid:** Add a catch-all `app.get('*', ...)` that serves index.html AFTER all API routes in production. During dev, Vite handles this natively.
**Warning signs:** Direct URL access or page refresh returns 404 or blank page.

### Pitfall 3: Drag-and-Drop Breaking on Mobile
**What goes wrong:** Touch drag doesn't work or conflicts with scroll.
**Why it happens:** dnd-kit needs explicit touch sensor configuration and activation constraints.
**How to avoid:** Use `PointerSensor` with `activationConstraint: { distance: 8 }` to distinguish between tap/scroll and drag intent. Add `TouchSensor` as a fallback.
**Warning signs:** Cards don't drag on mobile, or page scrolls instead of dragging.

### Pitfall 4: Optimistic Update Cache Shape Mismatch
**What goes wrong:** Optimistic update corrupts the query cache, causing UI glitches.
**Why it happens:** The cache shape doesn't match what the optimistic update function expects (e.g., paginated response vs. flat array).
**How to avoid:** Keep the leads query shape simple (flat array for Kanban). If using pagination in list view, use a separate query key.
**Warning signs:** Cards disappear briefly after drag, or list view shows stale data after status change.

### Pitfall 5: shadcn/ui Init in Subdirectory
**What goes wrong:** shadcn CLI can't find the correct config when run from /client subdirectory.
**Why it happens:** shadcn looks for tsconfig.json and tailwind config in specific locations.
**How to avoid:** Run `npx shadcn@latest init` from inside the `client/` directory. Ensure `components.json` is created in `client/` with correct paths. The `@` alias must resolve correctly in both tsconfig.json and vite.config.ts.
**Warning signs:** Component installation fails or imports break.

### Pitfall 6: Budget Field Migration
**What goes wrong:** Adding budget field to leads table without a migration causes schema drift.
**Why it happens:** Drizzle push might not handle existing data correctly.
**How to avoid:** Add the budget field as `integer('budget')` (nullable) to the leads table in schema.ts. Run `npm run db:push` to apply. Nullable ensures existing leads aren't affected.
**Warning signs:** Drizzle push errors or existing lead data lost.

## Code Examples

### API Route Pattern (Express + Drizzle)
```typescript
// src/routes/api/leads.ts
import { Router } from 'express';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { leads, activities } from '../../db/schema.js';
import { ensureAuthenticated } from '../../auth/middleware.js';

const router = Router();

// All routes require authentication
router.use(ensureAuthenticated);

// GET /api/leads - List with optional filters
router.get('/', async (req, res) => {
  const db = getDb();
  const { status, source, dateFrom, dateTo } = req.query;

  const conditions = [];
  if (status) conditions.push(eq(leads.status, status as string));
  if (source) conditions.push(eq(leads.source, source as string));
  // Add date range filters as needed

  const result = await db
    .select()
    .from(leads)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(leads.createdAt));

  res.json(result);
});

// POST /api/leads - Create lead
router.post('/', async (req, res) => {
  const db = getDb();
  const [lead] = await db.insert(leads).values(req.body).returning();

  // Log activity
  await db.insert(activities).values({
    leadId: lead.id,
    type: 'status_change',
    content: 'Lead cree manuellement',
    metadata: { from: null, to: 'nouveau' },
  });

  res.status(201).json(lead);
});

// PATCH /api/leads/:id - Update lead fields
router.patch('/:id', async (req, res) => {
  const db = getDb();
  const id = parseInt(req.params.id);
  const [updated] = await db
    .update(leads)
    .set({ ...req.body, updatedAt: new Date() })
    .where(eq(leads.id, id))
    .returning();

  res.json(updated);
});

export default router;
```

### French Labels Constants
```typescript
// client/src/lib/constants.ts
export const PIPELINE_STAGES = [
  { value: 'nouveau', label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacte', label: 'Contacte', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'rdv', label: 'RDV', color: 'bg-purple-100 text-purple-800' },
  { value: 'devis_envoye', label: 'Devis envoye', color: 'bg-orange-100 text-orange-800' },
  { value: 'signe', label: 'Signe', color: 'bg-green-100 text-green-800' },
  { value: 'perdu', label: 'Perdu', color: 'bg-red-100 text-red-800' },
] as const;

export const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
  'mariages.net': { label: 'Mariages.net', color: 'bg-pink-100 text-pink-800' },
  manual: { label: 'Manuel', color: 'bg-gray-100 text-gray-800' },
};

export const ACTIVITY_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  email_received: { label: 'Email recu', color: 'text-blue-600', icon: 'Mail' },
  email_sent: { label: 'Email envoye', color: 'text-green-600', icon: 'Send' },
  sms_sent: { label: 'SMS envoye', color: 'text-purple-600', icon: 'MessageSquare' },
  status_change: { label: 'Changement de statut', color: 'text-orange-600', icon: 'ArrowRight' },
  note_added: { label: 'Note ajoutee', color: 'text-gray-600', icon: 'StickyNote' },
  duplicate_inquiry: { label: 'Demande doublon', color: 'text-yellow-600', icon: 'Copy' },
};
```

### Shared Types Pattern
```typescript
// src/types.ts (already exists -- add API response types)
// These types are importable by both backend and frontend via path alias

export interface LeadFilters {
  status?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateLeadRequest {
  name: string;
  email?: string;
  phone?: string;
  eventDate?: string;
  source?: string;
  budget?: number;
  message?: string;
}

export interface UpdateLeadRequest {
  name?: string;
  email?: string;
  phone?: string;
  eventDate?: string;
  status?: string;
  budget?: number;
  message?: string;
}

export interface CreateNoteRequest {
  content: string;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit or @hello-pangea/dnd | 2022 (Atlassian deprecated rbd) | Must use modern alternatives |
| Create React App | Vite | 2023+ | CRA is dead; Vite is the standard |
| react-router v5/v6 | react-router v7 (library mode) | 2024-2025 | v7 merges Remix; library mode for SPAs |
| Custom toast systems | Sonner (shadcn default) | 2024 | shadcn deprecated their own Toast in favor of Sonner |
| useState + useEffect for server data | TanStack Query v5 | 2023+ | No manual loading/error states; automatic caching |
| Tailwind v3 config | Tailwind v4 + @tailwindcss/vite | 2025 | No more tailwind.config.js; CSS-first config |

**Deprecated/outdated:**
- react-beautiful-dnd: Deprecated by Atlassian; @hello-pangea/dnd is the community fork
- shadcn/ui Toast component: Deprecated in favor of Sonner integration
- Create React App: No longer maintained; use Vite
- Tailwind v3 config approach: Tailwind v4 uses CSS-based config and Vite plugin

## Open Questions

1. **Shared TypeScript types between client and backend**
   - What we know: Both use TypeScript. Backend types are in `src/types.ts`.
   - What's unclear: Best approach for sharing types in a monorepo without a build step -- path alias in client tsconfig vs. symlink vs. shared package.
   - Recommendation: Use a TypeScript path alias in client tsconfig pointing to `../src/types.ts`. Simple, no extra build step, works with Vite.

2. **Tailwind v4 vs v3 for shadcn/ui**
   - What we know: Tailwind v4 is current but shadcn/ui was originally built for v3.
   - What's unclear: Whether all shadcn/ui components work seamlessly with Tailwind v4's new CSS-first config.
   - Recommendation: Use Tailwind v4 with `@tailwindcss/vite` plugin. shadcn/ui v2+ supports Tailwind v4. If issues arise, fall back to v3.

3. **Docker build for monorepo with client/**
   - What we know: Current Dockerfile builds only the Express backend.
   - What's unclear: Exact multi-stage build approach for building both client and server.
   - Recommendation: Add a build stage for the client (npm run build in client/), then copy client/dist into the production image alongside the server dist.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (backend) + Vitest 4.x with jsdom (frontend) |
| Config file | `vitest.config.ts` (existing backend), `client/vitest.config.ts` (new for frontend) |
| Quick run command | `cd client && npx vitest run --reporter=verbose` |
| Full suite command | `npm test && cd client && npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEAD-01 | POST /api/leads creates lead and returns it | integration | `npx vitest run tests/api/leads.test.ts -t "create" -x` | No -- Wave 0 |
| LEAD-02 | GET /api/leads with filters returns filtered results | integration | `npx vitest run tests/api/leads.test.ts -t "filter" -x` | No -- Wave 0 |
| LEAD-03 | Kanban column renders leads grouped by status | unit | `cd client && npx vitest run src/__tests__/KanbanBoard.test.tsx -x` | No -- Wave 0 |
| LEAD-04 | PATCH /api/leads/:id updates fields | integration | `npx vitest run tests/api/leads.test.ts -t "update" -x` | No -- Wave 0 |
| LEAD-05 | DELETE /api/leads/:id removes lead | integration | `npx vitest run tests/api/leads.test.ts -t "delete" -x` | No -- Wave 0 |
| LEAD-06 | PATCH /api/leads/:id with status creates activity | integration | `npx vitest run tests/api/leads.test.ts -t "status" -x` | No -- Wave 0 |
| LEAD-07 | POST /api/leads/:id/notes creates note activity | integration | `npx vitest run tests/api/activities.test.ts -t "note" -x` | No -- Wave 0 |
| LEAD-08 | GET /api/leads/:id/activities returns chronological list | integration | `npx vitest run tests/api/activities.test.ts -t "history" -x` | No -- Wave 0 |
| LEAD-10 | Source badge renders for each source type | unit | `cd client && npx vitest run src/__tests__/SourceBadge.test.tsx -x` | No -- Wave 0 |
| INFR-03 | Responsive layout renders on small viewport | manual-only | Visual check on mobile viewport | N/A |

### Sampling Rate
- **Per task commit:** `npm test` (backend) + `cd client && npx vitest run` (frontend)
- **Per wave merge:** Full suite: `npm test && cd client && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/api/leads.test.ts` -- covers LEAD-01, LEAD-02, LEAD-04, LEAD-05, LEAD-06
- [ ] `tests/api/activities.test.ts` -- covers LEAD-07, LEAD-08
- [ ] `client/vitest.config.ts` -- frontend test config with jsdom environment
- [ ] `client/src/__tests__/KanbanBoard.test.tsx` -- covers LEAD-03
- [ ] `client/src/__tests__/SourceBadge.test.tsx` -- covers LEAD-10
- [ ] Framework install: `cd client && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Vite installation](https://ui.shadcn.com/docs/installation/vite) - Official setup guide
- [React Router v7 installation](https://reactrouter.com/start/library/installation) - Library mode for SPAs
- [TanStack Query v5](https://tanstack.com/query/latest) - Latest v5.90.x
- [@dnd-kit/core npm](https://www.npmjs.com/package/@dnd-kit/core) - v6.3.1
- [@dnd-kit/sortable npm](https://www.npmjs.com/package/@dnd-kit/sortable) - v10.0.0
- [shadcn/ui Sonner](https://ui.shadcn.com/docs/components/radix/sonner) - Toast notifications (replaces deprecated Toast)
- [shadcn/ui DataTable](https://ui.shadcn.com/docs/components/radix/data-table) - TanStack Table integration
- [Vite server proxy](https://vite.dev/config/server-options) - Dev proxy configuration

### Secondary (MEDIUM confidence)
- [dnd-kit Kanban tutorial (LogRocket)](https://blog.logrocket.com/build-kanban-board-dnd-kit-react/) - Multi-container Kanban pattern
- [dnd-kit Kanban with Tailwind (ITNEXT)](https://itnext.io/build-a-drag-and-drop-kanban-board-with-react-typescript-tailwind-dnd-kit-3cd6bcf32bd2) - React + TS + Tailwind implementation
- [React + Express + Vite same port](https://dev.to/herudi/single-port-spa-react-and-express-using-vite-same-port-in-dev-or-prod-2od4) - Production static serving pattern

### Tertiary (LOW confidence)
- Tailwind v4 + shadcn/ui full compatibility: Based on shadcn/ui docs claiming v4 support, but edge cases possible. Validated by multiple community articles.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are well-established, versions verified via npm
- Architecture: HIGH - Patterns are well-documented for React + Express monorepo SPAs
- Pitfalls: HIGH - Based on common issues documented across multiple sources
- Drag-and-drop: HIGH - @dnd-kit Kanban pattern well-documented with multiple tutorials
- Tailwind v4 compatibility: MEDIUM - Recent major version, shadcn/ui claims support

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable ecosystem, 30-day validity)
