# Phase 4: Gmail Inbox, AI Drafting, and WhatsApp - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

William never leaves the CRM to handle lead correspondence — he reads Gmail threads, composes replies using templates or AI-generated drafts, reviews every draft before sending, manages the AI prompt in the app, and sends or reads WhatsApp messages directly from the lead record. Covers MAIL-01 through MAIL-08, NOTF-04, NOTF-05.

</domain>

<decisions>
## Implementation Decisions

### Inbox Layout & Navigation
- New sidebar tab "Boîte de réception" alongside Pipeline — dedicated /inbox route
- Split-pane layout: thread list on left, selected thread's messages on right
- Thread list items show: sender name, subject, snippet preview, relative date, and lead badge (name + status) when sender matches a lead
- Unread threads bold in the list
- Lead detail page gets a dedicated "Emails" section showing all threads linked to that lead, with inline thread view — separate from the global inbox

### AI Drafting
- AI provider: Claude API via OpenRouter (https://openrouter.ai/docs/)
- Draft flow: "Générer un brouillon" button on lead → AI generates draft → preview in compose window → William edits → sends. No path to send without review.
- Full lead context feeds the AI prompt: name, event date, budget, status, last 5 email exchanges, notes
- AI prompt template managed in a dedicated "Paramètres IA" section in a settings page — textarea editor with variable placeholders ({{nom}}, {{date_evenement}}, etc.) and preview button
- Replaces the current Google Doc prompt storage

### Email Templates & Compose
- Template management in a dedicated "Modèles" section in the settings page — CRUD for templates, each with name, subject, body with {{variables}}
- Compose window: "Modèle" dropdown picker — selecting a template shows a preview with variables auto-substituted from lead data ({{nom}} → "Dupont", {{date_evenement}} → "15 juin 2026"), confirm to insert into compose body
- Compose area docked at bottom of thread detail pane (inline reply, like Gmail) — subject pre-filled for replies, body area with toolbar
- Reply threading: replies sent with correct Gmail threadId so they appear in the same conversation

### WhatsApp Integration
- WhatsApp Cloud API (Meta) directly — no Twilio middleman for WhatsApp
- WhatsApp conversations visible in both: activity timeline (color-coded with WhatsApp icon) AND dedicated chat-style section in lead detail
- Chat-style compose: simple text input at bottom of WhatsApp section, type and send, chat bubble display
- WhatsApp Business templates managed in the same settings page as email templates — required for initiating conversations outside 24h window
- 24h conversation window: visual indicator when window is open (free-form allowed), when expired compose switches to template-only mode with clear message
- Incoming WhatsApp messages trigger Free Mobile SMS alert to William (same pattern as new lead alerts)
- Webhook: POST /webhook/whatsapp endpoint — Meta sends message events, CRM links to lead by phone number
- V1: text messages only — incoming media shows placeholder "Média reçu", media support deferred to V2

### Claude's Discretion
- Thread list pagination/infinite scroll approach
- Exact compose toolbar features (bold, italic, etc.)
- Email thread rendering (plain text vs HTML)
- WhatsApp chat bubble styling details
- Settings page layout and tab organization
- OpenRouter model selection (claude-sonnet-4-6, etc.)
- WhatsApp webhook verification implementation
- Error handling for failed email sends and WhatsApp delivery

</decisions>

<specifics>
## Specific Ideas

- Inbox split-pane should feel like Gmail — thread list always visible while reading a thread
- AI draft flow must enforce review — there is no "send without preview" path (explicit out-of-scope requirement)
- Template preview should show real lead data substituted, not just placeholder names
- WhatsApp section should feel like a chat app (bubbles, timestamps) — distinct from the formal email compose
- 24h window indicator should be prominent so William knows when he can message freely vs needs a template

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/services/gmail.ts`: getGmailClient, searchMessages, getMessageContent — extend for thread listing, reply sending
- `src/db/schema.ts`: emailTemplates table and linkedEmails table already defined for Phase 4
- `src/services/alerts.ts`: Free Mobile SMS alerting — reuse for WhatsApp incoming message alerts
- `src/services/sms.ts`: Twilio SMS service — pattern reference for WhatsApp service
- `client/src/components/leads/ActivityTimeline.tsx`: Activity timeline component — extend with WhatsApp message type
- `client/src/components/layout/Sidebar.tsx`: NAV_ITEMS array — add inbox entry

### Established Patterns
- Express Router per webhook type (webhook.ts has Gmail, Pipedrive — add WhatsApp)
- DI pattern for API clients (gmail client as first arg) — apply to WhatsApp and OpenRouter clients
- Activity logging via activities table with type enum — add whatsapp_sent, whatsapp_received types
- Best-effort notifications (never throw on alert failure)
- shadcn/ui components with Tailwind — use for all new UI

### Integration Points
- `src/routes/webhook.ts`: Add WhatsApp webhook route
- `src/db/schema.ts`: May need whatsappMessages table, aiPromptTemplates table
- `client/src/components/layout/Sidebar.tsx`: Add "Boîte de réception" nav item
- `client/src/pages/LeadDetailPage.tsx`: Add Emails section and WhatsApp section
- New pages needed: /inbox, /settings (templates + AI prompt)

</code_context>

<deferred>
## Deferred Ideas

- WhatsApp media support (images, documents) — V2
- Gmail label management from CRM — V2 (MAIL-09)
- Full-text search across emails — V2 (MAIL-10)

</deferred>

---

*Phase: 04-gmail-inbox-ai-drafting-and-whatsapp*
*Context gathered: 2026-03-12*
