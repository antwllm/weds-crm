---
phase: 04-gmail-inbox-ai-drafting-and-whatsapp
plan: 06
subsystem: ui
tags: [whatsapp-chat, lead-emails, ai-draft, react, lucide-react]

requires:
  - phase: 04-gmail-inbox-ai-drafting-and-whatsapp
    plan: 02
    provides: Gmail inbox API routes (lead emails endpoint), AI draft generation endpoint
  - phase: 04-gmail-inbox-ai-drafting-and-whatsapp
    plan: 03
    provides: WhatsApp API routes (send, history, 24h window check)
provides:
  - WhatsApp chat UI with bubbles and compose input
  - 24h conversation window indicator with expired-state handling
  - Lead emails section with click-to-inbox navigation
  - AI draft generation button navigating to inbox compose
  - WhatsApp activity types in activity timeline
affects: [04-07]

tech-stack:
  added: []
  patterns: [whatsapp-chat-bubbles, 24h-window-indicator, ai-draft-navigate-to-inbox]

key-files:
  created:
    - client/src/components/whatsapp/WhatsAppChat.tsx
    - client/src/components/whatsapp/WhatsAppCompose.tsx
    - client/src/components/leads/LeadEmails.tsx
    - client/src/hooks/useWhatsApp.ts
    - client/src/hooks/useLeadEmails.ts
  modified:
    - client/src/components/leads/LeadDetail.tsx
    - client/src/components/leads/ActivityTimeline.tsx
    - client/src/types/index.ts
    - client/src/lib/constants.ts

key-decisions:
  - "AI draft button calls POST /api/ai/generate-draft then navigates to /inbox with draft + leadId + leadEmail state"
  - "WhatsApp messages poll every 30s via refetchInterval for near-real-time updates"
  - "Sections reordered: Notes -> Emails -> WhatsApp -> Historique on lead detail right column"

patterns-established:
  - "WhatsApp chat: outbound=green bubbles right-aligned, inbound=muted bubbles left-aligned"
  - "24h window: green dot when open with expiry countdown, orange dot when expired with template-only notice"

requirements-completed: [MAIL-02, NOTF-04, NOTF-05]

duration: 3min
completed: 2026-03-14
---

# Phase 4 Plan 06: Lead Detail WhatsApp & Emails UI Summary

**WhatsApp chat bubbles with 24h window compose, linked emails with AI draft button, and WhatsApp activity types in timeline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T18:44:08Z
- **Completed:** 2026-03-14T18:46:45Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- WhatsApp chat with directional bubbles (green outbound, muted inbound), status icons, auto-scroll, and 30s polling
- WhatsApp compose with 24h window indicator (open/expired states), disabled input when window closed
- Lead emails section with direction icons, click-to-navigate to inbox thread
- AI draft generation button: calls backend, navigates to inbox with draft text + leadId + leadEmail
- Activity timeline extended with whatsapp_sent (green) and whatsapp_received (teal) types

## Task Commits

Each task was committed atomically:

1. **Task 1: WhatsApp chat UI + lead emails section + hooks** - `188d8a8` (feat)
2. **Task 2: Extend LeadDetailPage + ActivityTimeline with new sections** - `43dcc8c` (feat)

## Files Created/Modified
- `client/src/hooks/useWhatsApp.ts` - React Query hooks for messages (poll 30s), send mutation, window status
- `client/src/hooks/useLeadEmails.ts` - React Query hook for fetching linked emails
- `client/src/components/whatsapp/WhatsAppChat.tsx` - Chat bubbles with direction, status icons, auto-scroll
- `client/src/components/whatsapp/WhatsAppCompose.tsx` - Text input with 24h window indicator, expired-state handling
- `client/src/components/leads/LeadEmails.tsx` - Compact email list with direction icons, click navigates to inbox
- `client/src/components/leads/LeadDetail.tsx` - Extended with Emails (+ AI draft button), WhatsApp, reordered sections
- `client/src/components/leads/ActivityTimeline.tsx` - Added MessageCircle icon for WhatsApp activity types
- `client/src/types/index.ts` - Added WhatsAppMessage, WhatsAppWindow, LinkedEmail types + new activity types
- `client/src/lib/constants.ts` - Added whatsapp_sent/whatsapp_received labels and colors

## Decisions Made
- AI draft button calls POST /api/ai/generate-draft then navigates to /inbox with { draft, leadId, leadEmail } state -- enables InboxPage to populate compose window with draft and To field
- WhatsApp messages poll every 30s via React Query refetchInterval for near-real-time incoming message display
- Right column sections reordered to Notes -> Emails -> WhatsApp -> Historique for communication-centric workflow

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Lead detail page now has complete communication hub: emails, WhatsApp, and activity history
- Plan 07 can build on this foundation for any remaining integration work
- All frontend components consume the API endpoints established in Plans 02 and 03

---
*Phase: 04-gmail-inbox-ai-drafting-and-whatsapp*
*Completed: 2026-03-14*
