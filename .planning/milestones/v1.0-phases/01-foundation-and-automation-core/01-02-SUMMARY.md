---
phase: 01-foundation-and-automation-core
plan: 02
subsystem: auth
tags: [passport, google-oauth, express-session, connect-pg-simple, sentry, express]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Zod-validated config, lazy DB pool, structured logger, Drizzle schema"
provides:
  - "Google OAuth 2.0 authentication with Gmail scopes and email allowlist"
  - "Express app with PostgreSQL-backed session persistence"
  - "ensureAuthenticated middleware for protected routes"
  - "Health endpoint for Cloud Run health checks"
  - "Sentry entry point with error handler"
affects: [01-03, 01-04, 01-05, phase-02, phase-03, phase-04]

# Tech tracking
tech-stack:
  added: [supertest]
  patterns: [passport-serialize-full-user, pg-session-store, sentry-init-first]

key-files:
  created: [src/auth/passport.ts, src/auth/middleware.ts, src/routes/auth.ts, src/routes/health.ts, src/app.ts, tests/auth.test.ts]
  modified: [src/index.ts, src/db/index.ts]

key-decisions:
  - "Serialize full user object (id, email, displayName, accessToken, refreshToken) into session for downstream Gmail API access"
  - "connect-pg-simple with createTableIfMissing for automatic session table creation"
  - "getPool() exported from db/index.ts to share pool between Drizzle ORM and session store"

patterns-established:
  - "Auth middleware: ensureAuthenticated returns 401 JSON for API requests, redirects browser requests"
  - "Sentry init as first import in src/index.ts, setupExpressErrorHandler after all routes in app.ts"
  - "Session cookie: secure in production, httpOnly always, 7-day maxAge"

requirements-completed: [INFR-01]

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 1 Plan 2: Express App, Google OAuth, and Session Persistence Summary

**Google OAuth 2.0 with Gmail scopes, PostgreSQL session store via connect-pg-simple, Sentry error tracking entry point, and health endpoint for Cloud Run**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-10T08:50:59Z
- **Completed:** 2026-03-10T08:56:15Z
- **Tasks:** 2 (4 commits including TDD RED/GREEN)
- **Files modified:** 8

## Accomplishments
- Passport Google OAuth strategy configured with Gmail modify/send scopes, offline access, and email allowlist enforcement
- Express app with PostgreSQL-backed session store that survives Cloud Run restarts
- Sentry initialized as first import in entry point, error handler mounted after all routes
- 5 integration tests passing: health endpoint, protected route redirect/401, OAuth redirect, auth failure page

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Passport Google OAuth strategy, session store, and auth middleware** - `d809bbb` (feat)
2. **Task 2 RED: Add failing auth integration tests** - `3ed75eb` (test)
3. **Task 2 GREEN: Create Express app, Sentry entry point, passing tests** - `8507242` (feat)

## Files Created/Modified
- `src/auth/passport.ts` - Passport Google OAuth strategy with email allowlist and token storage
- `src/auth/middleware.ts` - ensureAuthenticated middleware with JSON/redirect handling
- `src/routes/auth.ts` - Login, callback, failure, logout routes
- `src/routes/health.ts` - GET /health for Cloud Run health checks
- `src/app.ts` - Express app with session, passport, routes, Sentry error handler
- `src/index.ts` - Entry point: Sentry init first, then app startup with graceful shutdown
- `src/db/index.ts` - Added getPool() export for connect-pg-simple
- `tests/auth.test.ts` - 5 integration tests with mocked pg, session store, and Sentry

## Decisions Made
- Serialize full user object into session (including accessToken and refreshToken) so downstream Gmail API calls can reuse the stored tokens without re-authentication
- Use connect-pg-simple with `createTableIfMissing: true` to auto-create the session table on first run, avoiding a separate migration step
- Export `getPool()` from `db/index.ts` to share the same connection pool between Drizzle ORM and the session store

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added getPool() export to db/index.ts**
- **Found during:** Task 1 (session store setup)
- **Issue:** connect-pg-simple requires a raw pg Pool, but db/index.ts only exposed the Drizzle instance
- **Fix:** Added `getPool()` function that returns the raw pool, creating it if needed
- **Files modified:** src/db/index.ts
- **Verification:** TypeScript compiles, session store initializes correctly in tests
- **Committed in:** d809bbb (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for session store integration. No scope creep.

## Issues Encountered
- Initial pg mock in tests used arrow function instead of class constructor, causing `not a constructor` error -- fixed by using `class MockPool` in vi.mock

## User Setup Required
None - no external service configuration required for this plan. Google OAuth credentials are already in .env.example from 01-01.

## Next Phase Readiness
- Express app ready to mount additional routes (webhook, API endpoints)
- OAuth tokens stored in session, available for Gmail API calls in plans 01-03 through 01-05
- Session persists in PostgreSQL, ready for Cloud Run deployment
- Health endpoint ready for Cloud Run health check configuration

---
## Self-Check: PASSED

All 8 files verified present. All 3 task commits verified in git log.

---
*Phase: 01-foundation-and-automation-core*
*Completed: 2026-03-10*
