# Project Research Summary

**Project:** Weds CRM — custom wedding photography CRM for weds.fr
**Domain:** Single-user CRM with integrated Gmail inbox, AI email drafting, Pipedrive bidirectional sync, and automated lead ingestion
**Researched:** 2026-03-10
**Confidence:** HIGH

## Executive Summary

Weds CRM is a purpose-built internal tool for a solo wedding photographer. It replaces the current cobbled-together system of Pipedrive + Gmail + a custom email-parser script + a Google Docs prompt template. The recommended approach is a modular monolith deployed on GCP Cloud Run: a single Next.js 16 application that handles both the API (via Route Handlers) and the React frontend, backed by Cloud SQL for PostgreSQL (primary store), Redis via Memorystore (BullMQ queue), and Google Cloud Pub/Sub (Gmail push notifications). This eliminates the operational overhead of two separate services while still allowing clean internal module boundaries. All external integrations — Gmail, Pipedrive, OpenAI, Twilio — sit behind typed adapter layers, making the system maintainable as external APIs evolve.

The biggest value-add this system delivers over Pipedrive is the combination of an embedded Gmail inbox and lead-context-aware AI email drafting. Every Mariages.net inquiry automatically creates a structured lead record (zero manual entry), and a single click generates a personalised reply draft the photographer reviews and sends — all without leaving the CRM. Pipedrive remains active in parallel during migration via bidirectional sync, providing a safe rollback path. The French-language UI and photography-specific data model (event date, venue, couple names, source badge, vCard) are hard to replicate in generic CRMs.

The critical risks are all infrastructure-level and must be resolved in Phase 1 before any feature work begins: Google OAuth must be set to Production status before any production deployment (Testing status revokes refresh tokens every 7 days), OAuth tokens must be stored in GCP Secret Manager rather than environment variables, and Gmail's historyId fallback path (HTTP 404 handling) must be implemented alongside the happy path. Bidirectional Pipedrive sync requires an explicit loop-prevention mechanism (Redis-based suppression flag) from day one — retrofitting it is expensive. AI drafts must follow a strict review-before-send lifecycle; hallucinated facts in a sent email cause direct client relationship damage in a high-trust business.

---

## Key Findings

### Recommended Stack

The stack is production-ready for GCP Cloud Run deployment with no moving-part surprises. Next.js 16 (App Router, Route Handlers) removes the need for a separate Express backend. Drizzle ORM is the correct ORM choice over Prisma for Cloud Run — zero binary dependencies means no cold-start penalty from the Rust query engine. BullMQ backed by Redis is non-negotiable for async operations: Gmail ingestion, Pipedrive sync pushes, watch renewal, and notifications all have failure modes that require job-level retries and rate limiting. The OpenAI SDK is used directly (not via the Vercel AI SDK) because email drafting is a backend-only, non-streaming task.

See `.planning/research/STACK.md` for full package list with version pins and rationale.

**Core technologies:**
- **Next.js 16 (App Router):** Full-stack framework — replaces separate Express backend; Route Handlers serve the API; React 19 Server Components reduce client-side state for CRM views
- **Drizzle ORM 0.45 + Cloud SQL PostgreSQL:** Zero-binary ORM on managed Postgres; relational model is the correct fit for CRM data (leads → emails → notes → drafts with FK relationships)
- **BullMQ 5 + Redis:** All async operations queued — Gmail ingestion, Pipedrive sync, notifications, watch renewal; provides retries, rate limiting, and repeatable jobs
- **googleapis 171:** Official Google SDK covering Gmail, Drive, and Docs APIs; reuses existing OAuth scopes from predecessor email-parser
- **@google-cloud/pubsub 5:** Gmail push notifications via Cloud Pub/Sub — eliminates polling and rate limit pressure
- **openai 6:** Direct SDK for AI draft generation with `zodResponseFormat` structured output; no streaming UI needed
- **Auth.js v4 + @auth/drizzle-adapter:** Google OAuth session management; sessions persist in PostgreSQL across Cloud Run restarts
- **TanStack Query 5 + TanStack Table 8:** Client-side data fetching with optimistic updates; headless table with server-side pagination
- **Tailwind CSS 4 + shadcn/ui:** Standard 2025 component system; fully accessible primitives for Kanban, forms, command palette
- **Zod 4:** Single validation library used at API boundaries, DB inserts, AI response parsing, and env var validation

### Expected Features

Research compared against HoneyBook, Dubsado, Studio Ninja, Pipedrive, Sprout Studio, and NetHunt CRM. The full feature breakdown is in `.planning/research/FEATURES.md`.

