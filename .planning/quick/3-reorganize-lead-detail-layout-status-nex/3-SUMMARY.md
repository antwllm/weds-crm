---
phase: quick
plan: 3
subsystem: client-ui
tags: [lead-detail, layout, status-badge, ux]
dependency_graph:
  requires: []
  provides: [status-header-badge, creation-date-field, reordered-fields]
  affects: [LeadDetailPage, LeadDetail]
tech_stack:
  added: []
  patterns: [base-ui-select-in-header, read-only-static-field]
key_files:
  created: []
  modified:
    - client/src/pages/LeadDetailPage.tsx
    - client/src/components/leads/LeadDetail.tsx
decisions:
  - Static div for read-only Date de creation instead of InlineField (no readOnly prop available)
  - Removed Badge/PIPELINE_STAGES imports from LeadDetail.tsx since status moved to page header
metrics:
  duration: 2min
  completed: 2026-03-15
---

# Quick Task 3: Reorganize Lead Detail Layout Summary

Status badge moved to page header with dropdown selector; field grid reordered into 4 clean rows with creation date added.

## Completed Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add status badge with dropdown to page header | f884ed4 | client/src/pages/LeadDetailPage.tsx |
| 2 | Reorder fields grid, add creation date, remove status | f7bec81 | client/src/components/leads/LeadDetail.tsx |

## Deviations from Plan

None - plan executed exactly as written.

## What Was Built

**Task 1 - Status badge in header:**
- Imported Badge, Select components, useUpdateLead, PIPELINE_STAGES into LeadDetailPage
- Added handleStatusChange with toast feedback and query invalidation
- Rendered colored Badge next to h1 lead name, wrapped in Select dropdown for changing status

**Task 2 - Field grid reorganization:**
- Removed Statut InlineField from grid (now handled by header)
- Added static read-only "Date de creation" field with fr-FR locale formatting
- Reordered fields: Prenom/Nom, Email/Telephone, Date evenement/Date creation, Source/Budget
- Cleaned up unused imports (Badge, PIPELINE_STAGES, stageOptions)

## Verification

- TypeScript compiles cleanly (no errors)
- Field order: Prenom, Nom, Email, Telephone, Date evenement, Date creation, Source, Budget
- Status badge uses PIPELINE_STAGES colors and labels
- Status dropdown updates lead via useUpdateLead mutation
