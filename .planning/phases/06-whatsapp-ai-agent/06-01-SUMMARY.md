---
phase: 06-whatsapp-ai-agent
plan: 01
subsystem: database, api
tags: [drizzle, postgres, whatsapp, ai-agent, schema, express, react-query]

# Dependency graph
requires:
  - phase: 04-inbox-whatsapp
    provides: whatsappMessages table, aiPromptConfig pattern, WhatsApp API routes
provides:
  - WhatsApp AI agent columns on leads (whatsappAiEnabled, whatsappAiHandoffAt, whatsappAiLastAlertAt, whatsappAiConsecutiveCount)
  - sentBy column on whatsapp_messages (human vs ai)
  - whatsapp_agent_config table (promptTemplate, knowledgeBase, model)
  - GET/PUT /api/ai/whatsapp-prompt endpoints
  - useWhatsAppAgentConfig and useUpdateWhatsAppAgentConfig client hooks
affects: [06-02, 06-03, 06-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [single-row config table pattern (matches aiPromptConfig), reply-or-pass_to_human JSON response format]

key-files:
  created:
    - src/db/migrations/0004_whatsapp_ai_agent.sql
  modified:
    - src/db/schema.ts
    - src/types.ts
    - client/src/types/index.ts
    - src/routes/api/ai.ts
    - client/src/hooks/useSettings.ts

key-decisions:
  - "DEFAULT_WA_PROMPT_TEMPLATE uses JSON response format with action reply|pass_to_human"
  - "whatsapp_agent_config follows single-row pattern like ai_prompt_config"
  - "sentBy column defaults to 'human' for backward compatibility"

patterns-established:
  - "WhatsApp AI config CRUD: same upsert pattern as ai_prompt_config"
  - "AI response format: {action, response, reason} JSON for structured agent output"

requirements-completed: [WAIA-01, WAIA-02, WAIA-05]

# Metrics
duration: 3min
completed: 2026-03-17
---

# Phase 6 Plan 1: Schema & Config API Summary

**WhatsApp AI agent schema (leads AI columns, sentBy, whatsapp_agent_config table) with config CRUD endpoints and client hooks**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-17T09:19:47Z
- **Completed:** 2026-03-17T09:23:08Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added 4 AI agent columns to leads table and sentBy to whatsapp_messages
- Created whatsapp_agent_config table with prompt template, knowledge base, and model
- Built GET/PUT /api/ai/whatsapp-prompt endpoints with Zod validation and default template
- Added useWhatsAppAgentConfig and useUpdateWhatsAppAgentConfig React Query hooks

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema changes + migration** - `359a892` (feat)
2. **Task 2: WhatsApp agent config API endpoints + client hooks** - `65c209d` (feat)

## Files Created/Modified
- `src/db/schema.ts` - Added AI columns to leads, sentBy to whatsappMessages, new whatsappAgentConfig table
- `src/types.ts` - Added WhatsAppAgentConfig and NewWhatsAppAgentConfig inferred types
- `client/src/types/index.ts` - Added sentBy to WhatsAppMessage, AI fields to Lead, WhatsAppAgentConfig interface
- `src/db/migrations/0004_whatsapp_ai_agent.sql` - SQL migration for all schema changes
- `src/routes/api/ai.ts` - GET/PUT /ai/whatsapp-prompt endpoints with default prompt template
- `client/src/hooks/useSettings.ts` - useWhatsAppAgentConfig and useUpdateWhatsAppAgentConfig hooks

## Decisions Made
- DEFAULT_WA_PROMPT_TEMPLATE uses structured JSON response format with action: reply | pass_to_human
- whatsapp_agent_config follows same single-row upsert pattern as ai_prompt_config
- sentBy column defaults to 'human' for backward compatibility with existing messages

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Database port mismatch: Docker Compose exposes PostgreSQL on port 5433, not 5432. Applied migration directly via docker exec instead of drizzle-kit push (which requires interactive input for new tables).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema foundation complete for all subsequent plans (agent core, handoff, settings UI)
- Config API ready for Settings UI in plan 06-04
- Default prompt template ready for agent core in plan 06-02

## Self-Check: PASSED

All 6 files found. All 2 commits verified.

---
*Phase: 06-whatsapp-ai-agent*
*Completed: 2026-03-17*