**Must have — v1 launch (replaces current system without regression):**
- Google OAuth login + Gmail API connection — everything email-related depends on this
- Mariages.net email polling and automatic lead parsing — zero manual data entry
- Duplicate detection on lead creation (email + phone fuzzy match)
- Lead CRUD with all current Pipedrive field equivalents (event date, venue, couple names, source, vCard)
- Lead list view with filters + Kanban pipeline board with custom stages
- Pipedrive bidirectional sync — safety net during migration; Pipedrive stays usable
- Integrated Gmail inbox: read threads, link to leads, reply from CRM
- Email templates with French variable substitution
- AI email draft generation from lead context with mandatory review workflow
- SMS to prospects via Twilio + admin alert via Free Mobile + email recap notifications
- Activity / interaction history per lead
- vCard generation and storage
- French-language UI throughout

**Should have — v1.x (after core is validated):**
- WhatsApp messaging to prospects (gated by WhatsApp Business API approval)
- Inline Gmail label management
- GPT prompt template management in-app (replaces Google Docs dependency)
- Full-text search across leads and emails

**Defer — v2+:**
- Multi-source lead capture (Instagram, Google Ads)
- Calendar / availability view
- Analytics and reporting dashboard
- AI-powered follow-up reminders

**Anti-features (explicitly excluded):**
- Multi-user / RBAC — zero benefit for single-user; adds schema complexity
- Invoicing and contract generation — out of scope; delegate to Stripe/Docusign
- Bulk email campaigns — off-brand for high-touch wedding photography
- Auto-sending AI drafts without review — never acceptable

### Architecture Approach

The system follows a modular monolith pattern: a single Cloud Run deployment with strict internal module boundaries (leads, email, ai-draft, pipedrive-sync, notifications) that communicate via direct service function imports — no inter-service HTTP. Every external API sits behind a typed adapter layer. All async work — Gmail ingestion, Pipedrive sync, notifications, Gmail watch renewal — goes through BullMQ workers to decouple HTTP response times from external API latency and rate limits. AI drafts follow an explicit state machine (`pending_review` → `approved` → `sent`) with no auto-send path. Bidirectional Pipedrive sync uses a short-TTL Redis suppression key to prevent infinite webhook loops.

See `.planning/research/ARCHITECTURE.md` for the full system diagram, data flows, and component boundary rules.

**Major components:**
1. **Leads Module** — Lead CRUD, pipeline status, duplicate detection, notes; the central data model everything else depends on
2. **Gmail Adapter + Email Ingestion Worker** — Pub/Sub listener, `history.list` incremental fetch, message parsing, lead creation; replaces the current email-parser script
3. **Email Module** — Inbox display, thread view, reply composition, email-to-lead linking; the embedded Gmail UI
4. **Pipedrive Sync Module + Worker** — Bidirectional push/pull with loop prevention; bridges old and new systems during migration
5. **AI Draft Module** — Prompt construction from lead context, OpenAI call, draft lifecycle (review / edit / send); the primary differentiator
6. **Notification Module** — Twilio SMS, Free Mobile admin alert, email recap; preserves all existing notification behaviour
7. **Job Queue (BullMQ + Redis)** — Decouples all async operations from HTTP handlers; Gmail watch renewal (6-day repeatable job)

### Critical Pitfalls

Full details with recovery strategies in `.planning/research/PITFALLS.md`.

1. **OAuth app in "Testing" status revokes refresh tokens every 7 days** — Set OAuth consent screen to "Production" status before the first production deployment. Store refresh token in GCP Secret Manager, not environment variables. Implement refresh-before-expiry.
2. **Bidirectional Pipedrive sync creates infinite update loops** — Before pushing any change to Pipedrive, set a 10-second TTL Redis key for that record. Webhook handler discards events where the suppression key exists. Must be designed in from day one of sync; retrofitting is expensive.
3. **Hardcoded Pipedrive custom field hash keys break silently** — Resolve field names to hash keys via the Pipedrive Fields API at startup; cache the mapping in the DB. Alert loudly if a field key cannot be resolved — never silently drop data.
4. **Gmail historyId staleness after Cloud Run downtime causes missed or duplicate leads** — Explicitly handle HTTP 404 on `history.list`; fall back to bounded `messages.list` re-sync. Always persist raw email body in DB so re-parsing is possible without data loss.
5. **AI draft includes hallucinated event dates or venue names** — Only inject fields that exist as structured data in the lead record. Never let the model infer missing facts. UI must surface variable values prominently for review before send.
6. **Mariages.net email format changes break lead parsing silently** — After extraction, assert all required fields are non-empty and plausible. On validation failure, quarantine the raw email and alert William — never insert a corrupt lead record.

