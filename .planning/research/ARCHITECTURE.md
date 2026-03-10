# Architecture Research

**Domain:** Single-user CRM with integrated email client, AI drafting, pipeline management, and bidirectional external CRM sync
**Researched:** 2026-03-10
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │  Pipeline /  │  │  Inbox       │  │  Lead Detail /      │   │
│  │  Kanban View │  │  (Gmail UI)  │  │  Draft Editor       │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘   │
└─────────┼─────────────────┼──────────────────────┼─────────────┘
          │ REST/WS          │ REST                  │ REST
┌─────────┼─────────────────┼──────────────────────┼─────────────┐
│         │         API Gateway / Router             │            │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌────────────▼──────────┐  │
│  │  Leads      │  │  Email       │  │  AI Draft             │  │
│  │  Module     │  │  Module      │  │  Module               │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────┬──────────┘  │
│         │                │                        │            │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌────────────▼──────────┐  │
│  │  Pipedrive  │  │  Gmail       │  │  OpenAI               │  │
│  │  Sync Mod.  │  │  Adapter     │  │  Adapter              │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────────────────┘  │
│         │                │                                      │
│  ┌──────▼──────┐  ┌──────▼───────┐                             │
│  │  Job Queue  │  │  Job Queue   │                             │
│  │  (Pipedrive │  │  (Email      │                             │
│  │   sync)     │  │   ingestion) │                             │
│  └─────────────┘  └──────────────┘                             │
│                   Background Service Layer                      │
└────────────────────────────────────┬────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────┐
│                        Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  PostgreSQL  │  │  Redis       │  │  Google Drive        │   │
│  │  (primary    │  │  (job queue, │  │  (vCards, doc        │   │
│  │   store)     │  │   cache)     │  │   templates)         │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Frontend** | React SPA — pipeline view, inbox, lead detail, draft editor | API via REST, WebSocket for live updates |
| **API Router** | Request routing, auth validation, rate limiting | All modules |
| **Leads Module** | Lead CRUD, pipeline status, duplicate detection, notes | DB, Pipedrive Sync, AI Draft, Notification |
| **Email Module** | Inbox display, reply, labeling, email-to-lead linking | Gmail Adapter, Leads Module, AI Draft |
| **AI Draft Module** | Generate drafts from lead context, manage draft state (review / edit / send) | OpenAI Adapter, Leads Module, Email Module |
| **Pipedrive Sync Module** | Bidirectional push/pull of deals, persons, stages | Pipedrive API, Leads Module, Job Queue |
| **Notification Module** | SMS (Twilio), admin alert (Free Mobile), email recap | Twilio API, Free Mobile API, Gmail Adapter |
| **Gmail Adapter** | Gmail API wrapper — poll/watch, send, label, fetch threads | Gmail API (Google), Pub/Sub listener |
| **OpenAI Adapter** | LLM API wrapper — prompt construction, response parsing | OpenAI API |
| **Job Queue (BullMQ)** | Async processing — email ingestion, sync tasks, watch renewal | Redis, worker processes |
| **PostgreSQL** | Source of truth for all leads, contacts, emails, drafts, sync state | All server-side modules |
| **Redis** | BullMQ backing store, session cache, dedup tracking | BullMQ workers |

## Recommended Project Structure

