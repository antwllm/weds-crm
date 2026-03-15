---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/components/leads/LeadDetail.tsx
  - client/src/components/leads/InlineField.tsx
  - client/src/components/leads/ActivityTimeline.tsx
  - client/src/components/pipeline/LeadCard.tsx
  - client/src/components/pipeline/ListView.tsx
  - client/src/pages/LeadDetailPage.tsx
  - client/src/lib/constants.ts
  - src/services/gmail.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "Editing first name in lead detail does not overwrite last name"
    - "Accented characters display correctly throughout the app"
    - "Budget displays with euro sign in lead detail"
    - "Lead statuses have distinct color-coded badges everywhere they appear"
    - "Source column is removed from pipeline table view and kanban cards"
    - "Activity history shows only last 3 items with expand button"
    - "Lead detail uses 2-column layout: compact sidebar left, tabbed content right"
  artifacts:
    - path: "client/src/components/leads/LeadDetail.tsx"
      provides: "Reorganized lead detail with sidebar + tabs layout, condensed fields, collapsed activity"
    - path: "client/src/components/pipeline/ListView.tsx"
      provides: "Table view without source column, with color-coded status badges"
    - path: "client/src/components/pipeline/LeadCard.tsx"
      provides: "Kanban card without source badge"
  key_links:
    - from: "client/src/components/leads/LeadDetail.tsx"
      to: "client/src/components/ui/tabs.tsx"
      via: "Tabs, TabsList, TabsTrigger, TabsContent imports"
      pattern: "import.*Tabs.*from.*ui/tabs"
---

<objective>
Execute all 8 pending todos in a single plan: fix firstname bug, fix accent encoding, add euro to budget, color-code statuses, remove source column, collapse activity history, condense lead info, and reorganize lead detail layout.

Purpose: Address all accumulated UI/UX issues and one data bug to improve the CRM experience.
Output: Updated components with all 8 fixes applied.
</objective>

<execution_context>
@/Users/william/.claude/get-shit-done/workflows/execute-plan.md
@/Users/william/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/components/leads/LeadDetail.tsx
@client/src/components/leads/InlineField.tsx
@client/src/components/leads/ActivityTimeline.tsx
@client/src/components/pipeline/LeadCard.tsx
@client/src/components/pipeline/ListView.tsx
@client/src/pages/LeadDetailPage.tsx
@client/src/lib/constants.ts
@client/src/components/ui/tabs.tsx
@client/src/components/leads/NoteInput.tsx
@client/src/components/leads/LeadEmails.tsx
@client/src/components/whatsapp/WhatsAppChat.tsx

<interfaces>
From client/src/components/ui/tabs.tsx:
```typescript
// Base UI tabs - uses value prop for tab identification
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
// TabsTrigger uses value={number} (0-based index)
// TabsContent uses value={number} (matching trigger index)
```

From client/src/lib/constants.ts:
```typescript
export const PIPELINE_STAGES: PipelineStage[] = [
  { value: 'nouveau', label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacte', label: 'Contacte', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'rdv', label: 'RDV', color: 'bg-purple-100 text-purple-800' },
  { value: 'devis_envoye', label: 'Devis envoye', color: 'bg-orange-100 text-orange-800' },
  { value: 'signe', label: 'Signe', color: 'bg-green-100 text-green-800' },
  { value: 'perdu', label: 'Perdu', color: 'bg-red-100 text-red-800' },
];
```

