---
phase: quick
plan: 1
subsystem: client-ui
tags: [bugfix, ui, ux, accents, layout]
dependency_graph:
  requires: []
  provides: [fixed-firstname-bug, euro-budget-display, color-coded-statuses, sidebar-tabs-layout, collapsed-activity]
  affects: [LeadDetail, InlineField, ActivityTimeline, LeadCard, ListView]
tech_stack:
  added: []
  patterns: [renderValue-prop, displayValue-prop, editingRef-guard, collapsible-list]
key_files:
  created: []
  modified:
    - client/src/components/leads/LeadDetail.tsx
    - client/src/components/leads/InlineField.tsx
    - client/src/components/leads/ActivityTimeline.tsx
    - client/src/components/pipeline/LeadCard.tsx
    - client/src/components/pipeline/ListView.tsx
    - client/src/pages/LeadDetailPage.tsx
    - client/src/lib/constants.ts
    - client/src/components/leads/NoteInput.tsx
    - client/src/components/leads/LeadForm.tsx
    - client/src/hooks/useSettings.ts
decisions:
  - "editingRef pattern to prevent useEffect draft reset during editing"
  - "renderValue and displayValue props on InlineField for custom display rendering"
  - "320px sidebar + flex-1 tabbed content layout for lead detail"
metrics:
  duration: 4min
  completed: "2026-03-15T09:49:32Z"
---

# Quick Plan 1: Execute All 8 Pending Todos Summary

All 8 accumulated UI/UX issues resolved: firstname stale closure bug fixed, accents corrected across 10+ French strings, budget shows euro-formatted currency, statuses render as color-coded badges, source column removed from pipeline views, activity timeline collapses to 3 items, and lead detail reorganized into sidebar + tabbed layout.

## Task Results

### Task 1: Fix firstname bug, accent encoding, euro sign, and status colors (defaaec)

**Firstname bug:** Fixed stale closure in `handleNameSave` by re-reading `lead.name` at save time instead of using closure-captured `firstName`/`lastName`. Added `editingRef` guard in `InlineField` to prevent `useEffect` from resetting the draft value while the user is actively editing.

**Accent encoding:** Fixed 10+ French UI strings missing accents across LeadDetailPage, NoteInput, ActivityTimeline, LeadForm, ListView, and useSettings. Examples: "Echec" -> "Echec", "supprime" -> "supprime", "Telephone" -> "Telephone", "Date evenement" -> "Date evenement", "WhatsApp envoye/recu" -> "WhatsApp envoye/recu".

**Euro sign:** Added `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })` display via new `displayValue` prop on InlineField. Raw number shown in edit mode, formatted currency in display mode.

**Status colors:** Added `renderValue` prop to InlineField. Status field in LeadDetail renders a color-coded Badge using PIPELINE_STAGES color classes.

### Task 2: Remove source column, collapse activity, reorganize lead detail layout (e3798f3)

**Source column removed:** Removed source column definition from ListView columns array and SourceBadge from LeadCard header. Unused SourceBadge imports cleaned up.

**Activity collapse:** Added `useState(false)` for expanded state to ActivityTimeline. Shows only first 3 activities by default with "Voir les N activites precedentes" expand button and "Reduire" collapse button.

**Lead detail layout:** Restructured from `grid lg:grid-cols-2` to `lg:grid-cols-[320px_1fr]` sidebar + tabs layout:
- Left sidebar (320px): Compact 2-column field grid (Prenom/Nom, Email/Phone, Date/Budget, Source/Statut) + full-width Message + Activity timeline
- Right content: Tabs component with Notes, Emails (with AI draft button), WhatsApp tabs
- Mobile: Stacks vertically (sidebar above tabs)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Accent fixes in additional files not listed in plan**
- **Found during:** Task 1
- **Issue:** Plan mentioned accent fixes but did not list LeadForm.tsx, useSettings.ts as files to modify
- **Fix:** Fixed accents in LeadForm.tsx (Telephone, Date de l'evenement), useSettings.ts (Modele supprime), and LeadDetailPage.tsx (Echec, irreversible, activites, associees, supprimees)
- **Files modified:** client/src/components/leads/LeadForm.tsx, client/src/hooks/useSettings.ts
- **Commit:** defaaec

## Verification

- TypeScript compilation: PASSED (no errors)
- Client build: PASSED (built in 1.96s)

## Self-Check: PASSED

All modified files exist and both commits verified.
