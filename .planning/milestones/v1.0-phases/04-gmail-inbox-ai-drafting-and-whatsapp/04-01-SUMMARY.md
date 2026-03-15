---
phase: 04-gmail-inbox-ai-drafting-and-whatsapp
plan: 01
subsystem: api
tags: [gmail-threads, openrouter, whatsapp, drizzle, ai-drafting]

requires:
  - phase: 01-core-ingestion-and-notifications
    provides: Gmail service DI pattern, schema tables, config validation
provides:
  - whatsappMessages and aiPromptConfig DB tables
  - Gmail thread operations (listThreads, getThread, sendReply)
  - OpenRouter AI draft generation (generateDraft, assembleLeadContext, substituteVariables)
  - WhatsApp Cloud API service (sendWhatsAppMessage, parseIncomingMessage, verifyWebhookSignature)
  - Extended activityTypeEnum with whatsapp_sent, whatsapp_received
  - gmailThreadId column on linkedEmails
affects: [04-02, 04-03, 04-04, 04-05, 04-06, 04-07]

tech-stack:
  added: [openrouter-api, whatsapp-cloud-api]
  patterns: [DI-pattern-for-http-clients, template-variable-substitution]

key-files:
  created:
    - src/services/openrouter.ts
    - src/services/whatsapp.ts
    - tests/gmail-threads.test.ts
    - tests/openrouter.test.ts
    - tests/whatsapp.test.ts
    - src/db/migrations/0000_soft_tattoo.sql
  modified:
    - src/db/schema.ts
    - src/config.ts
    - src/types.ts
    - src/services/gmail.ts
    - tests/helpers/fixtures.ts

key-decisions:
  - "DI pattern for HTTP clients: openrouter.ts and whatsapp.ts accept optional axios instance for testing"
  - "sendReply uses base64url raw MIME encoding consistent with existing sendEmail pattern"
  - "WhatsApp media messages return 'Media recu' placeholder (V1 text-only scope)"
  - "verifyWebhookSignature uses timingSafeEqual for constant-time comparison"
  - "LeadContext interface centralizes lead data needed for AI prompt assembly"

patterns-established:
  - "HTTP service DI: accept optional httpClient param, default to axios"
  - "Template substitution: {{variable}} pattern with simple .replace()"
  - "Webhook signature verification: HMAC-SHA256 with timingSafeEqual"

requirements-completed: [MAIL-01, MAIL-03, MAIL-04, MAIL-06, NOTF-04, NOTF-05]

duration: 5min
completed: 2026-03-13
---

# Phase 4 Plan 01: Schema, Config & Service Layer Summary

**Gmail thread operations, OpenRouter AI draft generation, and WhatsApp Cloud API service with 16 unit tests**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-13T14:41:23Z
- **Completed:** 2026-03-13T14:46:30Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Extended schema with whatsappMessages, aiPromptConfig tables and gmailThreadId column
- Gmail service gained listThreads, getThread, sendReply with proper RFC 2822 threading headers
- OpenRouter service generates AI drafts from lead context using template variable substitution
- WhatsApp service sends messages, parses webhooks (text + media), verifies HMAC signatures
- 16 new unit tests all passing, no regressions in existing 109 tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + environment config** - `6d7d5dd` (feat)
2. **Task 2: Gmail thread ops + OpenRouter service** - `68cc0ff` (feat)
3. **Task 3: WhatsApp Cloud API service** - `a6acb3e` (feat)

## Files Created/Modified
- `src/db/schema.ts` - Added whatsappMessages, aiPromptConfig tables; extended activityTypeEnum; added gmailThreadId to linkedEmails
- `src/config.ts` - Added OPENROUTER_API_KEY, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET validation
- `src/types.ts` - Exported WhatsAppMessage, AiPromptConfig types + LeadContext interface
- `src/services/gmail.ts` - Added listThreads, getThread, sendReply functions
- `src/services/openrouter.ts` - New service: substituteVariables, assembleLeadContext, generateDraft
- `src/services/whatsapp.ts` - New service: sendWhatsAppMessage, parseIncomingMessage, verifyWebhookSignature
- `tests/helpers/fixtures.ts` - Added Gmail thread, OpenRouter, WhatsApp webhook fixtures
- `tests/gmail-threads.test.ts` - 6 tests for thread operations
- `tests/openrouter.test.ts` - 4 tests for AI draft generation
- `tests/whatsapp.test.ts` - 6 tests for WhatsApp service
- `src/db/migrations/0000_soft_tattoo.sql` - Generated migration for new tables

## Decisions Made
- DI pattern for HTTP clients: openrouter.ts and whatsapp.ts accept optional axios instance for testing, consistent with existing gmail.ts pattern
- sendReply uses base64url raw MIME encoding, same approach as existing sendEmail
- WhatsApp media messages return 'Media recu' placeholder per V1 text-only scope
- verifyWebhookSignature uses timingSafeEqual for constant-time comparison against timing attacks
- LeadContext interface centralizes lead data needed for AI prompt assembly

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration.** Users need:
- `OPENROUTER_API_KEY` - OpenRouter Dashboard > Keys > Create Key (https://openrouter.ai/keys)
- `WHATSAPP_PHONE_NUMBER_ID` - Meta App Dashboard > WhatsApp > API Setup > Phone number ID
- `WHATSAPP_ACCESS_TOKEN` - Meta App Dashboard > WhatsApp > API Setup > Access token
- `WHATSAPP_VERIFY_TOKEN` - Choose any secret string, configure same in Meta webhook settings
- `WHATSAPP_APP_SECRET` - Meta App Dashboard > Settings > Basic > App Secret

All optional in dev, required in production.

## Issues Encountered
- Pre-existing auth.test.ts failures (2 tests) unrelated to this plan's changes - not addressed per scope boundary rules

## Next Phase Readiness
- Service layer complete for Gmail threads, AI drafting, and WhatsApp messaging
- Plans 04-02 through 04-07 can now build API routes, UI components, and integrations on top of these services

---
*Phase: 04-gmail-inbox-ai-drafting-and-whatsapp*
*Completed: 2026-03-13*
