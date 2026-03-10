# Weds CRM

## What This Is

A custom CRM for weds.fr (wedding photography) that replaces the current email-parser automation and progressively eliminates the dependency on Pipedrive. It captures leads from Mariages.net, manages the full sales pipeline, integrates a Gmail inbox with AI-powered email drafting, and handles multi-channel notifications (SMS, email, WhatsApp). Built for a single user (William) with deployment on GCP.

## Core Value

Every Mariages.net lead is captured, organized, and actionable from a single interface — no switching between Gmail, Pipedrive, and phone.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Automated lead parsing from Mariages.net emails (Gmail polling)
- [ ] Persistent database storage for all leads and interactions
- [ ] Lead management: view, edit, assign status, add notes
- [ ] Pipeline visualization: Kanban board + list view with filters
- [ ] Bidirectional sync with Pipedrive (leads, deals, contacts, status changes)
- [ ] Integrated Gmail inbox: read, reply, label, link emails to leads
- [ ] Email templates with variable substitution (name, date, etc.)
- [ ] AI-generated email drafts based on lead context
- [ ] Draft management: review, edit, send AI-generated drafts
- [ ] SMS notifications to prospects via Twilio
- [ ] SMS notifications to admin via Free Mobile
- [ ] Email recap notifications to contact@weds.fr
- [ ] WhatsApp messaging to prospects
- [ ] vCard generation and storage
- [ ] Duplicate detection before lead creation

### Out of Scope

- Multi-user / team management — single user only
- Mobile native app — web responsive is sufficient
- Other lead sources beyond Mariages.net — V1 is single-source
- Real-time chat with prospects
- Invoicing / billing features
- Calendar / booking integration

## Context

- Replaces existing Node.js email-parser project (`/Users/william/Documents/Development/email-parser`)
- Current system is stateless — polls Gmail, pushes to Pipedrive, sends notifications, no local DB
- Pipedrive has hardcoded custom field IDs specific to the weds.fr account
- Current Pipedrive deal fields: event date, message body, source (Mariages.net), vCard URL, GPT prompt
- Google APIs used: Gmail (modify), Drive (file creation), Docs (read template)
- Current SMS: Twilio for prospects, Free Mobile API for admin alerts
- GPT prompt template currently stored in a Google Doc
- All user-facing text in French
- Deployed on GCP (Cloud Run target)
- Single user: William

## Constraints

- **Pipedrive compatibility**: V1 must maintain full sync with existing Pipedrive setup — it's the current source of truth
- **Gmail API**: Must use Google OAuth 2.0 with gmail.modify, drive, documents.readonly scopes
- **Language**: All UI and notifications in French
- **Deployment**: GCP Cloud Run with Docker
- **Budget**: Minimize external service costs — leverage existing Twilio, Free Mobile, Google accounts

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build custom CRM vs. stay on Pipedrive | Pipedrive doesn't fit the specific workflow; custom CRM allows inbox integration, AI drafts, and full control | — Pending |
| Bidirectional Pipedrive sync in V1 | Allows gradual migration — can use either interface during transition | — Pending |
| Single-source (Mariages.net) for V1 | Keeps parsing simple, multi-source deferred to V2 | — Pending |
| GCP deployment | Existing infrastructure, Cloud Run fits containerized Node.js apps | — Pending |

---
*Last updated: 2026-03-10 after initialization*
