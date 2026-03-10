# Requirements: Weds CRM

**Defined:** 2026-03-10
**Core Value:** Every Mariages.net lead is captured, organized, and actionable from a single interface

## v1 Requirements

### Lead Management

- [ ] **LEAD-01**: User can create a lead manually with name, email, phone, event date, source, and notes
- [ ] **LEAD-02**: User can view a list of all leads with filters by status, date range, and source
- [ ] **LEAD-03**: User can view leads in a Kanban board with drag-and-drop between pipeline stages
- [ ] **LEAD-04**: User can edit any lead's fields (name, email, phone, event date, notes)
- [ ] **LEAD-05**: User can delete a lead
- [ ] **LEAD-06**: User can assign a status to a lead (Nouveau, Contacté, RDV, Devis envoyé, Signé, Perdu)
- [ ] **LEAD-07**: User can add timestamped notes to a lead
- [ ] **LEAD-08**: User can view a chronological activity history per lead (emails, notes, status changes)
- [ ] **LEAD-09**: System detects duplicate leads by email and phone before creation and warns the user
- [ ] **LEAD-10**: Each lead displays a source badge (e.g. "Mariages.net")
- [ ] **LEAD-11**: System generates a vCard file for each lead and stores a download link

### Email / Inbox

- [ ] **MAIL-01**: User can view Gmail inbox within the CRM interface
- [ ] **MAIL-02**: User can read email threads linked to a specific lead
- [ ] **MAIL-03**: User can reply to emails directly from the CRM
- [ ] **MAIL-04**: System automatically links incoming emails to existing leads by sender email
- [ ] **MAIL-05**: User can create and manage reusable email templates with variables ({{nom}}, {{date_evenement}}, etc.)
- [ ] **MAIL-06**: System generates AI email draft based on lead context (name, event date, message)
- [ ] **MAIL-07**: User can review, edit, and send AI-generated drafts before they are sent
- [ ] **MAIL-08**: User can manage the AI prompt template within the app (replaces Google Docs)

### Notifications

- [ ] **NOTF-01**: System sends SMS to prospect via Twilio when a new lead is captured
- [ ] **NOTF-02**: System sends SMS notification to admin (William) via Free Mobile on new lead, including a vCard download link (stored on Google Drive or GCP bucket)
- [ ] **NOTF-03**: System sends email recap to contact@weds.fr with vCard attachment on new lead
- [ ] **NOTF-04**: User can send WhatsApp messages to prospects via WhatsApp Business API
- [ ] **NOTF-05**: User can view WhatsApp Business conversations linked to a lead within the CRM

### Parsing & Automation

- [ ] **PARS-01**: System polls Gmail for Mariages.net emails and extracts lead data (name, date, email, phone, message)
- [ ] **PARS-02**: System creates a new lead in the database from parsed email data
- [ ] **PARS-03**: System archives processed emails and removes the trigger label
- [ ] **PARS-04**: System skips already-processed emails (duplicate email detection)

### Pipedrive Sync

- [ ] **SYNC-01**: System pushes new leads to Pipedrive as Person + Deal with all custom fields
- [ ] **SYNC-02**: System syncs status changes from CRM to Pipedrive deal stage
- [ ] **SYNC-03**: System receives Pipedrive webhook events and updates local leads accordingly
- [ ] **SYNC-04**: System prevents sync loops (local change → Pipedrive webhook → local change)

### Infrastructure

- [ ] **INFR-01**: User authenticates via Google OAuth 2.0
- [ ] **INFR-02**: All UI text and notifications are in French
- [ ] **INFR-03**: UI is responsive and usable on mobile
- [ ] **INFR-04**: Application deploys on GCP Cloud Run via Docker

## v2 Requirements

### Extended Notifications

- **NOTF-06**: System sends follow-up reminders when a lead has not been replied to in 48h

### Email Enhancements

- **MAIL-09**: User can manage Gmail labels from within the CRM
- **MAIL-10**: User can search across all leads and email content (full-text search)

### Multi-Source

- **PARS-05**: System captures leads from additional sources (Zankyou, web form, etc.)

### Analytics

- **ANAL-01**: User can view conversion funnel (leads → booked) with rates and timelines
- **ANAL-02**: User can view response time analytics per lead source

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user / team management | Single user only — no RBAC complexity needed |
| Mobile native app | Responsive web is sufficient |
| Invoicing / billing | Separate accounting tool handles this |
| Calendar / booking integration | Significant scope — defer to V2+ |
| Real-time chat with prospects | WhatsApp async is sufficient |
| Bulk email campaigns | Wedding photography is high-touch 1:1 |
| AI contract drafting | Legal risk — use external contract tool |
| Auto-send emails without review | AI drafts must always be reviewed before sending |
| Offline / PWA mode | Connectivity expected for single-user tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEAD-01 | Phase 2 | Pending |
| LEAD-02 | Phase 2 | Pending |
| LEAD-03 | Phase 2 | Pending |
| LEAD-04 | Phase 2 | Pending |
| LEAD-05 | Phase 2 | Pending |
| LEAD-06 | Phase 2 | Pending |
| LEAD-07 | Phase 2 | Pending |
| LEAD-08 | Phase 2 | Pending |
| LEAD-09 | Phase 1 | Pending |
| LEAD-10 | Phase 2 | Pending |
| LEAD-11 | Phase 1 | Pending |
| MAIL-01 | Phase 4 | Pending |
| MAIL-02 | Phase 4 | Pending |
| MAIL-03 | Phase 4 | Pending |
| MAIL-04 | Phase 4 | Pending |
| MAIL-05 | Phase 4 | Pending |
| MAIL-06 | Phase 4 | Pending |
| MAIL-07 | Phase 4 | Pending |
| MAIL-08 | Phase 4 | Pending |
| NOTF-01 | Phase 1 | Pending |
| NOTF-02 | Phase 1 | Pending |
| NOTF-03 | Phase 1 | Pending |
| NOTF-04 | Phase 4 | Pending |
| NOTF-05 | Phase 4 | Pending |
| PARS-01 | Phase 1 | Pending |
| PARS-02 | Phase 1 | Pending |
| PARS-03 | Phase 1 | Pending |
| PARS-04 | Phase 1 | Pending |
| SYNC-01 | Phase 3 | Pending |
| SYNC-02 | Phase 3 | Pending |
| SYNC-03 | Phase 3 | Pending |
| SYNC-04 | Phase 3 | Pending |
| INFR-01 | Phase 1 | Pending |
| INFR-02 | Phase 1 | Pending |
| INFR-03 | Phase 2 | Pending |
| INFR-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 — INFR-03 moved from Phase 1 to Phase 2 (no UI in Phase 1)*