From client/src/components/leads/LeadDetail.tsx:
```typescript
interface LeadDetailProps { lead: Lead; }
// handleNameSave splits lead.name by space: nameParts[0] = firstName, rest = lastName
// handleSave(field, value) sends PATCH /api/leads/:id with {[field]: value}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix firstname bug, accent encoding, euro sign, and status colors</name>
  <files>
    client/src/components/leads/LeadDetail.tsx
    client/src/components/leads/InlineField.tsx
    client/src/lib/constants.ts
    client/src/components/pipeline/ListView.tsx
  </files>
  <action>
**1. Fix first name update copying into last name (LeadDetail.tsx):**
Investigate the `handleNameSave` function. The bug is likely a stale closure issue: when editing firstName, `lastName` captured in the closure may be stale if React re-rendered between edit start and save. Fix by reading the current lead.name at save time rather than using the closure-captured `firstName`/`lastName`:

```typescript
function handleNameSave(part: 'first' | 'last', value: string) {
  const trimmedValue = value.trim();
  // Re-read current name at save time to avoid stale closure
  const currentParts = (lead.name || '').split(' ');
  const currentFirst = currentParts[0] || '';
  const currentLast = currentParts.slice(1).join(' ') || '';
  const newFirst = part === 'first' ? trimmedValue : currentFirst;
  const newLast = part === 'last' ? trimmedValue : currentLast;
  const fullName = [newFirst, newLast].filter(Boolean).join(' ');
  if (fullName) {
    handleSave('name', fullName);
  }
}
```

Also check `InlineField.tsx`: ensure the `useEffect(() => { setDraft(value); }, [value])` does not fire while the field is in editing mode (which would reset draft during optimistic update). Add a guard: `if (!editing) setDraft(value);` using a ref to track editing state since state updates are async.

**2. Fix accent encoding issues:**
The "accent issues" are likely about the hardcoded French UI strings missing accents. Audit all `.tsx` files in `client/src/components/` and `client/src/pages/` for French strings without proper accents. Common ones to fix:
- "Note ajoutee" -> "Note ajoutee" (check if this is actually rendered visibly)
- Check if email parsing in `src/services/gmail.ts` handles quoted-printable encoding for accented characters. If the email body uses `Content-Transfer-Encoding: quoted-printable`, decode it (the current code only handles base64url). Add quoted-printable decoding using a helper that replaces `=XX` sequences with their UTF-8 equivalent.
- If the gmail parsing already uses `base64url` to `utf-8`, the accents should be preserved. The issue may be in Mariages.net email subjects or sender names that use RFC 2047 encoded-words (`=?UTF-8?Q?...?=` or `=?UTF-8?B?...?=`). Check `extractSenderName` or similar functions and add RFC 2047 decoding if missing.

**3. Add euro sign to budget display (LeadDetail.tsx):**
In the InlineField for Budget, show the euro sign in display mode. Modify the budget InlineField to use a `displayValue` prop or format the value inline. The simplest approach: add a `suffix` prop to InlineField, or format budget display in LeadDetail.tsx by changing the budget InlineField to show `{budget} EUR` in non-editing mode. Better: use `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })` for display value, keeping the raw number for editing. Add a `displayValue` prop to InlineField that overrides the shown text when not editing.

**4. Add color coding to lead statuses:**
The `PIPELINE_STAGES` in `constants.ts` already has color classes. The `ListView.tsx` already uses colored Badge for status. The Kanban columns inherently separate by status. Ensure the status InlineField in `LeadDetail.tsx` shows a colored badge instead of plain text. Modify InlineField to accept an optional `renderValue` prop (a function `(value: string) => ReactNode`) that replaces the default text display. In LeadDetail, pass a renderValue for the status field that renders a Badge with the stage color from PIPELINE_STAGES.
  </action>
  <verify>
    <automated>cd /Users/william/Documents/Development/weds-crm && npx tsc --noEmit --project client/tsconfig.json 2>&1 | head -30</automated>
  </verify>
  <done>First name edit no longer corrupts last name. Budget shows euro symbol. Status fields show colored badges. Accent handling improved in email parsing.</done>
</task>

<task type="auto">
  <name>Task 2: Remove source column, collapse activity, reorganize lead detail layout</name>
  <files>
    client/src/components/pipeline/LeadCard.tsx
    client/src/components/pipeline/ListView.tsx
    client/src/components/leads/LeadDetail.tsx
    client/src/components/leads/ActivityTimeline.tsx
    client/src/pages/LeadDetailPage.tsx
  </files>
  <action>
**1. Remove source column from pipeline table view and kanban cards:**
- In `ListView.tsx`: Remove the entire `source` column definition from the `columns` array (the object with `accessorKey: 'source'`). Remove the `SourceBadge` import if no longer used.
- In `LeadCard.tsx`: Remove the `{lead.source && <SourceBadge source={lead.source} />}` line from the card header. Remove the `SourceBadge` import. This gives more space to the lead name.

**2. Collapse activity history to last 3 items (ActivityTimeline.tsx):**
Add state `const [expanded, setExpanded] = useState(false)` to ActivityTimeline. Slice activities: `const visibleActivities = expanded ? activities : activities.slice(0, 3)`. Map over `visibleActivities` instead of `activities`. After the map, if `activities.length > 3 && !expanded`, show a button:
```tsx
<button
  className="mt-2 text-xs text-primary hover:underline"
  onClick={() => setExpanded(true)}
