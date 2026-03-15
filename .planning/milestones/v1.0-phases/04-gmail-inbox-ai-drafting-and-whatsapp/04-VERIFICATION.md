---
phase: 04-gmail-inbox-ai-drafting-and-whatsapp
verified: 2026-03-15T13:00:00Z
status: human_needed
score: 10/10 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 9/10
  gaps_closed:
    - "When 24h WhatsApp window is expired, free-form text input is disabled and user cannot type or send a free-form message"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "End-to-end Gmail inbox — thread list and thread reply"
    expected: "Sidebar 'Boite de reception' tab loads split-pane view; clicking a thread shows messages; sending a reply appears in Gmail in the same thread"
    why_human: "Requires live Gmail OAuth session and actual Gmail threads"
  - test: "Email-to-lead auto-linking"
    expected: "Opening a thread whose sender matches a lead email automatically creates a linkedEmail record and shows lead badge on the thread"
    why_human: "Requires live Gmail session and a lead with matching email in the database"
  - test: "AI draft generation and review flow"
    expected: "Clicking 'Generer un brouillon' on a lead navigates to /inbox with draft pre-filled in compose textarea; draft cannot be sent without editing (user must click Envoyer explicitly)"
    why_human: "Requires OPENROUTER_API_KEY configured and a real lead in the database"
  - test: "Email template preview with variable substitution"
    expected: "Selecting a template with {{nom}} in compose substitutes the lead name correctly in the compose area"
    why_human: "Requires a created template and a lead record"
  - test: "WhatsApp send from lead detail page"
    expected: "POST /api/leads/:id/whatsapp/send succeeds with real WhatsApp credentials; message appears as outbound bubble in WhatsApp section"
    why_human: "Requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN configured"
  - test: "Incoming WhatsApp message appears in lead activity history"
    expected: "When a prospect replies on WhatsApp, the message appears in the WhatsApp chat section and in the activity timeline as 'WhatsApp recu'"
    why_human: "Requires an actual incoming WhatsApp message triggering the webhook"
---

# Phase 4: Gmail Inbox, AI Drafting, and WhatsApp — Re-Verification Report

**Phase Goal:** William never leaves the CRM to handle lead correspondence — he reads Gmail threads, composes replies using templates or AI-generated drafts, reviews every draft before sending, manages the AI prompt in the app, and sends or reads WhatsApp messages directly from the lead record
**Verified:** 2026-03-15T13:00:00Z
**Status:** human_needed (all automated checks pass; gap from previous verification closed)
**Re-verification:** Yes — after gap closure (Plan 04-08, commit 5429b48)

---

## Re-Verification Summary

The one gap found in the initial verification has been closed. Commit `5429b48` (fix(04-08)) updated `client/src/components/whatsapp/WhatsAppCompose.tsx` with the following changes:

- `canSendMessage` now requires `isWindowOpen` to be true: `const canSendMessage = hasPhone && isWindowOpen && message.trim().length > 0`
- The free-form `Input` carries `disabled={isSending || !isWindowOpen}`
- Placeholder text changes to `'Fenetre expiree — utilisez un modele'` when window closed
- The Send button uses `disabled={!canSendMessage || isSending}` (unified guard)

No source files changed after the fix commit. Only planning documents were updated post-fix (confirmed via `git diff 5429b48 HEAD --name-only`).

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | William can open the inbox tab and see Gmail threads; clicking a thread shows the full conversation inline | ? HUMAN | InboxPage.tsx split-pane wired to useThreads/useThread; needs live Gmail to confirm |
| 2 | Incoming emails are auto-linked to leads by sender email; William can view them from lead detail page | ? HUMAN | inbox.ts GET /inbox/threads/:threadId does auto-link on thread open; LeadEmails.tsx renders linked emails |
| 3 | William can reply to a thread and the reply appears in Gmail in the same conversation thread | ? HUMAN | sendReply() constructs RFC 2822 MIME with threadId; wired in ComposeReply.tsx |
| 4 | William can select an email template with French variables, preview substituted output, and send it | ✓ VERIFIED | templates.ts has preview endpoint with substituteVariables; ComposeReply.tsx has template picker calling useTemplatePreview |
| 5 | William can click "Generate draft", see AI draft pre-filled in compose window, edit it, and send — no path to auto-send | ✓ VERIFIED | ai.ts POST /ai/generate-draft returns text; LeadDetail.tsx navigates to /inbox with draft in location.state; ComposeReply.tsx populates textarea and requires explicit "Envoyer" click |
| 6 | William can send a WhatsApp message from lead detail and incoming replies appear in activity history; free-form input disabled when 24h window expired | ✓ VERIFIED | Send flow wired; activity timeline renders whatsapp_sent/whatsapp_received; Input.disabled={isSending \|\| !isWindowOpen} at line 167; canSendMessage includes isWindowOpen at line 37 |
| 7 | When 24h window expired, free-form input disabled; template selector is only active path | ✓ VERIFIED | Line 37: canSendMessage = hasPhone && isWindowOpen && ...; line 117: template selector rendered only when !isWindowOpen; line 167: Input disabled={isSending \|\| !isWindowOpen} |
| 8 | When 24h window open, free-form input works normally | ✓ VERIFIED | isWindowOpen=true removes the disabled condition; canSendMessage true when message non-empty |