```
src/
├── modules/                   # Domain-organized business logic
│   ├── leads/
│   │   ├── leads.routes.ts    # Express routes for lead CRUD
│   │   ├── leads.service.ts   # Business logic
│   │   ├── leads.repo.ts      # DB queries (Drizzle/Prisma)
│   │   ├── leads.schema.ts    # Zod validation schemas
│   │   └── index.ts           # Module export
│   ├── email/
│   │   ├── email.routes.ts    # Inbox, reply, labeling endpoints
│   │   ├── email.service.ts   # Thread management, email-lead linking
│   │   ├── email.repo.ts      # Stored email/thread records
│   │   ├── email.schema.ts
│   │   └── index.ts
│   ├── ai-draft/
│   │   ├── draft.routes.ts    # Generate, review, edit, send
│   │   ├── draft.service.ts   # Prompt assembly, draft lifecycle
│   │   ├── draft.repo.ts      # Draft persistence
│   │   └── index.ts
│   ├── pipedrive-sync/
│   │   ├── sync.routes.ts     # Webhook receiver endpoint
│   │   ├── sync.service.ts    # Bidirectional sync logic, loop prevention
│   │   ├── sync.repo.ts       # Sync state / last-synced tracking
│   │   └── index.ts
│   └── notifications/
│       ├── notify.service.ts  # SMS, admin alert, recap email
│       └── index.ts
├── adapters/                  # Thin wrappers around external APIs
│   ├── gmail.adapter.ts       # Gmail API calls, Pub/Sub handler
│   ├── openai.adapter.ts      # LLM call, prompt construction
│   ├── pipedrive.adapter.ts   # Pipedrive REST API calls
│   ├── twilio.adapter.ts      # SMS sending
│   └── freemobile.adapter.ts  # Admin SMS
├── workers/                   # BullMQ job workers
│   ├── email-ingestion.worker.ts   # Parse new emails, create leads
│   ├── pipedrive-push.worker.ts    # Push local changes to Pipedrive
│   ├── gmail-watch-renew.worker.ts # Renew Gmail watch every 6 days
│   └── notification.worker.ts
├── queues/                    # Queue definitions
│   ├── email.queue.ts
│   ├── sync.queue.ts
│   └── index.ts
├── db/
│   ├── schema/                # Table definitions (Drizzle ORM)
│   │   ├── leads.ts
│   │   ├── emails.ts
│   │   ├── drafts.ts
│   │   └── sync-state.ts
│   ├── migrations/
│   └── client.ts              # DB connection singleton
├── lib/
│   ├── auth.ts                # Google OAuth 2.0 flow
│   ├── logger.ts
│   └── config.ts              # Env var validation (zod)
├── app.ts                     # Express app, middleware, route mounting
└── server.ts                  # Entry point, queue startup
```

### Structure Rationale

- **modules/:** Domain-first grouping (leads, email, ai-draft) means each feature is self-contained — routes, service, and repo together. Easier to follow data flow per feature than MVC-split folders.
- **adapters/:** Strict boundary between internal business logic and external API clients. Swapping an API (e.g., OpenAI → Anthropic) touches only the adapter, not the service.
- **workers/:** Isolated from HTTP handlers. BullMQ workers run in the same process but are logically separated. Job failure does not crash the API.
- **queues/:** Queue registration centralized so workers and producers share the same queue names and options.
- **db/schema/:** Drizzle schema files co-located. Migrations generated from schema diffs.

## Architectural Patterns

### Pattern 1: Modular Monolith

**What:** Single deployment unit with strict internal module boundaries. Modules communicate via imported service functions (not HTTP), sharing one DB connection.

**When to use:** Single-user, single-deployment (Cloud Run). No operational benefit to splitting services. All code scales together. Simplest to debug.

**Trade-offs:** All modules share the same process memory and crash domain. For this project (one user, Cloud Run) this is a non-issue. Can be extracted to microservices later if needed since module boundaries are already enforced.

```typescript
// leads.service.ts — imports directly, no HTTP between modules
import { gmailAdapter } from '../../adapters/gmail.adapter';
import { notifyService } from '../notifications/notify.service';

export async function createLead(data: NewLead) {
  const dupe = await checkDuplicate(data.email);
  if (dupe) return { status: 'duplicate', existing: dupe };
  const lead = await leadsRepo.insert(data);
  await notifyService.sendAdminAlert(lead);
  return lead;
}
```

### Pattern 2: Adapter Isolation for External APIs

**What:** Every external service (Gmail, Pipedrive, OpenAI, Twilio) lives behind an adapter with a typed interface. Business logic never calls external APIs directly.

**When to use:** Always. This is not optional for a system with 5+ external dependencies.

**Trade-offs:** Minimal overhead. Massive benefit when APIs change (Pipedrive v2 field IDs, Gmail API scopes). Enables mocking in tests.

```typescript
// adapters/pipedrive.adapter.ts
export const pipedriveAdapter = {
  async createDeal(payload: PipedriveDeal): Promise<PipedriveResponse> {
    // Pipedrive-specific API call here
  },
  async updateDeal(id: string, fields: Partial<PipedriveDeal>): Promise<PipedriveResponse> {
    // ...
  }
};

// pipedrive-sync/sync.service.ts uses adapter, not axios directly
import { pipedriveAdapter } from '../../adapters/pipedrive.adapter';
```

### Pattern 3: Job Queue for All Async Operations

**What:** Any operation that is slow, retryable, or externally dependent goes through BullMQ. HTTP handlers enqueue jobs and return immediately. Workers process independently.

**When to use:** Gmail email ingestion, Pipedrive sync pushes, notification delivery, Gmail watch renewal.

