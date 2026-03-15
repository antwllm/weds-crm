---
phase: 2
slug: lead-management-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (backend) + Vitest 4.x with jsdom (frontend) |
| **Config file** | `vitest.config.ts` (existing backend), `client/vitest.config.ts` (new for frontend) |
| **Quick run command** | `npm test && cd client && npx vitest run` |
| **Full suite command** | `npm test && cd client && npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test && cd client && npx vitest run`
- **After every plan wave:** Run `npm test && cd client && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | LEAD-01 | integration | `npx vitest run tests/api/leads.test.ts -t "create" -x` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | LEAD-02 | integration | `npx vitest run tests/api/leads.test.ts -t "filter" -x` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | LEAD-04 | integration | `npx vitest run tests/api/leads.test.ts -t "update" -x` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | LEAD-05 | integration | `npx vitest run tests/api/leads.test.ts -t "delete" -x` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | LEAD-06 | integration | `npx vitest run tests/api/leads.test.ts -t "status" -x` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 1 | LEAD-07 | integration | `npx vitest run tests/api/activities.test.ts -t "note" -x` | ❌ W0 | ⬜ pending |
| 02-01-07 | 01 | 1 | LEAD-08 | integration | `npx vitest run tests/api/activities.test.ts -t "history" -x` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | LEAD-03 | unit | `cd client && npx vitest run src/__tests__/KanbanBoard.test.tsx -x` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | LEAD-10 | unit | `cd client && npx vitest run src/__tests__/SourceBadge.test.tsx -x` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | INFR-03 | manual-only | Visual check on mobile viewport | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/api/leads.test.ts` — stubs for LEAD-01, LEAD-02, LEAD-04, LEAD-05, LEAD-06
- [ ] `tests/api/activities.test.ts` — stubs for LEAD-07, LEAD-08
- [ ] `client/vitest.config.ts` — frontend test config with jsdom environment
- [ ] `client/src/__tests__/KanbanBoard.test.tsx` — stub for LEAD-03
- [ ] `client/src/__tests__/SourceBadge.test.tsx` — stub for LEAD-10
- [ ] Framework install: `cd client && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Responsive layout on mobile viewport | INFR-03 | Visual/interaction check requires real viewport | Open app on mobile or Chrome DevTools mobile mode, verify sidebar collapses to hamburger, Kanban scrolls horizontally |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
