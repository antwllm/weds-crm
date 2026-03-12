---
status: resolved
trigger: "Lead name accumulates/concatenates on each edit - Pipedrive shows 'New 2 2 2 2 2 2 Lead'"
created: 2026-03-12T00:00:00Z
updated: 2026-03-12T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - stale closure in handleNameSave + fragile name split/join architecture
test: Traced all data flows through frontend, PATCH, sync-push, and sync-pull
expecting: Stale lead.name causes incorrect name reconstruction
next_action: Document root cause and recommended fix

## Symptoms

expected: Editing prenom to "2" should set lead.name to "2 Lead" (replacing first name)
actual: Each edit accumulates - Pipedrive deal title shows "New 2 2 2 2 2 2 Lead"
errors: No error messages - functional bug
reproduction: Edit the "Prenom" field on lead detail page, save multiple times
started: Since Phase 03 inline editing was added

## Eliminated

- hypothesis: sync-push appending to existing Pipedrive values
  evidence: handleUpdate uses PUT with full replacement values built from lead.name
  timestamp: 2026-03-12

- hypothesis: Pipedrive webhook feedback loop modifying name
  evidence: Dual-layer loop prevention (API-origin filter + 5s suppression). handleDealUpdate does NOT touch lead.name. handlePersonUpdate writes back same name value.
  timestamp: 2026-03-12

- hypothesis: Multiple PATCH calls per keystroke (debounce issue)
  evidence: InlineField only fires onSave on blur/Enter, not on each keystroke
  timestamp: 2026-03-12

- hypothesis: Drizzle ORM concatenating instead of replacing
  evidence: .set({name: value}) generates standard SQL UPDATE SET name = value
  timestamp: 2026-03-12

- hypothesis: Pipedrive API concatenating Person name on PUT
  evidence: PUT replaces fields per HTTP standard and Pipedrive docs
  timestamp: 2026-03-12

## Evidence

- timestamp: 2026-03-12
  checked: LeadDetail.handleNameSave (lines 53-61)
  found: |
    Reads lead.name from React component closure, splits on space into first/last,
    replaces one part, recombines. The lead prop comes from useLeads() query which
    only updates after invalidation + refetch cycle completes.
  implication: Between mutation and refetch completion, lead.name is stale

- timestamp: 2026-03-12
  checked: useUpdateLead hook
  found: |
    No optimistic update. Only invalidateQueries on success. Cache stays stale until
    async refetch completes. Multiple rapid mutations can all read same stale data.
  implication: Window of staleness between mutation fire and refetch return

- timestamp: 2026-03-12
  checked: Pattern analysis "New 2 2 2 2 2 2 Lead"
  found: |
    Original "New" preserved as first word, "Lead" preserved as last word, "2" accumulates
    in the middle. This happens when curLast absorbs previous firstName edits via
    nameParts.slice(1).join(' '). If lead.name becomes "New 2 Lead" at any point,
    the next split gives first="New", last="2 Lead", and editing first to "2" gives
    "2 2 Lead". The "New" can persist if a stale-closure edit overwrites a correct update.
  implication: The split/join architecture is fundamentally fragile for concurrent edits

- timestamp: 2026-03-12
  checked: InlineField component
  found: |
    useEffect syncs draft from value prop. Saves on blur/Enter only.
    Compares trimmed draft to prop value before calling onSave.
    No debouncing issues.
  implication: The component itself is correct; the problem is in how LeadDetail uses it

- timestamp: 2026-03-12
  checked: PATCH route + sync-push
  found: |
    PATCH handler: passes .returning() result to syncLeadToPipedrive via setImmediate.
    sync-push handleUpdate: builds dealTitle from lead.name, pushes to Person and Deal.
    Both correctly use the DB-returned lead, not stale data.
  implication: Backend is correct; bug is in frontend name reconstruction

## Resolution

root_cause: |
  The LeadDetail component stores a single `name` field in the DB ("Prenom Nom") but
  presents it as two separate InlineField editors (firstName/lastName). The handleNameSave
  function reads `lead.name` from React props (which lag behind the DB due to async
  React Query refetch), splits it on spaces, replaces one half, and recombines.

  When the user makes an edit and the React Query refetch hasn't completed yet (or
  when editing both first and last name in sequence), handleNameSave reads STALE
  lead.name. The space-based split is also fragile: if the name has more than 2 words
  (e.g., after a bad reconstruction), nameParts.slice(1).join(' ') absorbs all
  extra words into lastName, which then gets recombined with the new firstName.

  Each cycle of stale-read -> bad split -> recombine -> save introduces drift, causing
  the accumulation pattern "New 2 2 2 2 2 2 Lead".

  The deal title in Pipedrive mirrors this because sync-push faithfully pushes
  `${lead.name} (date)` from whatever the DB contains.

fix: TBD - see suggested fix direction below
verification: TBD
files_changed: []
