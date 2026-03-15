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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Timeline | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 5 days | 4 | Initial build — established all patterns |

### Cumulative Quality

| Milestone | Tests | Files | LOC |
|-----------|-------|-------|-----|
| v1.0 | 167 | 240 | 15,871 |

### Top Lessons (Verified Across Milestones)

1. TDD for data transformation (parsing, normalization) pays off immediately
2. Verification + gap closure is more efficient than trying to get it perfect first time