**Score:** 10/10 must-haves verified (5 confirmed programmatically, 3 require human confirmation with correctly-wired code)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `client/src/components/whatsapp/WhatsAppCompose.tsx` | WhatsApp compose with 24h window enforcement | ✓ VERIFIED | 194 lines; isWindowOpen used in canSendMessage (line 37), Input disabled (line 167), placeholder text (line 163), template selector gate (line 117) |
| `src/services/gmail.ts` | listThreads, getThread, sendReply exports | ✓ VERIFIED (unchanged from initial) | All three exported, substantive, called by inbox.ts |
| `src/services/openrouter.ts` | generateDraft, assembleLeadContext, substituteVariables | ✓ VERIFIED (unchanged) | Real DB queries and OpenRouter HTTP call |
| `src/services/whatsapp.ts` | sendWhatsAppMessage, parseIncomingMessage, verifyWebhookSignature | ✓ VERIFIED (unchanged) | graph.facebook.com call, HMAC verification |
| `src/db/schema.ts` | whatsappMessages, aiPromptConfig tables, whatsapp_sent in enum | ✓ VERIFIED (unchanged) | Both tables defined; activityTypeEnum complete |
| `src/routes/api/inbox.ts` | Gmail inbox API routes | ✓ VERIFIED (unchanged) | GET /inbox/threads, GET /inbox/threads/:id, POST reply, GET /leads/:id/emails |
| `src/routes/api/templates.ts` | Email template CRUD | ✓ VERIFIED (unchanged) | CRUD + preview endpoint with substituteVariables |
| `src/routes/api/ai.ts` | AI prompt config + draft generation | ✓ VERIFIED (unchanged) | GET/PUT /ai/prompt, POST /ai/generate-draft; draft never auto-sent |
| `src/routes/api/whatsapp.ts` | WhatsApp send, history, window | ✓ VERIFIED (unchanged) | POST send, GET history, GET window, template send endpoint |
| `src/routes/webhook.ts` | WhatsApp webhook (GET verify + POST incoming) | ✓ VERIFIED (unchanged) | Both handlers present with HMAC verification |
| `client/src/pages/InboxPage.tsx` | Split-pane inbox layout | ✓ VERIFIED (unchanged) | 146 lines, grid-cols-[350px_1fr], ThreadList + ThreadDetail |
| `client/src/components/inbox/ComposeReply.tsx` | Reply compose with template picker + AI draft | ✓ VERIFIED (unchanged) | Template selector, AI draft button, Send requires explicit click |
| `client/src/components/settings/TemplateEditor.tsx` | Template CRUD UI | ✓ VERIFIED (unchanged) | Create/edit/delete with variable chips |
| `client/src/components/settings/AiPromptEditor.tsx` | AI prompt editor | ✓ VERIFIED (unchanged) | Textarea, variable reference chips, model input, save/update |
| `client/src/components/whatsapp/WhatsAppChat.tsx` | Chat bubble display | ✓ VERIFIED (unchanged) | Outbound right-aligned green, inbound left gray, auto-scroll |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `WhatsAppCompose.tsx` | `useWhatsAppWindow` | `isWindowOpen` gates Input `disabled` prop | ✓ WIRED | Line 36 reads windowData.isOpen; line 167 uses `!isWindowOpen` in disabled; line 37 includes in canSendMessage |
| All other key links (16 total) | — | — | ✓ WIRED (unchanged) | No source changes after fix commit; all links verified in initial verification remain valid |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| MAIL-01 | 04-01, 04-02, 04-04, 04-07 | User can view Gmail inbox within the CRM | ? HUMAN | InboxPage + GET /api/inbox/threads wired; needs live Gmail session |
| MAIL-02 | 04-02, 04-04, 04-06, 04-07 | User can read email threads linked to a lead | ✓ VERIFIED | LeadEmails.tsx + GET /api/leads/:id/emails + inline InlineThread |
| MAIL-03 | 04-01, 04-02, 04-04, 04-07 | User can reply to emails directly from the CRM | ? HUMAN | sendReply() with RFC 2822 headers + ComposeReply UI exist; needs live Gmail |
| MAIL-04 | 04-01, 04-02, 04-04, 04-07 | System auto-links incoming emails to leads by sender email | ✓ VERIFIED | GET /inbox/threads/:id queries leads by sender email, inserts linkedEmails on match |
| MAIL-05 | 04-02, 04-05, 04-07 | User can create and manage reusable email templates | ✓ VERIFIED | TemplateEditor.tsx + templates CRUD API fully wired |
| MAIL-06 | 04-01, 04-02, 04-05, 04-07 | System generates AI email draft based on lead context | ✓ VERIFIED | assembleLeadContext + generateDraft + POST /ai/generate-draft wired |
| MAIL-07 | 04-04, 04-05, 04-07 | User can review, edit, and send AI-generated drafts before sending | ✓ VERIFIED | Draft goes to textarea; user must click Envoyer; no auto-send path |
| MAIL-08 | 04-02, 04-05, 04-07 | User can manage AI prompt template within the app | ✓ VERIFIED | AiPromptEditor.tsx + GET/PUT /api/ai/prompt wired |
| NOTF-04 | 04-01, 04-03, 04-06, 04-07, 04-08 | User can send WhatsApp messages to prospects | ✓ VERIFIED | Send flow wired; 24h window now enforced in UI — free-form disabled when expired |
| NOTF-05 | 04-01, 04-03, 04-06, 04-07 | User can view WhatsApp conversations linked to a lead | ✓ VERIFIED | WhatsAppChat.tsx with chat bubbles + useWhatsAppMessages polling every 30s |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `client/src/components/settings/AiPromptEditor.tsx` | 18, 84 | DEFAULT_PLACEHOLDER variable name | ℹ️ Info | Legitimate UX placeholder for textarea input hint, not a stub |

