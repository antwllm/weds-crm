# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-15
**Phases:** 4 | **Plans:** 23 | **Timeline:** 5 days

### What Was Built
- Headless automation: Gmail parsing, lead creation, vCard, SMS/email notifications
- Lead management UI: Kanban + list view, lead detail with inline editing, activity timeline
- Pipedrive bidirectional sync with dual-layer loop prevention and import tool
- Gmail inbox: split-pane, thread replies, email-to-lead auto-linking
- AI email drafting via OpenRouter with mandatory review-before-send
- WhatsApp messaging from lead detail with 24h window enforcement

### What Worked
- Coarse 4-phase roadmap kept context focused — no unnecessary parallelization
- TDD for parser and SMS services caught edge cases early (phone normalization, HTML entities)
- DI pattern (gmail client, axios instance as first arg) made all services testable without mocks
- Fire-and-forget via setImmediate for sync operations kept API responses fast
- Optimistic updates with rollback for all lead mutations gave snappy UI feel

### What Was Inefficient
- Phase 1 progress table in ROADMAP.md still shows unchecked plan checkboxes despite completion — checkbox tracking wasn't consistent across all phases
- Some SUMMARY.md files lack one-liner fields, making automated extraction unreliable
- SYNC-01 and SYNC-04 still show "In Progress" in traceability table despite being complete — status tracking lagged

### Patterns Established
- `setImmediate` for async side-effects (Gmail webhook, Pipedrive sync, WhatsApp webhook) — respond 200 immediately
- `timingSafeEqual` for all webhook signature verification (Pipedrive, WhatsApp)
- Module-scoped caches with `_reset*()` functions for test isolation
- Frontend types in `client/src/types/` decoupled from Drizzle ORM
- All lead mutations use optimistic update + rollback pattern

### Key Lessons
1. Keeping the mandatory review gate (no auto-send) for AI drafts was the right call — removes legal risk and user trust concerns
2. Dual-layer loop prevention (discard API-origin + suppression window) is essential for any bidirectional sync
3. E.164 phone normalization at parse time saves downstream complexity everywhere (WhatsApp, SMS, Pipedrive matching)
4. Single-user CRM means aggressive simplifications work: no debounce, client-side filtering, session-stored OAuth tokens

### Cost Observations
- Model mix: primarily opus for planning/execution, sonnet for verification
- 5-day build from zero to full CRM with inbox, AI, WhatsApp, and Pipedrive sync
- Notable: gap closure plans (03-05, 04-08) were tiny and fast — catching issues via verification works well

---

## Milestone: v1.1 — Templates & Agent IA WhatsApp

**Shipped:** 2026-03-17
**Phases:** 3 | **Plans:** 9 | **Timeline:** 2 days

### What Was Built
- Advanced HTML template editor with CodeMirror syntax highlighting and js-beautify formatting
- Inline image upload via GCS in TipTap editor + template attachment management
- WhatsApp AI agent with autonomous reply/pass_to_human decision flow
- AI handoff alerts via Free Mobile SMS + email with rate limiting (1/h per lead)
- Settings page for WhatsApp agent prompt and knowledge base
- AI decisions tab with full decision history, filtering, and scoring
- Langfuse OTLP tracing for all AI calls (WhatsApp agent + email draft)
- User feedback scoring (thumbs up/down + comment) forwarded to Langfuse

### What Worked
- UI-SPEC design contracts prevented ad-hoc styling decisions during execution
- Phase verification (must-haves check) caught the token usage gap before shipping
- Milestone audit with integration checker found 3 issues early
- Parallel wave execution for independent plans saved significant time
- GSD discuss → plan → execute workflow produced clean results consistently

### What Was Inefficient
- Langfuse integration required 6+ iterations — OTel SDK v5 `LangfuseSpanProcessor` doesn't flush in long-running Express processes
- Docker rebuild cache issues (TypeScript not recompiling) caused false confidence
- Database migrations lost on `docker compose down` — manual re-application each time
- `docker compose down` recreates volumes — phase 6+7 migrations had to be reapplied repeatedly

### Patterns Established
- **Langfuse OTLP direct HTTP** (`/api/public/otel/v1/traces`) for Node.js long-running servers
- **Langfuse REST** (`/api/public/scores`) for non-OTel features (scoring)
- **Always compile TypeScript locally** before Docker build to ensure `dist/` is current
- **UI-SPEC 2-weight typography rule** forces cleaner visual hierarchy

### Key Lessons
1. Langfuse v5 SDK is designed for short-lived processes — for Express servers, use OTLP HTTP directly
2. Test integration code from within the running container, not separate test scripts
3. AI agent consecutive counter (10 max) + per-lead rate-limited alerts prevents notification spam
4. `docker compose down` destroys volumes — use `restart` or `stop/start` to preserve DB state

### Cost Observations
- Model mix: opus for planning/execution, sonnet for verification/checking
- 2-day build for 3 phases, 9 plans — faster than v1.0 due to established patterns
- Notable: Langfuse debugging consumed ~40% of Phase 7 time — SDK documentation gaps

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Timeline | Phases | Plans | Key Change |
|-----------|----------|--------|-------|------------|
| v1.0 | 5 days | 4 | 23 | Initial build — established all patterns |
| v1.1 | 2 days | 3 | 9 | AI agent + observability — UI-SPEC + OTLP patterns |

### Cumulative Quality

| Milestone | Tests | Files | LOC |
|-----------|-------|-------|-----|
| v1.0 | 167 | 240 | 15,871 |
| v1.1 | 167 | 260+ | 15,253 |

### Top Lessons (Verified Across Milestones)

1. TDD for data transformation (parsing, normalization) pays off immediately
2. Verification + gap closure is more efficient than trying to get it perfect first time
3. External service integrations (Langfuse, WhatsApp) need in-container testing — test scripts ≠ app runtime
4. UI-SPEC design contracts prevent styling churn during execution
