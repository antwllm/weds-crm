# Roadmap: Weds CRM

## Overview

Four phases that build the system from the ground up: the backend automation core (parsing, notifications, infrastructure) ships first and starts delivering value before any UI exists; the lead management UI turns raw data into a usable pipeline; Pipedrive sync adds the migration safety net; and the unified messaging phase delivers the primary differentiator — a single interface where every lead inquiry (email and WhatsApp) becomes a reviewed, personalised reply without switching tabs.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Automation Core** - Infrastructure, auth, Gmail parsing, lead creation, and all notifications running headlessly
- [x] **Phase 2: Lead Management UI** - Kanban pipeline board, lead list, detail view, status management, notes, and activity history (completed 2026-03-10)
- [ ] **Phase 3: Pipedrive Sync** - Bidirectional sync with loop prevention and field key resolution — migration safety net
- [ ] **Phase 4: Gmail Inbox, AI Drafting, and WhatsApp** - Embedded Gmail inbox, email-to-lead linking, templates, AI draft generation, review workflow, and WhatsApp Business messaging

## Phase Details

### Phase 1: Foundation and Automation Core
**Goal**: The system runs headlessly in production — new Mariages.net leads are captured automatically, stored in the database, deduplicated, vCards generated, and all notifications dispatched — without any manual intervention or UI interaction
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-04, PARS-01, PARS-02, PARS-03, PARS-04, LEAD-09, LEAD-11, NOTF-01, NOTF-02, NOTF-03
**Note**: INFR-03 (responsive UI) deferred to Phase 2 — Phase 1 is headless with no UI
**Success Criteria** (what must be TRUE):
  1. William can log into the application with his Google account and the session persists across Cloud Run restarts
  2. When a Mariages.net inquiry email arrives, a lead record appears in the database within 2 minutes with all fields populated (name, email, phone, event date, message, source badge)
  3. When a new lead is created, William receives an SMS on his phone via Free Mobile containing a vCard download link (hosted on GCP bucket), the prospect receives an SMS via Twilio, and contact@weds.fr receives an email recap with the vCard attached
  4. Submitting a second Mariages.net email with the same email or phone number as an existing lead triggers a duplicate warning rather than creating a second lead record
  5. The application deploys and restarts cleanly on GCP Cloud Run with all secrets sourced from Secret Manager
**Plans:** 5 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffolding, database schema, config, test infrastructure
- [ ] 01-02-PLAN.md — Google OAuth authentication, Express app, Sentry entry point
- [ ] 01-03-PLAN.md — Email parser (TDD), Gmail service, vCard generation, Cloud Storage
- [ ] 01-04-PLAN.md — SMS services (TDD) and notification orchestrator with triple alerting
- [ ] 01-05-PLAN.md — Pipeline orchestrator, Pub/Sub webhook, cron scheduler, token persistence, end-to-end wiring

### Phase 2: Lead Management UI
**Goal**: William can manage his entire pipeline from one screen — viewing all leads, dragging them between stages, editing their details, adding notes, and reading the full interaction history — entirely in French
**Depends on**: Phase 1
**Requirements**: LEAD-01, LEAD-02, LEAD-03, LEAD-04, LEAD-05, LEAD-06, LEAD-07, LEAD-08, LEAD-10, INFR-03
**Success Criteria** (what must be TRUE):
  1. William can create a lead manually from a form and it appears immediately in the pipeline with the correct source badge
  2. William can drag a lead card between Kanban columns (Nouveau, Contacte, RDV, Devis envoye, Signe, Perdu) and the status change persists on refresh
  3. William can switch to list view, filter leads by status, date range, or source, and see matching leads with their source badges
  4. William can open a lead, edit any field, add a timestamped note, and see the full chronological activity history (emails, notes, status changes) on the same page
  5. All UI text, labels, status names, and notification copy render in French throughout
**Plans:** 5/5 plans complete

Plans:
- [ ] 02-01-PLAN.md — React SPA scaffold with Vite, Tailwind v4, shadcn/ui, app layout, routing, API layer
- [ ] 02-02-PLAN.md — Backend API routes for leads CRUD, activities, notes, and budget field migration
- [ ] 02-03-PLAN.md — Kanban pipeline board with drag-and-drop, list view, filters, and source badges
- [ ] 02-04-PLAN.md — Lead detail page with inline editing, activity timeline, notes, and lead creation form
- [ ] 02-05-PLAN.md — Production build wiring (Express static serving, Dockerfile) and full UI verification

### Phase 3: Pipedrive Sync
**Goal**: William can continue using Pipedrive during the migration — every CRM action propagates to Pipedrive and every Pipedrive change propagates back, with no infinite loops and no silent data loss
**Depends on**: Phase 2
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04
**Success Criteria** (what must be TRUE):
  1. Creating or updating a lead in the CRM creates or updates the corresponding Person and Deal in Pipedrive with all custom fields populated (event date, message body, source, vCard URL)
  2. Changing a lead's status in Pipedrive triggers a webhook that updates the lead's status in the CRM, and the reverse also works — a status change in the CRM updates the Pipedrive deal stage
  3. Rapidly updating the same lead in both systems does not result in an infinite update loop — the second system's webhook is silently discarded within the suppression window
**Plans:** 3/4 plans executed

Plans:
- [x] 03-01-PLAN.md — Pipedrive API client, field config, retry utility, schema migration, test fixtures
- [ ] 03-02-PLAN.md — CRM-to-Pipedrive push sync (create Person+Deal, update deal stage/fields)
- [ ] 03-03-PLAN.md — Pipedrive webhook endpoint, sync-pull handlers, dual-layer loop prevention
- [ ] 03-04-PLAN.md — One-time Pipedrive import with history, manual push button in UI

### Phase 4: Gmail Inbox, AI Drafting, and WhatsApp
**Goal**: William never leaves the CRM to handle lead correspondence — he reads Gmail threads, composes replies using templates or AI-generated drafts, reviews every draft before sending, manages the AI prompt in the app, and sends or reads WhatsApp messages directly from the lead record
**Depends on**: Phase 2
**Requirements**: MAIL-01, MAIL-02, MAIL-03, MAIL-04, MAIL-05, MAIL-06, MAIL-07, MAIL-08, NOTF-04, NOTF-05
**Success Criteria** (what must be TRUE):
  1. William can open the inbox tab and see his Gmail threads; clicking a thread shows the full conversation inline without leaving the CRM
  2. An incoming email from a prospect is automatically linked to the matching lead record; William can view all emails for a lead from the lead detail page
  3. William can reply to a thread from the CRM and the reply appears in Gmail as part of the same conversation thread (correct threadId)
  4. William can select an email template with French variables ({{nom}}, {{date_evenement}}), preview the substituted output, and send it
  5. William can click "Generate draft" on a lead, see an AI-drafted reply pre-filled in the compose window, edit it, and send — and there is no path to send a draft without first reviewing it
  6. William can send a WhatsApp message to a prospect from the lead detail page via WhatsApp Business API, and incoming WhatsApp replies appear in the lead's activity history alongside emails and notes
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Automation Core | 0/5 | Not started | - |
| 2. Lead Management UI | 5/5 | Complete   | 2026-03-10 |
| 3. Pipedrive Sync | 3/4 | In Progress|  |
| 4. Gmail Inbox, AI Drafting, and WhatsApp | 0/TBD | Not started | - |
