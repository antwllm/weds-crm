# Weds CRM

## What This Is

A custom CRM for weds.fr (wedding photography) that replaces the current email-parser automation and progressively eliminates the dependency on Pipedrive. It captures leads from Mariages.net, manages the full sales pipeline, integrates a Gmail inbox with AI-powered email drafting, and handles multi-channel notifications (SMS, email, WhatsApp). Built for a single user (William) with deployment on GCP.

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

### Active

See: `.planning/REQUIREMENTS.md` for v1.1 requirements

### Out of Scope

- Multi-user / team management — single user only
- Mobile native app — web responsive is sufficient
- Real-time chat with prospects
- Invoicing / billing features
- Calendar / booking integration
- Auto-send AI WhatsApp without human review on first activation — safety net required

## Current Milestone: v1.1 Templates & Agent IA WhatsApp

**Goal:** Transformer le CRM en outil de communication intelligent — editeur de templates professionnel avec images/PJ et agent IA WhatsApp autonome avec observabilite Langfuse.

**Target features:**
- Editeur HTML avance avec coloration syntaxique et formatage Prettier
- Images inline via upload GCS dans les templates et le composeur
- Gestion des pieces jointes dans les modeles (upload, pre-remplissage)
- Agent IA WhatsApp : auto-reponse aux prospects avec handoff humain
- Observabilite IA via Langfuse (traces, decisions, calibration)
- Historique des decisions IA visible dans l'UI (action + reason)

## Context

- v1.0 MVP shipped 2026-03-15 — 15,871 LOC TypeScript/TSX, 167 tests, 240 files
- Replaces existing Node.js email-parser project (`/Users/william/Documents/Development/email-parser`)
- Tech stack: Bun + Express, Drizzle ORM, PostgreSQL 16, React + Vite + Tailwind v4 + shadcn/ui
- Gmail API (OAuth 2.0), OpenRouter AI, WhatsApp Business API, Twilio SMS, Free Mobile SMS
- Pipedrive bidirectional sync active during migration period
- AI prompt template managed in-app (replaced Google Doc)
- All user-facing text in French
- Docker Compose for local dev (port 8082), GCP Cloud Run for production
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
| Build custom CRM vs. stay on Pipedrive | Pipedrive doesn't fit the specific workflow; custom CRM allows inbox integration, AI drafts, and full control | ✓ Good — v1.0 delivered all features Pipedrive lacked |
| Bidirectional Pipedrive sync in V1 | Allows gradual migration — can use either interface during transition | ✓ Good — dual-layer loop prevention works reliably |
| Single-source (Mariages.net) for V1 | Keeps parsing simple, multi-source deferred to V2 | ✓ Good — focused scope, clean parser |
| GCP deployment | Existing infrastructure, Cloud Run fits containerized Node.js apps | ✓ Good — Docker Compose local + Cloud Run prod |
| AI drafts require mandatory review | Legal/quality risk of auto-sending AI content to prospects | ✓ Good — no auto-send path exists |
| WhatsApp 24h window enforcement | Meta API constraint — free-form messages blocked after 24h | ✓ Good — UI disables input, template-only fallback |
| Agent IA WhatsApp = reply or pass_to_human | Garder le controle sur les sujets sensibles (tarifs, dispo dates) | — Pending |
| Pass-to-human = per-conversation, not permanent | Le lead qui renvoie un message relance l'agent automatiquement | — Pending |
| Langfuse pour l'observabilite IA | Calibrer l'agent, tracer les decisions, mesurer la qualite | — Pending |

---
*Last updated: 2026-03-16 after v1.1 milestone start*
