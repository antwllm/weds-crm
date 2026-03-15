---
phase: quick
plan: 3
type: execute
wave: 1
depends_on: []
files_modified:
  - client/src/pages/LeadDetailPage.tsx
  - client/src/components/leads/LeadDetail.tsx
autonomous: true
requirements: [QUICK-3]
must_haves:
  truths:
    - "Status badge is visible next to the lead name in the page header"
    - "Status can be changed via dropdown in the header"
    - "Date de creation field appears as read-only in row 3 alongside Date evenement"
    - "Fields are ordered: Prenom/Nom, Email/Telephone, Date evenement/Date creation, Source/Budget"
  artifacts:
    - path: "client/src/pages/LeadDetailPage.tsx"
      provides: "Status badge with dropdown in header next to lead name"
      contains: "PIPELINE_STAGES"
    - path: "client/src/components/leads/LeadDetail.tsx"
      provides: "Reordered field grid with createdAt and without Statut"
      contains: "Date de creation"
  key_links:
    - from: "client/src/pages/LeadDetailPage.tsx"
      to: "PIPELINE_STAGES"
      via: "import from constants"
      pattern: "PIPELINE_STAGES"
---

<objective>
Reorganize lead detail page layout: move status badge next to name in header with dropdown to change it, add read-only creation date field, reorder info fields into 4 rows.

Purpose: Better visual hierarchy — status is a primary attribute that belongs in the header, not buried in the field grid.
Output: Updated LeadDetailPage.tsx (header with status) and LeadDetail.tsx (reordered fields).
</objective>

<execution_context>
@/Users/william/.claude/get-shit-done/workflows/execute-plan.md
@/Users/william/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/pages/LeadDetailPage.tsx
@client/src/components/leads/LeadDetail.tsx
@client/src/lib/constants.ts
@client/src/types/index.ts

<interfaces>
From client/src/types/index.ts:
- Lead type has `createdAt: string | null`, `status: string`, `name: string`

From client/src/lib/constants.ts:
- `PIPELINE_STAGES: PipelineStage[]` — array of `{ value, label, color }` objects
- Each stage has a `color` string like `'bg-blue-100 text-blue-800'`

From client/src/components/leads/LeadDetail.tsx:
- `handleSave(field: string, value: string)` — saves any lead field via useUpdateLead
- `InlineField` component supports type="select" with options prop

From client/src/components/ui/badge.tsx:
- `Badge` component with `variant` and `className` props
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add status badge with dropdown to page header</name>
  <files>client/src/pages/LeadDetailPage.tsx</files>
  <action>
In LeadDetailPage.tsx:

1. Add imports: `Badge` from `@/components/ui/badge`, `PIPELINE_STAGES` from `@/lib/constants`, `useUpdateLead` from `@/hooks/useLeads`, and `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` from `@/components/ui/select`.

2. Inside the component, add `const updateLead = useUpdateLead();` and a handler:
```typescript
function handleStatusChange(newStatus: string) {
  updateLead.mutate(
    { id: leadId, data: { status: newStatus } },
    {
      onSuccess: () => {
        toast.success('Statut mis a jour');
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      },
      onError: () => toast.error('Erreur lors de la mise a jour du statut'),
    }
  );
}
```

3. In the header, after the `<h1>` element, add a Select dropdown that displays the current status as a colored Badge and allows changing it:
```tsx
<Select value={lead.status || 'nouveau'} onValueChange={handleStatusChange}>
  <SelectTrigger className="w-auto border-none shadow-none p-0 h-auto focus:ring-0">
    <SelectValue>
      {(() => {
        const stage = PIPELINE_STAGES.find((s) => s.value === (lead.status || 'nouveau'));
        return stage ? (
          <Badge variant="secondary" className={`text-xs ${stage.color}`}>
            {stage.label}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">{lead.status}</Badge>
        );
      })()}
    </SelectValue>
  </SelectTrigger>
  <SelectContent>
    {PIPELINE_STAGES.map((stage) => (
      <SelectItem key={stage.value} value={stage.value}>
        <Badge variant="secondary" className={`text-xs ${stage.color}`}>
          {stage.label}
        </Badge>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

Place this inside the existing `<div className="flex items-center gap-3">` that contains the back arrow and h1, right after the h1.
  </action>
  <verify>
    <automated>cd /Users/william/Documents/Development/weds-crm && npx tsc --noEmit --project client/tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>Status badge appears next to lead name in header, clicking it opens a dropdown with all pipeline stages, selecting a stage updates the lead status.</done>
</task>

<task type="auto">
  <name>Task 2: Reorder fields grid, add creation date, remove status from grid</name>
  <files>client/src/components/leads/LeadDetail.tsx</files>
  <action>
In LeadDetail.tsx, modify the grid inside the left sidebar (lines 110-176):

1. Remove the Statut InlineField entirely (lines 160-175) — it is now in the page header.

2. Add a read-only "Date de creation" field. After the "Date de l'evenement" InlineField, add:
```tsx
<InlineField
  label="Date de creation"
  value={lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('fr-FR') : ''}
  onSave={() => {}}
  type="text"
  readOnly
/>
```
Note: If InlineField does not support a `readOnly` prop, instead render a simple static display that matches the InlineField visual style:
```tsx
<div className="py-1">
  <span className="text-xs text-muted-foreground">Date de creation</span>
  <p className="text-sm">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('fr-FR') : '-'}</p>
</div>
```

3. Reorder the fields in the grid to achieve this exact layout (4 rows of 2):
   - Row 1: Prenom | Nom (keep as-is)
   - Row 2: Email | Telephone (keep as-is)
   - Row 3: Date de l'evenement | Date de creation (new)
   - Row 4: Source | Budget (swap current order — Source first, then Budget)

The final grid should contain exactly 8 fields (no Statut), in this order:
Prenom, Nom, Email, Telephone, Date evenement, Date creation, Source, Budget.
  </action>
  <verify>
    <automated>cd /Users/william/Documents/Development/weds-crm && npx tsc --noEmit --project client/tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>Field grid shows 4 rows: Prenom/Nom, Email/Telephone, Date evenement/Date creation, Source/Budget. Status field is gone from the grid. Creation date displays as read-only formatted in French locale.</done>
</task>

</tasks>

<verification>
- TypeScript compiles without errors
- Visual check: status badge visible next to name in header
- Visual check: field grid has 4 rows in specified order
- Visual check: Date de creation shows formatted date, is not editable
- Changing status via header dropdown updates the lead
</verification>

<success_criteria>
- Status badge displayed next to lead name in page header with dropdown to change it
- Creation date field added as read-only in row 3
- Fields reordered: Prenom/Nom, Email/Telephone, Date evenement/Date creation, Source/Budget
- Status field removed from the left sidebar grid
- TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/3-reorganize-lead-detail-layout-status-nex/3-SUMMARY.md`
</output>
