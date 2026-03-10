# Stack Research

**Domain:** Custom CRM — email client integration, AI drafting, pipeline management, Pipedrive sync
**Researched:** 2026-03-10
**Confidence:** HIGH (core stack verified via npm, official docs, and multiple corroborating sources)

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1.6 | Full-stack framework (API + UI) | Single repo handles both Route Handlers (backend API) and React frontend. App Router's Route Handlers use web-standard Request/Response — no separate Express server needed. Official GCP Cloud Run + Cloud SQL codelabs use Next.js. Eliminates a second Dockerfile and deployment target. |
| TypeScript | 5.9.3 | Type safety throughout | Non-negotiable for a project touching Gmail OAuth tokens, Pipedrive field IDs, AI payloads, and database schemas simultaneously. Zod schemas infer TS types directly. |
| React | 19.2.4 | UI rendering | Paired with Next.js App Router. React 19's `use()` hook and improved Server Components reduce client-side state complexity for data-heavy CRM views. |

### Database

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| PostgreSQL (Cloud SQL) | managed | Primary data store | Relational model fits CRM data (leads, deals, contacts, email threads, notes with FK relationships). Cloud SQL for PostgreSQL is GCP's managed offering — no self-managed Postgres needed. Direct VPC integration with Cloud Run via Unix socket, no Cloud SQL Proxy required for Cloud Run. |
| Drizzle ORM | 0.45.1 | Database access layer | Code-first TypeScript schemas (no separate `.prisma` file or codegen step). Zero binary dependencies — critical for Cloud Run cold starts. SQL-native mental model avoids N+1 surprises. `drizzle-kit` for migrations. **Use `drizzle-orm/node-postgres` driver with Cloud SQL Node.js Connector.** |
| drizzle-kit | 0.31.9 | Schema migrations | Companion to Drizzle ORM. Generates and applies SQL migrations from schema changes. |

### Authentication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Auth.js (next-auth) | 4.24.13 | Session management + Google OAuth | Single-user app, but still needs secure session cookies so the UI isn't public. Auth.js v4 is stable and battle-tested with Next.js. Google OAuth provider built-in — reuses the Google OAuth client already used for Gmail API. Restrict login to `contact@weds.fr` via `signIn` callback. |
| @auth/drizzle-adapter | 1.11.1 | Persist sessions in PostgreSQL | Stores sessions/accounts in Drizzle-managed tables so sessions survive Cloud Run instance restarts. |
| google-auth-library | 10.6.1 | Gmail API OAuth token management | Google's own library for OAuth2 token refresh flows. Used separately from Auth.js to manage the `gmail.modify` + `drive` + `documents.readonly` token with full refresh capability. |

### Gmail Integration

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| googleapis | 171.4.0 | Gmail API, Drive API, Docs API | Official Google Node.js client. Handles all existing scopes: `gmail.modify`, `drive`, `documents.readonly`. Already used in the email-parser predecessor. TypeScript types included. |
| @google-cloud/pubsub | 5.3.0 | Gmail push notification receiver | Gmail push requires a Cloud Pub/Sub topic. Since the app runs on Cloud Run (same GCP project), Pub/Sub push subscription delivers to the Cloud Run service endpoint via HTTP POST — no polling required. `watch()` must be renewed every 7 days — schedule this via BullMQ repeatable job. |

