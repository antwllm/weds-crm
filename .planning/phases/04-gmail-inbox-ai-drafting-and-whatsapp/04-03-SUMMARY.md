---
phase: 04-gmail-inbox-ai-drafting-and-whatsapp
plan: 03
subsystem: api
tags: [whatsapp, webhook, express, drizzle, sms-alert]

requires:
  - phase: 04-gmail-inbox-ai-drafting-and-whatsapp
    plan: 01
    provides: WhatsApp service (sendWhatsAppMessage, parseIncomingMessage, verifyWebhookSignature), whatsappMessages schema, config validation
provides:
  - WhatsApp API routes (send, history, 24h window check)
  - WhatsApp webhook handlers (GET verify + POST incoming)
  - Incoming message to lead linking by phone number
  - Free Mobile SMS alert on incoming WhatsApp
affects: [04-04, 04-05, 04-06, 04-07]

tech-stack:
  added: []
  patterns: [raw-body-capture-for-signature-verification, e164-phone-normalization-for-lead-lookup]

key-files:
  created:
    - tests/webhook-whatsapp.test.ts
  modified:
    - src/routes/api/whatsapp.ts
    - src/routes/webhook.ts
    - src/app.ts
    - tests/api/whatsapp.test.ts

key-decisions:
  - "Raw body captured via express.json verify callback for HMAC signature verification"
  - "Phone matching uses or(eq(+prefix), eq(without-prefix)) for E.164 normalization tolerance"
  - "Free Mobile SMS alert sent directly via axios in webhook handler (best-effort, never throws)"
  - "Webhook responds 200 immediately, processes incoming messages asynchronously via setImmediate"

patterns-established:
  - "WhatsApp webhook: same acknowledge-first, process-async pattern as Gmail and Pipedrive webhooks"
  - "Raw body capture: verify callback on express.json stores req.rawBody for HMAC verification"

requirements-completed: [NOTF-04, NOTF-05]

duration: 4min
completed: 2026-03-14
---

# Phase 4 Plan 03: WhatsApp API Routes & Webhook Summary

**WhatsApp send/history/window API endpoints and webhook handlers with signature verification, lead linking, and SMS alerts -- 16 tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T18:36:56Z
- **Completed:** 2026-03-14T18:41:04Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- WhatsApp API routes: send messages, retrieve conversation history, check 24h conversation window per lead
- WhatsApp webhook: Meta verification handshake (GET) and incoming message processing (POST) with HMAC-SHA256 signature verification
- Incoming messages linked to leads by phone number with E.164 normalization
- Free Mobile SMS alert dispatched on each incoming WhatsApp message (best-effort)
- 16 new tests passing (8 API route tests + 8 webhook tests), no regressions in existing 165 tests

## Task Commits

Each task was committed atomically:

1. **Task 1: WhatsApp API routes (send, history, 24h window check)** - `08eded6` (feat)
2. **Task 2: WhatsApp webhook (RED)** - `4059421` (test)
3. **Task 2: WhatsApp webhook (GREEN)** - `7dde5d5` (feat)

## Files Created/Modified
- `src/routes/api/whatsapp.ts` - POST send, GET history, GET window endpoints with auth and Zod validation
- `src/routes/webhook.ts` - GET /webhook/whatsapp verification + POST /webhook/whatsapp incoming message handler
- `src/app.ts` - Raw body capture via express.json verify callback
- `tests/api/whatsapp.test.ts` - 8 tests for API routes (send success/400/404/503, history, window states)
- `tests/webhook-whatsapp.test.ts` - 8 tests for webhook (verify handshake, incoming messages, signature, no-lead warning)

## Decisions Made
- Raw body captured via express.json verify callback rather than separate middleware -- minimal footprint, affects all routes but buffer is small
- Phone matching uses OR condition (with and without + prefix) for E.164 normalization tolerance when linking incoming WhatsApp messages to leads
- Free Mobile SMS alert sent directly via axios in webhook handler rather than through sendFreeMobileSMS service function -- keeps the alert message format specific to WhatsApp context
- Webhook responds 200 immediately before processing, same pattern as Gmail and Pipedrive webhooks

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed window test mock chain isolation**
- **Found during:** Task 1
- **Issue:** Window endpoint tests failed due to shared mock chain state bleeding between history and window test suites
- **Fix:** Each window test now builds its own isolated mock chain (select -> from -> where -> orderBy -> limit) instead of relying on shared mocks
- **Files modified:** tests/api/whatsapp.test.ts
- **Committed in:** 08eded6 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential for test reliability. No scope creep.

## Issues Encountered
- Pre-existing auth.test.ts failures (2 tests) unrelated to this plan's changes -- not addressed per scope boundary rules

## Next Phase Readiness
- WhatsApp backend complete: API routes for send/history/window + webhook for incoming messages
- Frontend components (04-04 through 04-07) can now integrate WhatsApp messaging from lead detail view
- Webhook URL needs to be configured in Meta App Dashboard for production use

---
*Phase: 04-gmail-inbox-ai-drafting-and-whatsapp*
*Completed: 2026-03-14*
