---
phase: 01-foundation-and-automation-core
plan: 03
subsystem: services
tags: [parser, regex, gmail, vcard, gcs, tdd, vitest]

# Dependency graph
requires:
  - phase: 01-01
    provides: "TypeScript project, types (ParsedLead), config, test fixtures"
provides:
  - "Mariages.net email parser with regex extraction and phone normalization"
  - "Gmail API wrapper (search, read, modify labels, send email, label management)"
  - "vCard VCF 3.0 content generator"
  - "GCS upload with signed URL generation"
affects: [01-04, 01-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [tdd-red-green-refactor, dependency-injection-for-testability, module-level-caching, vi-hoisted-mocks]

key-files:
  created: [src/services/parser.ts, src/services/vcard.ts, src/services/storage.ts, tests/parser.test.ts, tests/vcard.test.ts, tests/gmail.test.ts, tests/storage.test.ts]
  modified: [src/services/gmail.ts]

key-decisions:
  - "Phone normalization returns E.164 format in ParsedLead (not raw phone) for downstream consistency"
  - "Gmail service uses dependency injection (gmail client as first arg) for testability"
  - "Label cache stored in module scope with _resetLabelCache() export for test isolation"
  - "Storage filename sanitization: lowercase, hyphens, alphanumeric only"

patterns-established:
  - "DI pattern: service functions accept gmail/storage client as first argument"
  - "vi.hoisted() for mock variables referenced inside vi.mock() factory"
  - "Module-scoped caching with test-only reset function"

requirements-completed: [PARS-01, PARS-03, PARS-04, LEAD-11]

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 1 Plan 3: Email Parsing, Gmail, vCard, and Storage Summary

**TDD parser extracting Mariages.net leads with E.164 phone normalization, Gmail API wrapper with label management, VCF 3.0 vCard generator, and GCS signed-URL uploader -- 35 tests passing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-10T08:51:02Z
- **Completed:** 2026-03-10T08:56:22Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Parser extracts all Mariages.net fields (name, email, phone, eventDate, message) with proven regex patterns ported from email-parser
- Phone normalization handles French formats (06.., 0033.., +33..) converting to E.164
- Gmail service wraps search, read, label management, and MIME email sending with attachment support
- vCard generates VCF 3.0 with proper \r\n line endings, handling missing fields gracefully
- GCS storage uploads vCards with sanitized filenames and returns configurable-expiry signed URLs
- All 35 tests passing with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD parser and phone normalization** - `87e2cda` (feat)
2. **Task 2: TDD vCard generation, Gmail service, and Cloud Storage upload** - `11e8304` (feat)

## Files Created/Modified
- `src/services/parser.ts` - Mariages.net email parser with regex extraction and normalizePhoneNumber
- `src/services/gmail.ts` - Gmail API wrapper: getGmailClient, searchMessages, getMessageContent, modifyLabels, ensureLabelsExist, sendEmail
- `src/services/vcard.ts` - VCF 3.0 vCard content generator with optional field handling
- `src/services/storage.ts` - GCS upload with sanitized filenames and signed URL generation
- `tests/parser.test.ts` - 13 tests for parser and phone normalization
- `tests/vcard.test.ts` - 7 tests for vCard generation
- `tests/gmail.test.ts` - 10 tests for Gmail service with mocked googleapis
- `tests/storage.test.ts` - 5 tests for GCS upload with mocked @google-cloud/storage

## Decisions Made
- Phone normalization returns E.164 in ParsedLead (not raw phone) -- downstream services expect normalized format
- Gmail service uses dependency injection pattern (gmail client as first arg) rather than module-level auth -- enables clean mocking
- Label cache in module scope with _resetLabelCache() for test isolation -- avoids repeated API calls in production
- Storage filename sanitization strips accents and special chars to lowercase-hyphenated -- prevents GCS path issues
- Replaced gmail.ts placeholder (from 01-02) with full implementation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed vi.mock hoisting with vi.hoisted()**
- **Found during:** Task 2 (storage tests)
- **Issue:** vi.mock factory is hoisted before variable declarations, causing ReferenceError for mock variables
- **Fix:** Used vi.hoisted() to declare mock functions that are available inside vi.mock factory
- **Files modified:** tests/storage.test.ts
- **Committed in:** 11e8304 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed google.auth.OAuth2 mock constructor**
- **Found during:** Task 2 (Gmail tests)
- **Issue:** vi.fn(() => obj) is not a constructor; `new google.auth.OAuth2()` threw TypeError
- **Fix:** Changed mock to use class expression `class MockOAuth2 { ... }` and adjusted assertion
- **Files modified:** tests/gmail.test.ts
- **Committed in:** 11e8304 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs in test mock setup)
**Impact on plan:** Both fixes necessary for test infrastructure correctness. No scope creep.

## Issues Encountered
- EXPECTED_PARSED_LEAD fixture has raw phone but plan specifies normalized phone in ParsedLead -- tests use normalized E.164 expectations (fixture is a reference, not a test oracle for phone format)

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- All service layers are ready for Plan 04 (pipeline orchestrator) to compose
- Parser, Gmail, vCard, and Storage are independently testable via dependency injection
- Gmail service requires real OAuth tokens at runtime (tested with mocks only)
- GCS bucket must exist and credentials must have storage.objects.create permission

---
## Self-Check: PASSED

All 8 files verified present. Both task commits verified in git log.

---
*Phase: 01-foundation-and-automation-core*
*Completed: 2026-03-10*
