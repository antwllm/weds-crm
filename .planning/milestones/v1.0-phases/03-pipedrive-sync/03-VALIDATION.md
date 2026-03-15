---
phase: 3
slug: pipedrive-sync
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose tests/pipedrive/` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose tests/pipedrive/`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | SYNC-01 | unit | `npx vitest run tests/pipedrive/sync-push.test.ts -t "creates person and deal"` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | SYNC-01 | unit | `npx vitest run tests/pipedrive/sync-push.test.ts -t "custom fields"` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | SYNC-02 | unit | `npx vitest run tests/pipedrive/sync-push.test.ts -t "stage update"` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | SYNC-03 | unit | `npx vitest run tests/pipedrive/webhook.test.ts -t "deal change"` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | SYNC-03 | unit | `npx vitest run tests/pipedrive/webhook.test.ts -t "deal created"` | ❌ W0 | ⬜ pending |
| 03-02-03 | 02 | 1 | SYNC-03 | unit | `npx vitest run tests/pipedrive/webhook.test.ts -t "deal deleted"` | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 1 | SYNC-04 | unit | `npx vitest run tests/pipedrive/webhook.test.ts -t "loop prevention"` | ❌ W0 | ⬜ pending |
| 03-02-05 | 02 | 1 | SYNC-04 | unit | `npx vitest run tests/pipedrive/webhook.test.ts -t "suppression window"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/pipedrive/sync-push.test.ts` — stubs for SYNC-01, SYNC-02
- [ ] `tests/pipedrive/webhook.test.ts` — stubs for SYNC-03, SYNC-04
- [ ] `tests/pipedrive/helpers/fixtures.ts` — mock Pipedrive API responses, webhook payloads
- [ ] Framework install: none needed — Vitest already configured

*Existing infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pipedrive audit script discovers custom field keys from live account | SYNC-01 | Requires live Pipedrive API credentials | Run audit script against weds.pipedrive.com, verify JSON config output |
| One-time import pulls all historical deals | SYNC-01 | Requires live Pipedrive data | Run import script, verify lead count matches Pipedrive deal count |
| Webhook receives real Pipedrive events | SYNC-03 | Requires live webhook registration | Create/update deal in Pipedrive, verify CRM lead updated |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