>
  Voir les {activities.length - 3} activites precedentes
</button>
```
When expanded and activities > 3, show a collapse button:
```tsx
<button
  className="mt-2 text-xs text-muted-foreground hover:underline"
  onClick={() => setExpanded(false)}
>
  Reduire
</button>
```

**3. Reorganize lead detail into sidebar + tabbed layout (LeadDetail.tsx):**
Restructure the LeadDetail component from the current `grid gap-8 lg:grid-cols-2` into a Pipedrive-style layout:

- **Outer container:** `flex gap-6` (or `grid grid-cols-[320px_1fr] gap-6` on lg, single column on mobile)
- **Left sidebar (320px on desktop, full width on mobile):** Contains the condensed lead info fields + Activity timeline underneath
  - Condense fields: Change from `space-y-1` to a more compact layout. Use `grid grid-cols-2 gap-x-4 gap-y-0` for fields like Email, Phone, Date, Budget, Source. Keep Prenom/Nom on their own row. Keep Message as full-width below. Remove excessive vertical spacing.
  - Activity timeline goes below the fields, with the collapse behavior from step 2.
- **Right content area (flex-1):** Tabbed interface using the existing Tabs component:
  ```tsx
  import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
  ```
  Three tabs:
  - Tab 0: "Notes" - Contains NoteInput component
  - Tab 1: "Emails" - Contains the "Generer un brouillon" button + LeadEmails component
  - Tab 2: "WhatsApp" - Contains WhatsAppChat component

  Default active tab: 0 (Notes).

The LeadDetailPage.tsx header (back button, name, sync/delete buttons) stays as-is above the new layout.

Mobile layout: Stack sidebar above tabs (single column via responsive classes).
  </action>
  <verify>
    <automated>cd /Users/william/Documents/Development/weds-crm && npx tsc --noEmit --project client/tsconfig.json 2>&1 | head -30</automated>
  </verify>
  <done>Source column removed from list view and kanban cards. Activity history collapsed to 3 items with expand/collapse. Lead detail uses sidebar (condensed fields + activity) + tabbed content (Notes, Emails, WhatsApp) layout.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit --project client/tsconfig.json` passes with no errors
- `cd client && npm run build` completes successfully
- Visual check: Lead detail page shows 2-column layout with compact sidebar and tabbed content area
</verification>

<success_criteria>
- All 8 todos are addressed
- TypeScript compilation passes
- Client builds without errors
- Lead detail page is reorganized with sidebar + tabs layout
- Source column removed from pipeline views
- Activity history collapses to 3 items
- Budget shows euro sign
- Statuses have color-coded badges
- First name edits don't corrupt last name
</success_criteria>

<output>
After completion, create `.planning/quick/1-execute-all-8-pending-todos-fix-firstnam/1-SUMMARY.md`
</output>