---

## Implications for Roadmap

Architecture research defines a clear dependency-ordered build sequence. The phases below follow that sequence while grouping features that share infrastructure to minimise context switching.

### Phase 1: Foundation and Infrastructure

**Rationale:** Every subsequent phase depends on GCP infrastructure, database schema, authentication, and the Gmail OAuth connection. These must be established first and must be production-quality from the start — not prototyped and patched later. The critical pitfalls (OAuth status, Secret Manager, historyId fallback) live here.

**Delivers:** Deployable Cloud Run service with Drizzle schema, Google OAuth login, Gmail connection, BullMQ workers bootstrapped, GCP Secret Manager wired up

**Addresses features:** Google OAuth login, Gmail API connection, admin SMS notification (Free Mobile) as a smoke-test notification path

**Avoids pitfalls:** OAuth app in Testing status; OAuth tokens in environment variables; Gmail historyId 404 path not implemented; Pipedrive field keys hardcoded (establish config pattern here for use in Phase 2)

**Research flag:** No additional research needed — official GCP and Google OAuth documentation is authoritative and well-documented.

### Phase 2: Lead Ingestion and Data Model

**Rationale:** The lead record is the central entity everything else depends on (see feature dependency graph). Gmail Pub/Sub and the Mariages.net parser must be built before the UI, Pipedrive sync, or AI drafting — they provide real data to work with.

**Delivers:** Automated lead creation from Mariages.net emails, duplicate detection, Twilio SMS + Free Mobile admin alerts, vCard generation, activity history skeleton

**Addresses features:** Mariages.net email parser, duplicate detection, lead CRUD with full field set, SMS notifications, email recap notifications, vCard generation

**Avoids pitfalls:** Mariages.net format-change silent corruption (quarantine + validation from day one); duplicate lead creation without idempotency; raw email body not persisted

**Research flag:** No additional research needed — Gmail Pub/Sub and lead parsing patterns are well-documented. Mariages.net email format should be captured from live examples early to inform the parser.

### Phase 3: Pipeline UI and Lead Management

**Rationale:** Once real leads exist in the database, the UI can be built against live data. The Kanban board and list view are table stakes that make the tool immediately usable as a Pipedrive replacement UI.

**Delivers:** Kanban pipeline board with custom stages, lead list with filters, lead detail view, lead status management, notes, activity history display, French-language UI

**Addresses features:** Kanban pipeline board, lead list with filters, lead status management, notes, activity / interaction history, French-language UI throughout, responsive layout

**Avoids pitfalls:** French UI strings hardcoded in component logic (use translation keys from the start)

**Research flag:** No additional research needed — Kanban, TanStack Table, and shadcn/ui are well-documented. Standard patterns apply.

### Phase 4: Pipedrive Bidirectional Sync

**Rationale:** Pipedrive sync is the migration safety net — William needs to keep using Pipedrive during the transition. This phase depends on the leads table and status management being stable (Phase 2-3) so sync state columns and conflict resolution can be built on a stable schema.

**Delivers:** Bidirectional Pipedrive sync (deals, contacts, stages), webhook receiver, loop prevention, Pipedrive field key resolution layer

**Addresses features:** Pipedrive bidirectional sync, lead status management sync

**Avoids pitfalls:** Bidirectional sync infinite loop (Redis suppression key designed in from start); hardcoded Pipedrive field keys (field resolution layer built here); Pipedrive Webhooks v1 (use Webhooks v2 which became default March 2025)

**Research flag:** Needs attention during planning. Pipedrive Webhooks v2 became the default in March 2025. Verify exact webhook event format and conflict resolution behaviour with live Pipedrive account before implementation. Custom field key mapping requires a pre-build audit of the existing weds.fr Pipedrive account.

### Phase 5: Integrated Gmail Inbox

**Rationale:** The Gmail adapter and Pub/Sub infrastructure are already built in Phase 1-2. This phase adds the inbox UI layer on top: reading threads, linking emails to leads, and composing replies from within the CRM. This is the feature that eliminates the "switch to Gmail tab" problem.

**Delivers:** Inbox view (Gmail threads in CRM), thread display with email-to-lead linking, reply composition from CRM, correct threadId handling for replies

