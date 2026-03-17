---
phase: quick
plan: 260317-k0u
subsystem: ai-observability
tags: [langfuse, prompt-management, whatsapp-agent, webhook]
dependency_graph:
  requires: [langfuse-tracing]
  provides: [langfuse-prompt-sync, langfuse-webhook]
  affects: [whatsapp-agent, settings-ui]
tech_stack:
  added: []
  patterns: [lazy-sdk-loading, fire-and-forget, prompt-cache-60s, hmac-webhook-verification]
key_files:
  created:
    - src/services/langfuse-prompts.ts
  modified:
    - src/services/langfuse.ts
    - src/services/whatsapp-agent.ts
    - src/routes/api/ai.ts
    - src/routes/webhook.ts
    - src/db/schema.ts
    - src/config.ts
    - client/src/types/index.ts
    - client/src/components/settings/WhatsAppAgentSettings.tsx
decisions:
  - Prompt cache TTL 60s for burst WhatsApp message processing
  - updateActiveObservation for trace-prompt linking (best-effort)
  - Fire-and-forget Langfuse push on CRM save (never blocks response)
  - HMAC verification optional (LANGFUSE_WEBHOOK_SECRET)
metrics:
  duration: 4min
  completed: "2026-03-17T13:32:38Z"
---

# Quick Task 260317-k0u: Langfuse Prompt Management Bidirectional Sync Summary

Bidirectional Langfuse prompt sync with push on CRM save, webhook pull on Langfuse production label, and trace linking via updateActiveObservation.

## What Was Done

### Task 1: Langfuse prompt sync service, webhook endpoint, and trace linking
**Commit:** `8b1c58b`

- Created `src/services/langfuse-prompts.ts` with three functions:
  - `pushPromptToLangfuse` -- creates new prompt version with "production" label
  - `getLangfusePrompt` -- fetches prompt object with 60s cache for trace linking
  - `pullPromptFromLangfuse` -- pulls production prompt text for webhook sync
- Added `POST /webhook/langfuse` endpoint in webhook.ts:
  - Handles `prompt-version` events with `created`/`updated` actions
  - Filters for `production` label only
  - Optional HMAC SHA-256 signature verification via `LANGFUSE_WEBHOOK_SECRET`
  - Pulls prompt text via `pullPromptFromLangfuse` and updates CRM DB
- Modified `PUT /api/ai/whatsapp-prompt` to fire-and-forget push to Langfuse after save
- Modified `GET /api/ai/whatsapp-prompt` to include `langfusePromptName` and `langfuseSyncedAt` in default response
- Extended `AiTraceInput` with optional `langfusePrompt` field
- Added `updateActiveObservation` call in `traceAiCall` to link prompt object to generation
- Updated `whatsapp-agent.ts` to fetch Langfuse prompt and pass to trace
- Added `langfusePromptName` (varchar, default 'whatsapp-agent-prompt') and `langfuseSyncedAt` (timestamp) columns to `whatsapp_agent_config` schema
- Added `LANGFUSE_WEBHOOK_SECRET` to config.ts

### Task 2: WhatsApp Agent Settings UI -- Langfuse sync status
**Commit:** `14fb686`

- Added `langfusePromptName` and `langfuseSyncedAt` to `WhatsAppAgentConfig` type
- Added Langfuse sync status section in WhatsAppAgentSettings.tsx:
  - Green dot + date when synced, gray dot + "Non synchronise" when not
  - Prompt name displayed as muted subtitle
  - "Synchroniser maintenant" button shown when out of sync and no unsaved changes

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- Server TypeScript: compiles without errors
- Client TypeScript: compiles without errors
- DB push skipped (PostgreSQL not running locally -- schema applied on next Docker start)
