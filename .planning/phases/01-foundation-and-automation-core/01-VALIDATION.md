---
phase: 1
slug: foundation-and-automation-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.x |
| **Config file** | `vitest.config.ts` (Wave 0 installs) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | INFR-01 | integration | `npx vitest run tests/auth.test.ts -t "oauth"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | INFR-04 | smoke | `docker build -t weds-crm . && docker run --rm weds-crm node -e "console.log('ok')"` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | PARS-01 | unit | `npx vitest run tests/parser.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | PARS-02 | integration | `npx vitest run tests/pipeline.test.ts -t "create lead"` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | PARS-03 | integration | `npx vitest run tests/pipeline.test.ts -t "archive"` | ❌ W0 | ⬜ pending |
| 01-02-04 | 02 | 1 | PARS-04 | unit | `npx vitest run tests/pipeline.test.ts -t "skip processed"` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | LEAD-09 | unit | `npx vitest run tests/duplicate.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-02 | 03 | 1 | LEAD-11 | unit | `npx vitest run tests/vcard.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | NOTF-01 | unit | `npx vitest run tests/notifications.test.ts -t "twilio"` | ❌ W0 | ⬜ pending |
| 01-04-02 | 04 | 2 | NOTF-02 | unit | `npx vitest run tests/notifications.test.ts -t "free mobile"` | ❌ W0 | ⬜ pending |
| 01-04-03 | 04 | 2 | NOTF-03 | unit | `npx vitest run tests/notifications.test.ts -t "email recap"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration with TypeScript support
- [ ] `tests/parser.test.ts` — Mariages.net email parsing with real email samples
- [ ] `tests/duplicate.test.ts` — Email/phone duplicate detection
- [ ] `tests/vcard.test.ts` — vCard generation content validation
- [ ] `tests/notifications.test.ts` — SMS/email dispatch (mocked external APIs)
- [ ] `tests/pipeline.test.ts` — Full pipeline integration (parse → dedup → create → notify)
- [ ] `tests/auth.test.ts` — OAuth flow and session persistence
- [ ] `tests/helpers/` — Test fixtures: sample Mariages.net email bodies
- [ ] Framework install: `npm install -D vitest @vitest/coverage-v8`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth login flow | INFR-01 | Requires browser interaction + real Google account | 1. Open app URL, 2. Click login, 3. Authorize with Google, 4. Verify session persists after restart |
| Gmail push notification delivery | PARS-01 | Requires real Gmail + Pub/Sub setup | 1. Send test email to Gmail with `to-script` label, 2. Verify push received within 30s |
| Cloud Run deployment | INFR-04 | Requires GCP project access | 1. Deploy via `gcloud run deploy`, 2. Verify service healthy, 3. Verify secrets mounted |
| SMS delivery to phone | NOTF-01, NOTF-02 | Requires real Twilio + Free Mobile accounts | 1. Trigger lead creation, 2. Verify SMS received on phone |
| INFR-02 French text | INFR-02 | Visual inspection | 1. Check all notification templates are in French |
| INFR-03 Responsive | INFR-03 | No UI in Phase 1 — deferred to Phase 2 | N/A for this phase |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