**Addresses features:** Gmail bidirectional email sync, send email from CRM, email threading / conversation view, email-to-lead linking, email templates with variable substitution

**Avoids pitfalls:** Email reply sent with wrong threadId creating a new Gmail thread instead of continuing the conversation

**Research flag:** No additional research needed — Gmail API `messages.send` with threadId is documented. Template variable substitution is straightforward.

### Phase 6: AI Email Drafting

**Rationale:** AI drafting depends on both the lead data model (Phase 2) and the email thread context (Phase 5). It is the primary product differentiator and should be built after the inbox is working so the prompt can pull real email history as context.

**Delivers:** AI draft generation from lead + email thread context, draft review / edit UI, send workflow, GPT prompt stored in DB (replaces Google Docs dependency), pre-send field verification UI

**Addresses features:** AI email draft generation, draft review and edit workflow, GPT prompt template management in-app

**Avoids pitfalls:** AI draft with hallucinated facts (variable injection contract from structured lead fields only; UI highlights substitutions); auto-send without review (explicit Review → Edit → Send lifecycle; no auto-send path exists)

**Research flag:** No additional research needed — OpenAI `zodResponseFormat` structured output is documented. Prompt engineering for wedding photography tone is empirical — build and tune with real leads.

### Phase 7: Quality-of-Life and v1.x Features

**Rationale:** After William is using the system daily and the core workflow is validated, add the features that improve the experience without changing the core model.

**Delivers:** Full-text search across leads and emails, inline Gmail label management, WhatsApp messaging (pending API approval), lead duplicate merge UI

**Addresses features:** Search across leads and emails, inline Gmail label management, WhatsApp messaging to prospects, duplicate detection merge path

**Avoids pitfalls:** Duplicate leads shown without merge path

**Research flag:** WhatsApp Business API requires advance planning. The approval process for message templates takes weeks. Begin the WhatsApp Business API application process during Phase 5 or 6 so it is approved by the time Phase 7 begins. Twilio's WhatsApp sandbox can be used for development in the interim.

### Phase Ordering Rationale

- **Infrastructure before features:** OAuth, Secret Manager, and Cloud Run configuration are prerequisites for everything — getting them wrong causes cascading failures that are expensive to fix in later phases.
- **Data model before UI:** Lead CRUD and the parser must produce real data before any UI is worth building.
- **Sync after schema is stable:** Pipedrive sync writes to the leads table; the schema must be finalised before adding sync state columns to avoid migrations that alter sync-in-progress records.
- **Inbox before AI drafting:** AI drafts need email thread context. Building the inbox first means the AI prompt can be richer from day one.
- **Pitfalls addressed at the phase where they originate:** OAuth issues are Phase 1 problems. Sync loops are Phase 4 problems. Building prevention at the right phase is cheaper than retrofitting.

### Research Flags Summary

**Needs deeper research during planning:**
- **Phase 4 (Pipedrive Sync):** Webhooks v2 event format, conflict resolution behaviour, and custom field key audit require pre-implementation investigation against the live weds.fr Pipedrive account. Recommend running a `/gsd:research-phase` specifically on Pipedrive v2 webhook integration before planning this phase.
- **Phase 7 (WhatsApp):** WhatsApp Business API approval process timeline and Twilio WhatsApp template restrictions should be researched before committing to a delivery date.

**Standard patterns — skip research-phase:**
- **Phase 1:** GCP Cloud Run + Cloud SQL + Secret Manager deployment is well-documented with official Google codelabs.
- **Phase 2:** Gmail Pub/Sub + Drizzle ORM patterns are well-documented.
- **Phase 3:** Kanban UI, TanStack Table, and shadcn/ui have authoritative documentation.
- **Phase 5:** Gmail API `messages.send` with threadId is standard.
- **Phase 6:** OpenAI structured output is well-documented; prompt tuning is empirical.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified against npm registry; GCP integration patterns verified against official Google Cloud documentation |
| Features | HIGH (table stakes), MEDIUM (differentiators) | Table stakes verified against 6 competitor products; differentiator value estimates are based on workflow analysis, not user testing |
| Architecture | HIGH | Patterns (modular monolith, adapter isolation, job queue, sync loop prevention) are verified against official BullMQ, Gmail, and Pipedrive documentation; data flows are derived from documented API behaviours |
| Pitfalls | HIGH | All 7 critical pitfalls verified against official documentation or multiple independent sources; recovery strategies are documented |

**Overall confidence:** HIGH

### Gaps to Address

