---
status: resolved
phase: 03-pipedrive-sync
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-03-11T00:00:00Z
updated: 2026-03-12T15:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Start the application from scratch. Server boots without errors, DB schema applies cleanly (including new lastSyncOrigin/lastSyncAt columns), and a basic API call (e.g. GET /api/leads) returns a response.
result: pass

### 2. Create Lead Pushes to Pipedrive
expected: Create a new lead via POST /api/leads (or via the UI). Within seconds, a matching Person + Deal appears in your Pipedrive account with correct name, email, phone, and custom fields. The CRM lead gets pipedriveDealId and pipedrivePersonId populated.
result: pass

### 3. Update Lead Pushes Stage Change to Pipedrive
expected: Change a lead's status in the CRM (e.g. via PATCH /api/leads/:id or the UI). The corresponding deal in Pipedrive moves to the correct pipeline stage. Custom fields on the deal are updated.
result: issue
reported: "Probleme quand je modifie le prénom, la nouvelle valeur que je tape se rajoute dans le nom automatiquement. Sur Pipedrive le deal title montre 'New 2 2 2 2 2 2 Lead' - les valeurs s'accumulent au lieu de se remplacer."
severity: major

### 4. Pipedrive Webhook Endpoint Accepts Events
expected: POST to /webhook/pipedrive with valid basic auth credentials and a valid Pipedrive webhook v2 payload. Endpoint returns 200 immediately. Invalid auth returns 401.
result: skipped
reason: Webhook pas configuré côté Pipedrive, pas d'accès au local

### 5. Pipedrive Deal Update Syncs to CRM
expected: In Pipedrive, move a deal to a different stage. The CRM lead's status updates to match the new stage. A "pipedrive_synced" activity is logged on the lead timeline.
result: skipped
reason: Webhook pas configuré côté Pipedrive

### 6. Pipedrive Deal Created Links Existing Lead
expected: Create a deal in Pipedrive with an email/phone matching an existing CRM lead. The webhook links the deal to the existing lead (sets pipedriveDealId/pipedrivePersonId) without creating a duplicate lead.
result: skipped
reason: Webhook pas configuré côté Pipedrive

### 7. Loop Prevention Works
expected: Update a lead in the CRM. The change pushes to Pipedrive (Plan 02). When Pipedrive fires the webhook back, the CRM does NOT re-process it (dual-layer: API-origin discard + 5s suppression window). No duplicate activity logs appear.
result: skipped
reason: Webhook pas configuré côté Pipedrive

### 8. Pipedrive Audit Script
expected: Run `bun scripts/pipedrive-audit.ts`. It connects to the live Pipedrive API, fetches field keys and stage IDs, and outputs a JSON config suitable for PIPEDRIVE_FIELD_CONFIG env var.
result: pass

## Summary

total: 8
passed: 3
issues: 1
pending: 0
skipped: 4

## Gaps

- truth: "Updating a lead name in CRM correctly replaces the Person name and Deal title in Pipedrive"
  status: resolved
  reason: "User reported: Probleme quand je modifie le prénom, la nouvelle valeur que je tape se rajoute dans le nom automatiquement. Sur Pipedrive le deal title montre 'New 2 2 2 2 2 2 Lead' - les valeurs s'accumulent au lieu de se remplacer."
  severity: major
  test: 3
  root_cause: "Stale closure in LeadDetail.handleNameSave — useUpdateLead lacks optimistic update, so lead.name is stale between PATCH and refetch. Space-based split/join of single name field is lossy and compounds errors on each edit."
  artifacts:
    - path: "client/src/components/leads/LeadDetail.tsx"
      issue: "handleNameSave reads stale lead.name from closure, splits on spaces to reconstruct — lossy with multi-word names"
    - path: "client/src/hooks/useLeads.ts"
      issue: "useUpdateLead has no optimistic update, creating staleness window"
  missing:
    - "Add optimistic update to useUpdateLead (or use mutation response to update cache) so lead.name is current when handleNameSave reads it"
    - "Consider separate first_name/last_name columns long-term to avoid split/join fragility"
  debug_session: ".planning/debug/name-concat-pipedrive.md"