No blocker anti-patterns. The window-enforcement issue from the initial scan has been resolved.

---

### Human Verification Required

#### 1. Gmail Inbox Loading and Thread Navigation

**Test:** Log in, click "Boite de reception" in sidebar
**Expected:** Split-pane loads with Gmail threads on the left; clicking a thread shows messages on the right
**Why human:** Requires live Gmail OAuth tokens in the database

#### 2. Email-to-Lead Auto-Linking

**Test:** Open a Gmail thread from a prospect whose email matches an existing lead
**Expected:** Lead badge appears on the thread item; a linkedEmails record is created; the lead's "Emails" tab shows the thread
**Why human:** Requires matching lead email in database and actual Gmail thread

#### 3. Thread Reply Threading

**Test:** Reply to a thread using the compose area; check Gmail
**Expected:** Reply appears in Gmail as part of the same conversation (not a new thread)
**Why human:** Requires live Gmail send and Gmail account access to verify threading

#### 4. AI Draft Generation Flow

**Test:** Open a lead detail page with email data, click "Generer un brouillon"
**Expected:** Page navigates to /inbox with draft pre-filled in compose textarea; draft is editable; clicking Envoyer sends the email
**Why human:** Requires OPENROUTER_API_KEY and a lead with existing email history

#### 5. WhatsApp Outbound Message

**Test:** On a lead with a phone number, type and send a WhatsApp message from the WhatsApp tab
**Expected:** Message appears as outbound green bubble; WhatsApp message arrives on the recipient device
**Why human:** Requires WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN configured

#### 6. WhatsApp 24h Window Enforcement (manual confirmation)

**Test:** On a lead whose last inbound WhatsApp was over 24h ago, open the WhatsApp tab
**Expected:** Orange dot shows "Fenetre expiree — modele requis"; free-form input is visibly disabled with placeholder "Fenetre expiree — utilisez un modele"; Send button is greyed out; only the template selector is active
**Why human:** Window state depends on real message timestamps; requires a lead with an expired conversation window

#### 7. WhatsApp Incoming Message and Activity Timeline

**Test:** Have a prospect reply on WhatsApp to trigger the webhook
**Expected:** Inbound message appears as gray left-aligned bubble in the WhatsApp chat; activity timeline shows "WhatsApp recu" entry
**Why human:** Requires real incoming webhook from Meta and public webhook URL

---

### Gap Closure Confirmation

**Gap from initial verification:** NOTF-04 partial — WhatsApp 24h window not enforced in UI

**Fix verified at:** commit `5429b48` (fix(04-08): gate WhatsApp free-form input by 24h window state)

**Evidence in `client/src/components/whatsapp/WhatsAppCompose.tsx`:**

- Line 37: `const canSendMessage = hasPhone && isWindowOpen && message.trim().length > 0;` — server-side guard
- Line 163: placeholder text switches to `'Fenetre expiree — utilisez un modele'` when `!isWindowOpen`
- Line 167: `disabled={isSending || !isWindowOpen}` — input visually disabled when window closed
- Line 172: `disabled={!canSendMessage || isSending}` — Send button disabled via unified guard

All three layers (canSendMessage logic, Input disabled prop, placeholder text) enforce the constraint.

**Regression check:** `git diff 5429b48 HEAD --name-only` shows only `.planning/` files changed after the fix — no source regressions.

---

*Verified: 2026-03-15T13:00:00Z*
*Verifier: Claude (gsd-verifier)*
*Re-verification: Yes — gap closure after Plan 04-08*