**Trade-offs:** Adds Redis dependency. Worth it: email ingestion from Gmail can be slow (API latency), Pipedrive API has rate limits, notifications must retry on failure.

```typescript
// workers/email-ingestion.worker.ts
worker.process(async (job) => {
  const { historyId, emailAddress } = job.data;
  const messages = await gmailAdapter.listHistory(historyId);
  for (const msg of messages) {
    await leadsService.createFromEmail(msg); // duplicate-checked inside
  }
});
```

### Pattern 4: Sync Loop Prevention via Origin Flag

**What:** When pushing a change to Pipedrive, store a `sync_source = 'local'` flag on the record in the DB before the push. When Pipedrive fires its webhook back with the same change, check the flag and discard the event.

**When to use:** Required for all bidirectional sync. Without it, every local update triggers an infinite Pipedrive-webhook-update loop.

**Trade-offs:** Requires careful flag lifecycle management (set before push, clear after webhook acknowledged). Race conditions possible if webhook arrives before flag is set — solved by short TTL in Redis rather than DB flag.

```typescript
// sync.service.ts
async function pushLeadToPipedrive(leadId: string) {
  // Mark this lead as "being synced by us" — webhook suppression window
  await redis.set(`sync:suppress:${leadId}`, '1', 'EX', 10); // 10s TTL
  await pipedriveAdapter.updateDeal(lead.pipedriveDealId, fields);
}

// Pipedrive webhook handler
async function handlePipedriveWebhook(event) {
  const leadId = await resolveLocalId(event.data.id);
  const suppressed = await redis.get(`sync:suppress:${leadId}`);
  if (suppressed) return; // our own update, discard
  await leadsService.applyPipedriveChange(event);
}
```

### Pattern 5: AI Draft as a Lifecycle, Not a Direct Send

**What:** AI-generated drafts are never auto-sent. They follow a state machine: `pending_review` → `approved` (with optional edits) → `sent`. The HTTP response returns the draft for review; sending is a separate explicit action.

**When to use:** Every AI-generated email in this system. Trust but verify.

**Trade-offs:** Adds UI state complexity. Worth it: single-user system where William reviews every draft before sending.

```typescript
type DraftStatus = 'pending_review' | 'approved' | 'sent' | 'discarded';

// draft.service.ts
async function generateDraft(leadId: string): Promise<Draft> {
  const context = await buildLeadContext(leadId); // lead + email history
  const content = await openaiAdapter.generateDraft(context);
  return draftsRepo.insert({ leadId, content, status: 'pending_review' });
}
```

## Data Flow

### Lead Ingestion Flow (Mariages.net via Gmail)

```
Gmail receives Mariages.net email
    ↓
Gmail Pub/Sub notification → Pub/Sub topic
    ↓
Cloud Run receives push notification (HTTP POST)
    ↓
gmail-watch-listener → enqueue job in email.queue
    ↓
email-ingestion.worker → gmailAdapter.fetchMessage()
    ↓
Parse lead fields (name, date, message, source)
    ↓
leadsService.createFromEmail()
    ├── checkDuplicate() → if exists, skip or merge
    ├── leadsRepo.insert() → PostgreSQL
    ├── pipedriveSync.enqueueCreate() → sync.queue
    └── notifyService.sendAdminAlert() → Twilio / Free Mobile
```

### Bidirectional Pipedrive Sync Flow

```
[Local change]                        [Pipedrive change]
      ↓                                       ↓
leadsService.update()              Pipedrive fires webhook
      ↓                                       ↓
redis.set(suppress, 10s)          POST /webhooks/pipedrive
      ↓                                       ↓
sync.queue.add(push)           check redis suppress flag
      ↓                                ↓             ↓
pipedrive-push.worker()          suppressed      not suppressed
      ↓                              ↓                  ↓
pipedriveAdapter.updateDeal()    discard        leadsService.applyChange()
      ↓                                               ↓
Pipedrive fires webhook back                    leadsRepo.update()
      ↓                                    (no suppress set → no loop)
check redis suppress flag
      ↓
suppressed → discard
```

### AI Draft Flow

```
User opens lead detail → clicks "Generate Draft"
    ↓
POST /api/drafts/generate { leadId }
    ↓
draft.service.generateDraft()
    ├── leadsRepo.getWithEmailHistory(leadId)
    ├── build system prompt + lead context
    └── openaiAdapter.generate(prompt)
    ↓
draftsRepo.insert({ status: 'pending_review' })
    ↓
Return draft to frontend for review
    ↓
User edits (optional) → clicks "Send"
    ↓
POST /api/drafts/:id/send
    ↓
gmailAdapter.send(threadId, editedContent)
    ↓
draftsRepo.update({ status: 'sent' })
    ↓
emailRepo.linkToLead(messageId, leadId)
```

