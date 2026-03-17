---
phase: 07-ai-observability-decision-ui
plan: 01
subsystem: observability
tags: [langfuse, opentelemetry, ai-tracing, drizzle, openrouter]

requires:
  - phase: 06-whatsapp-ai-agent
    provides: WhatsApp agent processWhatsAppAiResponse, callOpenRouter, email draft generateDraft
provides:
  - ai_decisions table for decision persistence
  - Langfuse tracing wrapper (traceAiCall) for all AI calls
  - OTel instrumentation initialization
  - submitScore function for feedback endpoint
  - computePromptVersion for prompt tracking
affects: [07-02, ai-decisions-ui, feedback-scoring]

tech-stack:
  added: ["@langfuse/tracing", "@langfuse/otel", "@opentelemetry/sdk-node", "@langfuse/client"]
  patterns: [lazy-sdk-loading, best-effort-tracing, ai-call-result-with-usage]

key-files:
  created:
    - src/instrumentation.ts
    - src/services/langfuse.ts
  modified:
    - src/db/schema.ts
    - src/types.ts
    - src/services/whatsapp-agent.ts
    - src/services/openrouter.ts
    - src/index.ts

key-decisions:
  - "Lazy SDK loading pattern for CJS compatibility (no top-level await)"
  - "AiCallResult returns content + optional usage for token propagation"
  - "Best-effort tracing: Langfuse failure never blocks AI response flow"

patterns-established:
  - "traceAiCall wrapper: all AI calls go through this for uniform tracing"
  - "AiCallResult type: { content, usage? } returned by all AI call functions"
  - "Lazy Langfuse init: ensureSdkLoaded() defers imports until first use"

requirements-completed: [OBSV-01, OBSV-02]

duration: 4min
completed: 2026-03-17
---

# Phase 7 Plan 01: Langfuse AI Observability Summary

**Langfuse tracing for all AI calls (WhatsApp agent + email draft) with token usage capture, ai_decisions table for decision persistence**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-17T10:52:52Z
- **Completed:** 2026-03-17T10:56:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- ai_decisions table with full metadata (action, reason, response, model, latency, tokens, promptVersion, langfuseTraceId)
- Langfuse OTel instrumentation initialized conditionally on env vars (graceful degradation)
- traceAiCall wrapper with generation spans including usageDetails (input/output token counts)
- WhatsApp agent decisions persisted for both normal and forced-handoff paths
- Email draft calls traced through same wrapper

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema, types, and Langfuse tracing service** - `e4af4ea` (feat)
2. **Task 2: Wire tracing into whatsapp-agent.ts and openrouter.ts** - `7a84a2c` (feat)

## Files Created/Modified
- `src/db/schema.ts` - Added aiDecisions table with token columns
- `src/types.ts` - Added AiDecision and NewAiDecision type exports
- `src/instrumentation.ts` - OTel + LangfuseSpanProcessor init (conditional on env vars)
- `src/services/langfuse.ts` - traceAiCall, submitScore, computePromptVersion with lazy SDK loading
- `src/services/whatsapp-agent.ts` - Wrapped callOpenRouter with traceAiCall, persist decisions in ai_decisions
- `src/services/openrouter.ts` - Wrapped generateDraft with traceAiCall, extract token usage
- `src/index.ts` - Added instrumentation import before app import

## Decisions Made
- Used lazy SDK loading pattern (ensureSdkLoaded with async IIFE) instead of top-level await for CJS compatibility
- AiCallResult type includes optional usage for token propagation from OpenRouter to Langfuse generation spans
- Best-effort tracing: all Langfuse operations wrapped in try/catch, app works normally without Langfuse env vars

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted langfuse.ts for CJS module system**
- **Found during:** Task 1 (langfuse.ts creation)
- **Issue:** Plan used top-level `await import()` but project uses "type": "commonjs" in package.json with NodeNext module resolution
- **Fix:** Used lazy initialization pattern with `ensureSdkLoaded()` async function and cached promise instead of top-level await
- **Files modified:** src/services/langfuse.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** e4af4ea (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary adaptation for module system compatibility. No scope creep.

## Issues Encountered
- DB migration (`drizzle-kit push`) could not run because PostgreSQL is not running locally (Docker Compose required). Migration will apply on next Docker Compose startup.

## User Setup Required

Environment variables needed for Langfuse tracing (add to .env):
- `LANGFUSE_SECRET_KEY` - From Langfuse Cloud dashboard
- `LANGFUSE_PUBLIC_KEY` - From Langfuse Cloud dashboard
- `LANGFUSE_BASE_URL` - Optional, defaults to https://cloud.langfuse.com

Without these variables, the app runs normally with tracing disabled (warning logged at startup).

## Next Phase Readiness
- ai_decisions table and tracing infrastructure ready for Plan 02 (Decision UI tab + feedback scoring)
- API endpoints for GET /api/leads/:id/ai-decisions and POST /api/ai-decisions/:id/score can be built on top of existing schema and submitScore function

---
*Phase: 07-ai-observability-decision-ui*
*Completed: 2026-03-17*
