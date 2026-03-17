# Weds CRM

## What This Is

A custom CRM for weds.fr (wedding photography) that captures leads from Mariages.net, manages the full sales pipeline, integrates a Gmail inbox with AI-powered email drafting, handles multi-channel notifications (SMS, email, WhatsApp), and includes an autonomous WhatsApp AI agent with Langfuse observability. Built for a single user (William) with deployment on GCP.

## Core Value

Every Mariages.net lead is captured, organized, and actionable from a single interface — no switching between Gmail, Pipedrive, and phone.

## Requirements

### Validated

- ✓ Automated lead parsing from Mariages.net emails (Gmail polling) — v1.0
- ✓ Persistent database storage for all leads and interactions — v1.0
- ✓ Lead management: view, edit, assign status, add notes — v1.0
- ✓ Pipeline visualization: Kanban board + list view with filters — v1.0
- ✓ Bidirectional sync with Pipedrive (leads, deals, contacts, status changes) — v1.0
- ✓ Integrated Gmail inbox: read, reply, link emails to leads — v1.0
- ✓ Email templates with variable substitution (name, date, etc.) — v1.0
- ✓ AI-generated email drafts based on lead context — v1.0
- ✓ Draft management: review, edit, send AI-generated drafts — v1.0
- ✓ SMS notifications to prospects via Twilio — v1.0
- ✓ SMS notifications to admin via Free Mobile — v1.0
- ✓ Email recap notifications to contact@weds.fr — v1.0
- ✓ WhatsApp messaging to prospects — v1.0
- ✓ vCard generation and storage — v1.0
- ✓ Duplicate detection before lead creation — v1.0
- ✓ Advanced HTML template editor with syntax highlighting and formatting — v1.1
- ✓ Inline image upload via GCS in templates and composer — v1.1
- ✓ Template attachment management with pre-loading in composer — v1.1
- ✓ WhatsApp AI agent: autonomous replies with human handoff — v1.1
- ✓ AI decision history visible in lead WhatsApp UI — v1.1
- ✓ Langfuse tracing for all AI calls (WhatsApp + email draft) — v1.1
- ✓ User feedback scoring (thumbs up/down) forwarded to Langfuse — v1.1

### Active

(Next milestone — define via `/gsd:new-milestone`)

### Out of Scope

- Multi-user / team management — single user only
- Mobile native app — web responsive is sufficient
- Real-time chat with prospects
- Invoicing / billing features
- Calendar / booking integration

## Context

- v1.0 MVP shipped 2026-03-15 — 15,871 LOC TypeScript/TSX
- v1.1 shipped 2026-03-17 — 15,253 LOC TypeScript/TSX, 3 phases, 9 plans
- Tech stack: Bun + Express, Drizzle ORM, PostgreSQL 16, React + Vite + Tailwind v4 + shadcn/ui
- Gmail API (OAuth 2.0), OpenRouter AI, WhatsApp Business API, Twilio SMS, Free Mobile SMS
- Langfuse Cloud for AI observability (OTLP endpoint)
- Pipedrive bidirectional sync active during migration period
- All user-facing text in French
- Docker Compose for local dev (port 8082), GCP Cloud Run for production
- Single user: William

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build custom CRM vs. stay on Pipedrive | Pipedrive doesn't fit the specific workflow | ✓ Good — v1.0 delivered all features Pipedrive lacked |
| Bidirectional Pipedrive sync in V1 | Allows gradual migration | ✓ Good — dual-layer loop prevention works |
| Single-source (Mariages.net) for V1 | Keeps parsing simple | ✓ Good — focused scope, clean parser |
| GCP deployment | Existing infrastructure | ✓ Good — Docker Compose local + Cloud Run prod |
| AI drafts require mandatory review | Legal/quality risk of auto-sending | ✓ Good — no auto-send path exists |
| WhatsApp 24h window enforcement | Meta API constraint | ✓ Good — UI disables input, template fallback |
| Agent IA WhatsApp = reply or pass_to_human | Garder le controle sur les sujets sensibles | ✓ Good — handoff fonctionne, alerte SMS+email |
| Pass-to-human = per-conversation, not permanent | Le lead qui renvoie relance l'agent auto | ✓ Good — re-activation automatique |
| Langfuse OTLP pour l'observabilite IA | Calibrer l'agent, tracer, mesurer qualite | ✓ Good — traces temps reel via OTLP endpoint |
| Langfuse REST API pour scores | Endpoint /scores non disponible via OTel | ✓ Good — feedback thumbs remonte correctement |

## Constraints

- **Pipedrive compatibility**: Must maintain full sync with existing Pipedrive setup
- **Gmail API**: Google OAuth 2.0 with gmail.modify, drive, documents.readonly scopes
- **Language**: All UI and notifications in French
- **Deployment**: GCP Cloud Run with Docker
- **Budget**: Minimize external service costs

---
*Last updated: 2026-03-17 after v1.1 milestone completion*