### Gmail Watch Renewal Flow

```
Scheduled job (every 6 days via BullMQ repeat)
    ↓
gmail-watch-renew.worker
    ↓
gmailAdapter.watch({ topicName, labelIds: ['INBOX'] })
    ↓
Store new historyId in DB
    ↓
Log renewal success
```

## Integration Points

### External Services

| Service | Integration Pattern | Key Constraints |
|---------|---------------------|-----------------|
| **Gmail API** | Pub/Sub push notifications + REST (send, fetch, label) | watch() expires every 7 days — must renew. OAuth 2.0 with `gmail.modify` + `drive` + `documents.readonly` scopes. |
| **Google Pub/Sub** | Push subscription to Cloud Run endpoint | Acknowledge with HTTP 200 within 10s or message redelivered. Pub/Sub is the preferred approach over polling — eliminates rate limit pressure. |
| **Pipedrive API** | Outbound REST (push) + inbound webhooks (pull). Webhooks v2 default from March 2025. | Custom field IDs are hardcoded to weds.fr account — store in config, not code. |
| **OpenAI API** | Synchronous HTTP via adapter | Context window size limits — trim email history if needed. Add timeout + retry with exponential backoff. |
| **Twilio** | REST API for SMS to prospects | Single send path, no webhook needed. |
| **Free Mobile** | HTTP GET to their alert API | Admin-only, no auth needed beyond API key. |
| **Google Drive** | Read-only for GPT prompt template doc | `documents.readonly` scope. Cache template locally after first read — avoid fetching on every AI call. |

### Internal Boundaries

| Boundary | Communication | Rule |
|----------|---------------|------|
| Frontend ↔ API | REST (JSON) + optional WebSocket for pipeline updates | No business logic in frontend — it is display + form only |
| Email Module ↔ Leads Module | Direct service function call | Email module calls `leadsService.linkEmail()` — never writes to leads table directly |
| AI Draft Module ↔ Email Module | Direct service call for send | Draft module delegates actual send to email service — never calls Gmail adapter directly |
| Pipedrive Sync ↔ Leads Module | Events via Job Queue (push) and direct call (apply inbound change) | Sync module never writes to leads table directly — calls leadsService |
| All Modules ↔ External APIs | Adapter layer only | No module imports `axios` or `googleapis` directly |
| Workers ↔ Business Logic | Workers import services, not repos | Workers call `leadsService.createFromEmail()`, not `leadsRepo.insert()` |

## Anti-Patterns

### Anti-Pattern 1: Polling Gmail Instead of Pub/Sub

**What people do:** Set up a cron job that polls Gmail every N seconds via `messages.list`.

**Why it's wrong:** Gmail API has rate limits. Frequent polling for a mailbox that rarely changes wastes quota. Pub/Sub push gives sub-second notification at zero extra cost. The existing email-parser project uses polling — this is the pattern to replace.

**Do this instead:** `gmail.watch()` + Google Cloud Pub/Sub push subscription to a Cloud Run endpoint. Renew watch every 6 days with a BullMQ repeatable job.

### Anti-Pattern 2: Sending AI Drafts Automatically

**What people do:** Auto-send LLM output as soon as it is generated, or require only a single click to approve without showing the draft.

**Why it's wrong:** LLMs hallucinate details — wrong event date, wrong couple's name, wrong tone. For a photography business, a bad email damages client relationships.

**Do this instead:** Persist draft with `status: 'pending_review'`. Require explicit "Review → Edit → Send" flow. Never send without user seeing the content first.

### Anti-Pattern 3: Writing Sync Logic Without Loop Prevention

**What people do:** Implement Pipedrive sync as: local update → push to Pipedrive → Pipedrive fires webhook → local update → infinite loop.

**Why it's wrong:** Cascading updates that fill logs, hit rate limits, and corrupt data with stale overwrites.

**Do this instead:** Before pushing to Pipedrive, set a short-TTL Redis key for that record. Webhook handler checks for the key and discards events originating from our own push. See Pattern 4 above.

### Anti-Pattern 4: Duplicate Lead Creation Without Idempotency

**What people do:** Process every incoming email as a new lead without checking if the contact already exists.