### Background Jobs

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| BullMQ | 5.70.4 | Job queue for async tasks | All Pipedrive sync operations, outbound SMS/WhatsApp, email sends, Gmail `watch()` renewal, and AI draft generation should be queued — not executed inline with HTTP requests. BullMQ is the modern successor to Bull, written in TypeScript, with repeatable jobs (for watch renewal), retries, and rate limiting (critical for Pipedrive's token-based rate limits). |
| redis | 5.11.0 | BullMQ backing store | BullMQ requires Redis. Use GCP Memorystore for Redis (managed) or a small Redis instance on Cloud Run for dev. Single-instance Redis is sufficient for a single-user app. |

### AI Features

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| openai | 6.27.0 | AI email draft generation | Official OpenAI Node.js SDK. Direct SDK (not Vercel AI SDK) is the right call here: email drafting is a backend-only, non-streaming generation task. Smaller bundle (34kB gzipped), no Edge runtime requirement, OpenAI-native structured outputs via `zodResponseFormat`. |

### External Integrations

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| twilio | 5.12.2 | SMS to prospects | Already used in the email-parser. Official SDK, native TypeScript types. Used for outbound SMS via BullMQ job. |
| fetch (Node.js built-in) | built-in | Free Mobile API, Pipedrive API | No SDK needed for Free Mobile (simple GET request). Pipedrive v1 REST API is straightforward enough with native fetch — adding a Pipedrive SDK introduces a dependency on a third-party wrapper with uneven maintenance. |

### Frontend Data Layer

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TanStack Query | 5.90.21 | Client-side data fetching + cache | Provides optimistic updates, background refetch, and cache invalidation — essential for a CRM where lead status changes, email sends, and pipeline updates must feel instant. Used for client components that need real-time-like behaviour. |
| TanStack Table | 8.21.3 | Lead list / email list tables | Server-side pagination, sorting, and filtering for lead lists. Headless — composable with ShadCN UI table primitives. |

### UI Components

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tailwind CSS | 4.2.1 | Utility-first styling | Standard for 2025 Next.js projects. v4 works with ShadCN. No custom CSS authoring. |
| shadcn/ui | latest (CLI) | Component library | Copy-paste component system built on Radix UI primitives. Fully accessible. Kanban board, forms, dialogs, command palette — all available. Not a dependency (components live in `src/components/ui`) so no version lock-in. |
| lucide-react | 0.577.0 | Icons | Default icon set for shadcn/ui. |

### Validation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Zod | 4.3.6 | Schema validation | v4 is now stable. Use at API boundary (Route Handler request bodies), Drizzle insert schemas (`createInsertSchema`), AI response parsing (`zodResponseFormat`), and environment variable validation. Single validation library used throughout. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint + @typescript-eslint | Linting | Next.js ships ESLint config by default; extend with TypeScript rules |
| Prettier | Code formatting | Add `prettier-plugin-tailwindcss` for automatic class sorting |
| Docker | Local dev parity + production build | Multi-stage Dockerfile: `node:22-alpine` builder, `node:22-alpine` runner. Build standalone Next.js output (`output: 'standalone'` in `next.config.ts`) for minimal image size. |
| dotenv / .env.local | Secret management in dev | In production use GCP Secret Manager, referenced in Cloud Run service config as env vars |

---

## Installation

```bash
# Core framework
npm install next@latest react@latest react-dom@latest typescript@latest

# Database
npm install drizzle-orm pg @google-cloud/cloud-sql-connector
npm install -D drizzle-kit @types/pg

# Authentication
npm install next-auth @auth/drizzle-adapter google-auth-library

# Google APIs
npm install googleapis @google-cloud/pubsub

# Background jobs
npm install bullmq redis

# AI
npm install openai

# External integrations
npm install twilio

# Validation
npm install zod

# Frontend data
npm install @tanstack/react-query @tanstack/react-table

# UI
npm install tailwindcss@latest lucide-react
# shadcn/ui: installed via CLI, not npm directly
npx shadcn@latest init

# Dev tools
npm install -D eslint prettier prettier-plugin-tailwindcss @typescript-eslint/eslint-plugin
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js (full-stack) | Fastify (backend) + Vite React (frontend) | When the API is shared with multiple clients (mobile, third parties). For a single-user internal tool with one web frontend, the monorepo overhead is not worth it. |
| Drizzle ORM | Prisma | When team velocity is the primary concern and cold-start latency is not. Prisma 7 dropped the Rust engine (pure TS now) — reassess if Drizzle's API proves limiting. |
| Auth.js v4 | Custom JWT middleware | When you control all clients (mobile, CLI). Auth.js is justified here to get Google OAuth + session cookies without reimplementing secure cookie logic. |
| openai SDK directly | Vercel AI SDK | When you need streaming responses in the browser or multi-provider flexibility. Email drafting is a backend job, not a streaming chat UI — direct SDK is simpler. |
| BullMQ + Redis | pg-boss (Postgres-backed queue) | When you want to avoid a Redis dependency entirely. `pg-boss` uses the existing PostgreSQL instance as a queue. Valid for single-user scale; switch to it if Redis adds operational cost. |
| Native `fetch` for Pipedrive | `pipedrive` npm package | When you need the full type-generated Pipedrive SDK. The official `pipedrive` npm package exists but is not well-maintained for v2. Raw fetch with typed response schemas (Zod) is more reliable. |
| Cloud SQL for PostgreSQL | Cloud Firestore | When the data model is truly document-oriented and never relational. CRM data is inherently relational (lead → emails → notes → deal). |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Prisma (v6 or earlier, pre-v7) | Rust query engine binary adds 200–400ms cold start to Cloud Run. Even with connection pooling, the engine spawns per-instance. | Drizzle ORM — zero binary deps, identical cold-start profile to plain `pg`. |
| Express.js as separate backend | A second service doubles deployment complexity (two Cloud Run services, two Dockerfiles, CORS config). No meaningful benefit for a single-user app. | Next.js Route Handlers cover all API needs. |
| Axios | Redundant when Node.js 22 ships native `fetch`. Adds bundle weight for no practical gain in this use case. | Native `fetch` or `undici` if you need more control. |
| Bull (original, not BullMQ) | Bull is in maintenance mode — last major release was 2021. BullMQ is the maintained rewrite. | BullMQ |
| `node-cron` for Gmail watch renewal | Cron jobs in a Cloud Run container are unreliable — Cloud Run scales to zero and kills the process. | BullMQ repeatable job (Redis-backed, survives restarts) |
| Moment.js | 67kB, no tree-shaking, deprecated for new projects. | `dayjs` (2kB) or native `Intl` — dates in this app are simple (event dates, timestamps). |
| `nodemailer` for sending email | The Gmail API is already authenticated via OAuth2 with `gmail.modify` scope. `nodemailer` via SMTP is an additional credential surface. | `googleapis` Gmail API `messages.send` — same SDK already used for reading. |
| LangChain | Significant abstraction overhead for a focused email-drafting use case. Debugging prompt chains in LangChain is painful. | Direct `openai` SDK with `zodResponseFormat` for structured output. LangChain is worth considering only if agentic multi-step reasoning is added later. |

---

## Stack Patterns by Variant

**For Gmail inbox (read/reply):**
- Use `googleapis` with stored OAuth2 refresh tokens (persisted in DB via Drizzle)
- Use Cloud Pub/Sub push subscription to trigger new-email processing
- History API pattern: store `historyId` per user, diff on each notification
- Route Handler at `/api/pubsub/gmail` receives Pub/Sub push messages

**For Pipedrive sync:**
- All API calls go through BullMQ jobs to respect token-based rate limits
- Implement exponential backoff on 429 responses
- Store Pipedrive deal ID on each lead row for bidirectional lookup
- Webhook registration on Pipedrive side pushes changes to `/api/webhooks/pipedrive`

**For AI email drafts:**
- Generate draft in BullMQ job (not inline with UI request)
- Store draft in DB with `status: 'pending_review'`
- UI polls (TanStack Query) or receives optimistic update when draft is ready
- Use `gpt-4o` model with structured output via `zodResponseFormat` to enforce JSON schema

**For Cloud Run deployment:**
- Set `minInstances: 1` to eliminate cold starts (single-user app — one warm instance is sufficient and costs ~$10/month)
- Use `output: 'standalone'` in `next.config.ts` for minimal Docker image
- Connect to Cloud SQL via Cloud SQL Node.js Connector (Unix socket in production, TCP in local dev)
- Store secrets in GCP Secret Manager; mount as env vars in Cloud Run service definition

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next@16.x | react@19.x, react-dom@19.x | Next.js 16 targets React 19. Do not mix React 18. |
| drizzle-orm@0.45.x | drizzle-kit@0.31.x | ORM and kit must be kept in sync — breaking changes between minor versions have occurred historically. |
| next-auth@4.x | @auth/drizzle-adapter@1.x | Auth.js v5 (`next-auth@5`) uses a different config format. Stick with v4 until v5 is fully stable for App Router. |
| tailwindcss@4.x | shadcn/ui (latest CLI) | shadcn/ui officially supports Tailwind v4 as of early 2025. Do NOT use shadcn/ui with Tailwind v3 configuration. |
| openai@6.x | Node.js 20+ | SDK requires Node.js LTS 20 or later. Cloud Run base image should be `node:22-alpine`. |
| bullmq@5.x | redis@5.x | BullMQ 5.x requires Redis 7.x or later. Verify Memorystore version if using GCP managed Redis. |
| googleapis@171.x | google-auth-library@10.x | Both maintained by Google. Minor version drift is generally safe; keep both updated together. |

---

## Sources

- npm registry (live version checks) — `next`, `drizzle-orm`, `openai`, `googleapis`, `bullmq`, `twilio`, `zod`, `react`, `@tanstack/react-query`, `tailwindcss`, `@google-cloud/pubsub`, `redis`, `pg`, `next-auth`, `@auth/drizzle-adapter`, `google-auth-library` — HIGH confidence
- [Google Cloud: Connect from Cloud Run to Cloud SQL (official docs)](https://cloud.google.com/sql/docs/postgres/connect-run) — HIGH confidence
- [Google Cloud: Pub/Sub + Cloud Run tutorial (official docs)](https://docs.cloud.google.com/run/docs/tutorials/pubsub) — HIGH confidence
- [Gmail API Push Notifications (official docs)](https://developers.google.com/workspace/gmail/api/guides/push) — HIGH confidence
- [Cloud Run min-instances docs](https://docs.cloud.google.com/run/docs/configuring/min-instances) — HIGH confidence
- [Drizzle ORM official site](https://orm.drizzle.team/) — HIGH confidence
- [BullMQ official docs](https://docs.bullmq.io/) — HIGH confidence
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — HIGH confidence
- [Auth.js v5 migration guide](https://authjs.dev/getting-started/migrating-to-v5) — MEDIUM confidence (v5 is in progress; v4 recommendation is conservative)
- [Pipedrive token-based rate limits (official changelog)](https://developers.pipedrive.com/changelog/post/breaking-changes-token-based-rate-limits-for-api-requests) — HIGH confidence
- [OpenAI Node SDK GitHub](https://github.com/openai/openai-node) — HIGH confidence
- [OpenAI SDK vs Vercel AI SDK comparison (Strapi blog, 2026)](https://strapi.io/blog/openai-sdk-vs-vercel-ai-sdk-comparison) — MEDIUM confidence (third-party, but corroborates official docs)
- [Drizzle vs Prisma comparison (Better Stack)](https://betterstack.com/community/guides/scaling-nodejs/drizzle-vs-prisma/) — MEDIUM confidence

---

*Stack research for: Weds CRM — custom CRM with Gmail integration, AI drafting, Pipedrive sync on GCP Cloud Run*
*Researched: 2026-03-10*
