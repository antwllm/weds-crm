---
phase: 04-gmail-inbox-ai-drafting-and-whatsapp
plan: 04
subsystem: ui
tags: [gmail-inbox, react, split-pane, compose-reply, ai-draft, template-picker]

requires:
  - phase: 04-gmail-inbox-ai-drafting-and-whatsapp
    provides: Gmail inbox API routes, template CRUD, AI draft generation endpoint
provides:
  - Gmail inbox split-pane page with thread list and thread detail
  - Inline reply compose with template picker and AI draft button
  - Draft-from-lead navigation flow (auto-select thread or standalone compose)
  - useInbox React Query hooks for all inbox/template/AI endpoints
  - Sidebar "Boite de reception" entry and /inbox route
affects: [04-05, 04-06, 04-07]

tech-stack:
  added: []
  patterns: [split-pane-layout, draft-from-lead-flow, stripHtml-xss-prevention]

key-files:
  created:
    - client/src/pages/InboxPage.tsx
    - client/src/components/inbox/ThreadList.tsx
    - client/src/components/inbox/ThreadDetail.tsx
    - client/src/components/inbox/ComposeReply.tsx
    - client/src/hooks/useInbox.ts
  modified:
    - client/src/types/index.ts
    - client/src/components/layout/Sidebar.tsx
    - client/src/App.tsx

key-decisions:
  - "stripHtml via DOMParser for XSS-safe email body rendering instead of raw innerHTML"
  - "Draft-from-lead shows standalone compose when no prior email thread exists for the lead"
  - "Location state cleared after consuming draft to prevent stale drafts on browser refresh"
  - "isSentByMe checks for weds.fr domain to differentiate sent vs received styling"

patterns-established:
  - "Split-pane inbox: grid-cols-1 md:grid-cols-[350px_1fr] with mobile toggle"
  - "Draft-from-lead flow: location.state -> useLeadEmails -> auto-select or standalone compose"
  - "Compose reply: template picker + AI draft populate textarea, user must click Envoyer"

requirements-completed: [MAIL-01, MAIL-02, MAIL-03, MAIL-04, MAIL-07]

duration: 4min
completed: 2026-03-14
---

# Phase 4 Plan 04: Gmail Inbox UI Summary

**Split-pane inbox page with thread list, message detail, inline reply compose, template picker, and AI draft button -- all French labels**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T18:43:55Z
- **Completed:** 2026-03-14T18:47:46Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Full inbox page with split-pane layout: thread list (350px) and thread detail panel
- Thread list with lead badges, status colors, loading skeletons, and pagination
- Thread detail renders messages with sender avatars, French relative dates, and lead links
- Compose reply with template picker dropdown, AI draft generation button, and send with threading headers
- Draft-from-lead navigation flow handles both existing threads and new leads without email history
- Mobile responsive: single column with back button toggle

## Task Commits

Each task was committed atomically:

1. **Task 1: Inbox hooks, types, routing, and sidebar entry** - `f431ff5` (feat)
2. **Task 2: InboxPage split-pane + ThreadList + ThreadDetail + ComposeReply** - `5b27f74` (feat)

## Files Created/Modified
- `client/src/types/index.ts` - Added GmailThread, GmailMessage, ThreadDetail, EmailTemplate, AiPromptConfig types
- `client/src/hooks/useInbox.ts` - React Query hooks: useThreads, useThread, useSendReply, useTemplates, useTemplatePreview, useGenerateDraft, useLeadEmails
- `client/src/components/layout/Sidebar.tsx` - Added "Boite de reception" nav entry with Mail icon
- `client/src/App.tsx` - Lazy-loaded InboxPage route at /inbox
- `client/src/pages/InboxPage.tsx` - Split-pane inbox with draft-from-lead flow
- `client/src/components/inbox/ThreadList.tsx` - Thread list panel with lead badges and pagination
- `client/src/components/inbox/ThreadDetail.tsx` - Message display with avatars and compose reply
- `client/src/components/inbox/ComposeReply.tsx` - Reply compose with template picker, AI draft, and send

## Decisions Made
- Used DOMParser.stripHtml for XSS-safe email body rendering instead of raw innerHTML injection
- Draft-from-lead flow shows standalone ComposeReply when no prior email thread exists, preventing draft loss
- Location state cleared via window.history.replaceState after consuming draft data
- isSentByMe checks weds.fr domain to apply sent vs received message styling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required. Frontend consumes API endpoints established in Plan 02.

## Next Phase Readiness
- Full inbox UI operational, ready for Plans 05-07 (lead detail integration, settings page, end-to-end testing)
- ComposeReply accepts initialDraft and initialTo props for draft-from-lead navigation from lead detail page
- All hooks export cleanly for reuse in other components

---
*Phase: 04-gmail-inbox-ai-drafting-and-whatsapp*
*Completed: 2026-03-14*