**Why it's wrong:** Mariages.net sends follow-up emails, auto-reminders, and duplicates. Creating a lead per email floods the pipeline.

**Do this instead:** Check by email address (and optionally event date) before inserting. Store the Gmail `messageId` so the same message is never processed twice. Log duplicates for review rather than silently dropping.

### Anti-Pattern 5: Storing Pipedrive Field IDs as Magic Strings

**What people do:** Hardcode Pipedrive custom field keys like `"abc123xyz"` inline in sync logic.

**Why it's wrong:** These IDs are account-specific and change if fields are recreated. When they break, the failure is silent (field just isn't written).

**Do this instead:** Store all Pipedrive field keys in a validated config object loaded from environment variables. Fail loudly at startup if required field IDs are missing.

## Scaling Considerations

This is a single-user system. Scaling is irrelevant — the focus is reliability and operational simplicity.

| Concern | Approach |
|---------|----------|
| Single user, low volume | Modular monolith on Cloud Run, 1 instance, min 0 (scale to zero when idle) |
| Email bursts (Mariages.net sends batches) | BullMQ absorbs bursts; worker concurrency tuned to rate limits |
| Pipedrive API rate limits | Job queue with rate limiting enforced at worker level |
| Gmail watch expiry | BullMQ repeatable job every 6 days is more reliable than a cron |
| OpenAI latency | Drafts are async from the user's perspective — generate is near-instant, send is intentional |

## Suggested Build Order

Module dependencies determine build order. Each phase can only be built after its dependencies are stable.

```
Phase 1: Foundation
    PostgreSQL schema + Drizzle ORM + Express skeleton + config/auth
    (no dependencies — enables all subsequent phases)

Phase 2: Lead Capture + Storage
    Gmail Adapter + Pub/Sub listener + Email Ingestion Worker + Leads Module
    (depends on: Phase 1)

Phase 3: Pipeline UI
    Frontend — Kanban board, list view, lead detail, status management
    (depends on: Phase 2 — needs real leads to display)

Phase 4: Pipedrive Sync
    Pipedrive Adapter + Sync Module + Loop Prevention + Bidirectional Webhook
    (depends on: Phase 2 — needs leads table with sync state columns)

Phase 5: Integrated Inbox
    Email Module — inbox view, thread display, reply, email-to-lead linking
    (depends on: Phase 2 — Gmail adapter already built; Phase 3 — UI shell exists)

Phase 6: AI Drafting
    OpenAI Adapter + Draft Module + Draft lifecycle UI
    (depends on: Phase 5 — needs email thread context for prompt; Phase 3 — UI shell)

Phase 7: Notifications
    Notification Module — SMS (Twilio), admin alert (Free Mobile), email recap
    (depends on: Phase 2 — fires on lead creation; can be wired in earlier)
```

## Sources

- [CRM Systems: Architecture Pattern, Data Modeling Strategies — DZone](https://dzone.com/articles/scalable-crm-architecture-and-data-modeling)
- [13 Essential Components of CRM Architecture — The Pulse Spot](https://thepulsespot.com/blog/small-business-success/13-critical-components-of-crm-architecture-for-businesses-3-3)
- [Bi-Directional Sync Explained — StackSync](https://www.stacksync.com/blog/bi-directional-sync-explained-3-real-world-examples)
- [Gmail Push Notifications — Google Developers](https://developers.google.com/gmail/api/guides/push)
- [Pipedrive Webhooks v2 Guide — Pipedrive Developers](https://pipedrive.readme.io/docs/guide-for-webhooks-v2)
- [Pipedrive Webhook API Reference](https://developers.pipedrive.com/docs/api/v1/Webhooks)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Modular Monolith for Node.js — The T-Shaped Dev](https://thetshaped.dev/p/how-to-better-structure-your-nodejs-project-modular-monolith)
- [Webhook Infinite Loop Prevention — HubSpot Community](https://community.hubspot.com/t5/APIs-Integrations/Webhook-Infinite-Loop/m-p/549153)
- [Capture Leads with Gmail API & Pub/Sub — OutrightCRM](https://www.outrightcrm.com/blog/gmail-api-pubsub-lead-capture-crm/)
- [Building Real-Time Gmail Processing Pipeline with Pub/Sub — SmythOS](https://smythos.com/developers/agent-integrations/building-a-real-time-gmail-processing-pipeline-with-pub-sub-webhooks/)

---
*Architecture research for: Single-user wedding photography CRM (weds.fr)*
*Researched: 2026-03-10*
