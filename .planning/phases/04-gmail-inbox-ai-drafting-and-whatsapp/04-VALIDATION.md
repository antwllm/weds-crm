---
phase: 4
slug: gmail-inbox-ai-drafting-and-whatsapp
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | MAIL-01 | unit | `npx vitest run tests/gmail-threads.test.ts -t "listThreads" -x` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 1 | MAIL-03 | unit | `npx vitest run tests/gmail-threads.test.ts -t "sendReply" -x` | ❌ W0 | ⬜ pending |
| 4-01-03 | 01 | 1 | MAIL-06 | unit | `npx vitest run tests/openrouter.test.ts -t "generateDraft" -x` | ❌ W0 | ⬜ pending |
| 4-01-04 | 01 | 1 | NOTF-04 | unit | `npx vitest run tests/whatsapp.test.ts -t "sendMessage" -x` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 2 | MAIL-02 | unit | `npx vitest run tests/api/inbox.test.ts -x` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 2 | MAIL-05 | unit | `npx vitest run tests/api/templates.test.ts -x` | ❌ W0 | ⬜ pending |
| 4-02-03 | 02 | 2 | MAIL-08 | unit | `npx vitest run tests/api/ai.test.ts -x` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 2 | NOTF-04 | unit | `npx vitest run tests/api/whatsapp.test.ts -x` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 | 2 | NOTF-05 | unit | `npx vitest run tests/webhook-whatsapp.test.ts -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/gmail-threads.test.ts` — stubs for MAIL-01, MAIL-03 (listThreads, getThread, sendReply)
- [ ] `tests/openrouter.test.ts` — stubs for MAIL-06 (generateDraft, substituteVariables)
- [ ] `tests/whatsapp.test.ts` — stubs for NOTF-04 (sendWhatsAppMessage, parseIncomingMessage, verifyWebhookSignature)
- [ ] `tests/api/inbox.test.ts` — stubs for MAIL-02, MAIL-04 (inbox API routes, email-to-lead linking)
- [ ] `tests/api/templates.test.ts` — stubs for MAIL-05 (template CRUD)
- [ ] `tests/api/ai.test.ts` — stubs for MAIL-08 (AI prompt config, draft generation endpoint)
- [ ] `tests/api/whatsapp.test.ts` — stubs for NOTF-04 (WhatsApp API routes)
- [ ] `tests/webhook-whatsapp.test.ts` — stubs for NOTF-05 (WhatsApp webhook handlers)
- [ ] `tests/helpers/fixtures.ts` — extend with email thread, OpenRouter, and WhatsApp message fixtures

*Existing infrastructure covers test runner (Vitest) and fixture pattern.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Split-pane inbox feels like Gmail | MAIL-01 | Visual/UX quality | Open /inbox, click threads, verify split-pane responds to clicks |
| Template preview shows real lead data | MAIL-05 | Visual substitution check | Create template with {{nom}}, select a lead, verify preview |
| AI draft appears in compose for review | MAIL-07 | End-to-end flow with AI | Click "Générer un brouillon", verify draft appears in editable compose area |
| WhatsApp chat bubbles display correctly | NOTF-05 | Visual chat styling | Open lead with WhatsApp messages, verify bubble layout |
| 24h window indicator visibility | NOTF-04 | Visual indicator check | Send WhatsApp, wait/mock expiry, verify template-only mode |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