- **WhatsApp Business API approval timeline:** Cannot be predicted. Start the application process early. Use Twilio WhatsApp sandbox for development. Do not block Phase 7 completion on approval — ship the rest of Phase 7 and treat WhatsApp as a follow-on delivery.
- **Mariages.net email format:** The exact current email template from Mariages.net must be captured from William's live inbox before building the parser. The parser should be built from real examples, not guesswork. If the format has changed since the existing email-parser was written, the new parser must reflect the current format.
- **Pipedrive account field audit:** The existing weds.fr Pipedrive account contains custom fields with 40-character hash keys that the new CRM must map. A pre-build audit (list all custom fields + their current keys) should be run against the live account before Phase 4 begins. This audit should produce a config file that becomes the source of truth for sync field mapping.
- **Auth.js v5 maturity:** Auth.js v5 (next-auth@5) is in progress and uses a different config format from v4. The recommendation is to stay on v4 for stability. Reassess at the start of Phase 1 — if v5 is stable and App Router support is confirmed, migrating at project start is lower cost than migrating mid-build.

---

## Sources

### Primary (HIGH confidence)

- npm registry (live version checks) — all package versions in STACK.md
- [Google Cloud: Connect from Cloud Run to Cloud SQL](https://cloud.google.com/sql/docs/postgres/connect-run) — Cloud Run + Cloud SQL integration
- [Google Cloud: Pub/Sub + Cloud Run tutorial](https://docs.cloud.google.com/run/docs/tutorials/pubsub) — Pub/Sub push to Cloud Run
- [Gmail API Push Notifications](https://developers.google.com/workspace/gmail/api/guides/push) — watch(), historyId, Pub/Sub integration
- [Gmail API Usage Limits](https://developers.google.com/workspace/gmail/api/reference/quota) — quota and rate limit reference
- [Google OAuth 2.0 documentation](https://developers.google.com/identity/protocols/oauth2) — token expiry and revocation conditions
- [Cloud Run min-instances docs](https://docs.cloud.google.com/run/docs/configuring/min-instances) — warm instance configuration
- [GCP Cloud Run Secrets documentation](https://docs.cloud.google.com/run/docs/configuring/services/secrets) — Secret Manager integration
- [Drizzle ORM official site](https://orm.drizzle.team/) — ORM patterns and Cloud SQL connector
- [BullMQ official docs](https://docs.bullmq.io/) — queue configuration, repeatable jobs, rate limiting
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — Tailwind v4 compatibility
- [Pipedrive Webhooks v2 announcement](https://developers.pipedrive.com/changelog/post/breaking-change-webhooks-v2-will-become-the-new-default-version) — v2 default March 2025
- [Pipedrive token-based rate limits](https://developers.pipedrive.com/changelog/post/breaking-changes-token-based-rate-limits-for-api-requests) — rate limit documentation
- [Pipedrive Custom Fields API concepts](https://pipedrive.readme.io/docs/core-api-concepts-custom-fields) — 40-character hash key structure
- [OpenAI Node SDK GitHub](https://github.com/openai/openai-node) — structured output, zodResponseFormat
- [Pipedrive Webhooks v2 Guide](https://pipedrive.readme.io/docs/guide-for-webhooks-v2) — webhook event format

### Secondary (MEDIUM confidence)

- [Auth.js v5 migration guide](https://authjs.dev/getting-started/migrating-to-v5) — v5 App Router status (v4 recommendation is conservative)
- [Nango Blog: Why Google OAuth invalid_grant happens](https://nango.dev/blog/google-oauth-invalid-grant-token-has-been-expired-or-revoked) — refresh token revocation scenarios
- [Workato: Preventing Infinite Loops in Bidirectional Sync](https://www.workato.com/product-hub/how-to-prevent-infinite-loops-in-bi-directional-data-syncs/) — loop prevention techniques
- [Motii: 5 Common Pipedrive Integration Mistakes](https://www.motii.co/post/5-common-pipedrive-integration-mistakes-and-how-to-avoid-them) — data mapping and sync pitfalls
- [OpenAI SDK vs Vercel AI SDK comparison (Strapi blog, 2026)](https://strapi.io/blog/openai-sdk-vs-vercel-ai-sdk-comparison) — corroborates direct SDK recommendation
- [Drizzle vs Prisma comparison (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/drizzle-vs-prisma/) — cold start and ORM comparison
- Competitor analysis: HoneyBook, Dubsado, Studio Ninja, Sprout Studio, NetHunt CRM — feature landscape

---
*Research completed: 2026-03-10*
*Ready for roadmap: yes*
