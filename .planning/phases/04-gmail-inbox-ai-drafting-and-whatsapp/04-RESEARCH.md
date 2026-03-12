# Phase 4: Gmail Inbox, AI Drafting, and WhatsApp - Research

**Researched:** 2026-03-12
**Domain:** Gmail API threads, OpenRouter/Claude AI drafting, WhatsApp Cloud API (Meta)
**Confidence:** HIGH

## Summary

Phase 4 adds three major capabilities: (1) a full Gmail inbox view with thread-based reading and reply composition, (2) AI-powered draft generation via OpenRouter using Claude models, and (3) WhatsApp messaging via Meta's Cloud API. The existing codebase already has a Gmail service with DI pattern, email templates and linked emails tables in the schema, and an activity timeline component ready for extension. The Gmail threads API, OpenRouter chat completions, and WhatsApp Cloud API are all well-documented and stable.

The biggest implementation risks are: correctly threading Gmail replies (requires threadId + In-Reply-To + References headers + matching Subject), WhatsApp 24-hour conversation window enforcement (must track last customer message timestamp), and ensuring the AI draft flow has no "send without review" path. The WhatsApp Business API approval process is a prerequisite -- if not yet approved, development can proceed against the test phone number in Meta's App Dashboard.

**Primary recommendation:** Build backend API routes first (Gmail threads, OpenRouter proxy, WhatsApp send/receive), then layer the frontend (inbox split-pane, compose windows, WhatsApp chat, settings page) on top. Use the existing DI and activity logging patterns consistently.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- New sidebar tab "Boite de reception" alongside Pipeline -- dedicated /inbox route
- Split-pane layout: thread list on left, selected thread's messages on right
- Thread list items show: sender name, subject, snippet preview, relative date, and lead badge (name + status) when sender matches a lead
- Unread threads bold in the list
- Lead detail page gets a dedicated "Emails" section showing all threads linked to that lead, with inline thread view
- AI provider: Claude API via OpenRouter (https://openrouter.ai/docs/)
- Draft flow: "Generer un brouillon" button on lead -> AI generates draft -> preview in compose window -> William edits -> sends. No path to send without review.
- Full lead context feeds the AI prompt: name, event date, budget, status, last 5 email exchanges, notes
- AI prompt template managed in a dedicated "Parametres IA" section in a settings page -- textarea editor with variable placeholders
- Template management in a dedicated "Modeles" section in the settings page -- CRUD for templates
- Compose window: "Modele" dropdown picker with auto-substituted preview
- Compose area docked at bottom of thread detail pane (inline reply, like Gmail)
- Reply threading: replies sent with correct Gmail threadId
- WhatsApp Cloud API (Meta) directly -- no Twilio middleman for WhatsApp
- WhatsApp conversations visible in both: activity timeline AND dedicated chat-style section in lead detail
- Chat-style compose: simple text input at bottom of WhatsApp section, chat bubble display
- 24h conversation window: visual indicator when window is open, when expired compose switches to template-only mode
- Incoming WhatsApp messages trigger Free Mobile SMS alert to William
- Webhook: POST /webhook/whatsapp endpoint
- V1: text messages only -- incoming media shows placeholder "Media recu"

### Claude's Discretion
- Thread list pagination/infinite scroll approach
- Exact compose toolbar features (bold, italic, etc.)
- Email thread rendering (plain text vs HTML)
- WhatsApp chat bubble styling details
- Settings page layout and tab organization
- OpenRouter model selection (claude-sonnet-4-6, etc.)
- WhatsApp webhook verification implementation
- Error handling for failed email sends and WhatsApp delivery

### Deferred Ideas (OUT OF SCOPE)
- WhatsApp media support (images, documents) -- V2
- Gmail label management from CRM -- V2 (MAIL-09)
- Full-text search across emails -- V2 (MAIL-10)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MAIL-01 | User can view Gmail inbox within the CRM interface | Gmail threads.list API + split-pane frontend pattern |
| MAIL-02 | User can read email threads linked to a specific lead | Gmail threads.get API + linkedEmails table + lead detail Emails section |
| MAIL-03 | User can reply to emails directly from the CRM | Gmail messages.send with threadId + RFC 2822 headers |
| MAIL-04 | System automatically links incoming emails to existing leads by sender email | Email-to-lead matching on existing webhook sweep + linkedEmails insert |
| MAIL-05 | User can create and manage reusable email templates with variables | emailTemplates table already in schema + CRUD API + settings UI |
| MAIL-06 | System generates AI email draft based on lead context | OpenRouter chat completions + lead context assembly |
| MAIL-07 | User can review, edit, and send AI-generated drafts before sending | Draft flow UI with mandatory preview step |
| MAIL-08 | User can manage the AI prompt template within the app | aiPromptTemplates table + settings UI textarea |
| NOTF-04 | User can send WhatsApp messages to prospects via WhatsApp Business API | WhatsApp Cloud API POST messages endpoint |
| NOTF-05 | User can view WhatsApp Business conversations linked to a lead within the CRM | whatsappMessages table + chat-style UI in lead detail |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| googleapis | ^171.4.0 | Gmail threads.list, threads.get, messages.send | Already in project, official Google SDK |
| axios | ^1.13.6 | OpenRouter API calls, WhatsApp Cloud API calls | Already in project, simple HTTP client |

### Supporting (New Dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | - | OpenRouter API | Use axios directly -- OpenRouter is a simple REST API (POST to /api/v1/chat/completions) |
| (none) | - | WhatsApp Cloud API | Use axios directly -- simple REST API (POST to graph.facebook.com) |

### No New Dependencies Needed

OpenRouter and WhatsApp Cloud API are both simple REST APIs that work perfectly with axios (already installed). There is no need for any SDK -- the WhatsApp Node.js SDK adds complexity without value for this use case (text-only V1).

**Installation:**
```bash
# No new packages needed -- all APIs handled via existing axios + googleapis
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  services/
    gmail.ts              # Extend: listThreads, getThread, sendReply
    openrouter.ts         # NEW: generateDraft(leadContext, promptTemplate)
    whatsapp.ts           # NEW: sendMessage, verifyWebhook, processIncoming
  routes/
    api/
      inbox.ts            # NEW: GET /api/inbox/threads, GET /api/inbox/threads/:id
      templates.ts        # NEW: CRUD /api/templates, /api/ai-prompt
      whatsapp.ts         # NEW: GET/POST /api/leads/:id/whatsapp
    webhook.ts            # Extend: add WhatsApp webhook route
  db/
    schema.ts             # Extend: whatsappMessages table, aiPromptConfig table

client/src/
  pages/
    InboxPage.tsx          # NEW: split-pane inbox
    SettingsPage.tsx        # NEW: templates + AI prompt management
  components/
    inbox/
      ThreadList.tsx        # Thread list panel
      ThreadDetail.tsx      # Message list + compose area
      ComposeReply.tsx      # Reply compose with template picker
    whatsapp/
      WhatsAppChat.tsx      # Chat bubble display
      WhatsAppCompose.tsx   # Text input with 24h window indicator
    settings/
      TemplateEditor.tsx    # Template CRUD
      AiPromptEditor.tsx    # AI prompt template editor
```

### Pattern 1: Gmail Thread Listing and Reply
**What:** Use Gmail threads.list for inbox, threads.get for conversation view, messages.send with threadId for replies
**When to use:** All inbox-related operations

**Gmail threads.list call:**
```typescript
// List threads from Gmail inbox
async function listThreads(
  gmail: gmail_v1.Gmail,
  options: { maxResults?: number; pageToken?: string; q?: string }
): Promise<{ threads: gmail_v1.Schema$Thread[]; nextPageToken?: string }> {
  const res = await gmail.users.threads.list({
    userId: 'me',
    maxResults: options.maxResults || 20,
    pageToken: options.pageToken,
    q: options.q, // e.g., 'in:inbox'
  });
  return {
    threads: res.data.threads || [],
    nextPageToken: res.data.nextPageToken || undefined,
  };
}
```

**Gmail reply with correct threading:**
```typescript
// Reply to a thread -- MUST include threadId, In-Reply-To, References, matching Subject
async function sendReply(
  gmail: gmail_v1.Gmail,
  threadId: string,
  to: string,
  subject: string,
  body: string,
  inReplyTo: string,   // Message-ID header of the message being replied to
  references: string,   // References header chain
): Promise<void> {
  const raw = Buffer.from([
    `To: ${to}`,
    `Subject: ${subject}`,         // Must match original subject (with Re: prefix)
    `In-Reply-To: ${inReplyTo}`,
    `References: ${references}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\n')).toString('base64url');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw, threadId },
  });
}
```

### Pattern 2: OpenRouter AI Draft Generation
**What:** Call OpenRouter's chat completions endpoint to generate email drafts
**When to use:** When user clicks "Generer un brouillon" on a lead

```typescript
// OpenRouter chat completions call
async function generateDraft(
  leadContext: LeadContext,
  promptTemplate: string,
  openrouterApiKey: string,
): Promise<string> {
  // Substitute lead variables into the system prompt template
  const systemPrompt = substituteVariables(promptTemplate, leadContext);

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'anthropic/claude-sonnet-4', // Configurable -- see Claude's Discretion
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Genere un brouillon de reponse pour ${leadContext.name}.` },
      ],
      max_tokens: 1024,
      temperature: 0.7,
    },
    {
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://weds.fr',
        'X-OpenRouter-Title': 'Weds CRM',
      },
    },
  );

  return response.data.choices[0].message.content;
}
```

### Pattern 3: WhatsApp Cloud API Integration
**What:** Send/receive WhatsApp messages via Meta's Graph API
**When to use:** WhatsApp messaging from lead detail page

```typescript
// Send WhatsApp text message
async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,        // E.164 format with country code
  body: string,
): Promise<string> {
  const response = await axios.post(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body },
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return response.data.messages[0].id; // WhatsApp message ID
}
```

### Pattern 4: WhatsApp Webhook Verification + Incoming Messages
**What:** Handle Meta's webhook verification (GET) and incoming message notifications (POST)
**When to use:** POST /webhook/whatsapp endpoint

```typescript
// GET /webhook/whatsapp -- Meta verification
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// POST /webhook/whatsapp -- Incoming messages
router.post('/whatsapp', (req, res) => {
  res.status(200).json({ status: 'ok' }); // Acknowledge immediately (< 5s timeout)

  setImmediate(async () => {
    // Extract message from nested payload
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) return;

    // message.from = sender phone (E.164)
    // message.text?.body = text content
    // message.timestamp = Unix timestamp
    // Link to lead by phone number match
  });
});
```

### Anti-Patterns to Avoid
- **Sending AI drafts without review:** There must be no code path that calls messages.send directly from the AI draft generation. Draft MUST go through compose window first.
- **Missing threadId on replies:** Gmail will create a new thread if threadId is missing or In-Reply-To/References/Subject headers don't match. Always extract these from the original message.
- **Blocking webhook responses:** WhatsApp webhooks timeout in 5-10 seconds. Always respond 200 immediately, process asynchronously (same pattern as existing Gmail/Pipedrive webhooks).
- **Hardcoding OpenRouter model:** Store model name in config/env so it can be changed without code changes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email threading | Custom thread tracking | Gmail threadId + In-Reply-To + References headers | Gmail handles conversation grouping; just pass the right IDs |
| Email MIME construction | Full MIME builder | Extend existing raw MIME in gmail.ts sendEmail | Already works; just add threading headers |
| Template variable substitution | Regex-based parser | Simple string.replace with {{variable}} pattern | Only ~6 variables (nom, date_evenement, budget, etc.); no need for a template engine |
| WhatsApp message delivery tracking | Custom delivery status system | WhatsApp webhook statuses (sent, delivered, read) | Meta sends status updates automatically via the same webhook |
| AI prompt management | Complex versioning system | Single row in DB with prompt text + updated_at | Single user, one prompt template -- no versioning needed |

## Common Pitfalls

### Pitfall 1: Gmail Reply Not Threading Correctly
**What goes wrong:** Reply creates a new thread instead of appearing in the original conversation
**Why it happens:** Missing or incorrect threadId, In-Reply-To, References, or Subject header
**How to avoid:** When getting a thread via threads.get, extract the Message-ID header from the last message. Set In-Reply-To to that Message-ID, set References to the full chain, prepend "Re: " to subject if not already present, and pass threadId in the send request body.
**Warning signs:** Replies appear as separate threads in Gmail web interface

### Pitfall 2: WhatsApp 24-Hour Window Expiration
**What goes wrong:** Attempt to send free-form message after 24h window expires, Meta rejects with error
**Why it happens:** The 24-hour customer service window starts from the last customer message. After expiry, only pre-approved template messages can be sent.
**How to avoid:** Store the timestamp of the last incoming WhatsApp message per lead. Before composing, check if current time is within 24h. If expired, switch UI to template-only mode. Display a clear visual indicator.
**Warning signs:** 400 errors from WhatsApp API with message about conversation window

### Pitfall 3: OpenRouter API Key Exposure
**What goes wrong:** API key sent to frontend or exposed in client-side code
**Why it happens:** Calling OpenRouter directly from the browser
**How to avoid:** Always proxy through backend. POST /api/ai/generate-draft calls OpenRouter server-side. Frontend never sees the API key.
**Warning signs:** API key visible in browser network tab

### Pitfall 4: Gmail API Rate Limits
**What goes wrong:** Too many threads.get calls when loading inbox, hitting Gmail API quota
**Why it happens:** Gmail API has per-user rate limits (250 quota units/second). threads.list = 5 units, threads.get = 10 units.
**How to avoid:** Use threads.list with format=MINIMAL for the list view (returns snippet already). Only call threads.get when user clicks a thread. Implement client-side caching with React Query (already in project).
**Warning signs:** 429 errors from Gmail API

### Pitfall 5: WhatsApp Webhook Signature Not Verified
**What goes wrong:** Anyone can POST to /webhook/whatsapp with fake payloads
**Why it happens:** Not checking the X-Hub-Signature-256 header that Meta sends
**How to avoid:** Compute HMAC-SHA256 of the raw request body using your app secret, compare with the X-Hub-Signature-256 header. Similar to how Pipedrive webhook uses basic auth verification.
**Warning signs:** Unexpected messages appearing in the system

### Pitfall 6: Email Linking Misses Due to Email Format Differences
**What goes wrong:** Incoming emails not linked to leads because email comparison fails
**Why it happens:** Gmail "From" header may include display name + angle brackets, lead email stored differently
**How to avoid:** Extract email address from From header (parse angle brackets), normalize to lowercase, then match against lead.email (also lowercase). Consider phone-based matching as secondary strategy.
**Warning signs:** Activities show as unlinked emails

## Code Examples

### Extending Activity Type Enum for WhatsApp
```typescript
// In src/db/schema.ts -- extend activityTypeEnum
export const activityTypeEnum = pgEnum('activity_type', [
  'email_received',
  'sms_sent',
  'email_sent',
  'status_change',
  'note_added',
  'duplicate_inquiry',
  'notification_failed',
  'pipedrive_synced',
  'whatsapp_sent',      // NEW
  'whatsapp_received',  // NEW
]);
```

### New WhatsApp Messages Table
```typescript
// In src/db/schema.ts
export const whatsappMessages = pgTable('whatsapp_messages', {
  id: serial('id').primaryKey(),
  leadId: integer('lead_id').references(() => leads.id).notNull(),
  waMessageId: varchar('wa_message_id', { length: 255 }), // WhatsApp's message ID
  direction: varchar('direction', { length: 10 }).notNull(), // 'inbound' | 'outbound'
  body: text('body'),
  status: varchar('status', { length: 20 }), // 'sent' | 'delivered' | 'read' | 'failed'
  createdAt: timestamp('created_at').defaultNow(),
});
```

### New AI Prompt Config Table
```typescript
// In src/db/schema.ts
export const aiPromptConfig = pgTable('ai_prompt_config', {
  id: serial('id').primaryKey(),
  promptTemplate: text('prompt_template').notNull(),
  model: varchar('model', { length: 100 }).default('anthropic/claude-sonnet-4'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Lead Context Assembly for AI Draft
```typescript
interface LeadContext {
  name: string;
  eventDate: string | null;
  budget: number | null;
  status: string | null;
  recentEmails: { direction: string; snippet: string; date: string }[];
  notes: string[];
}

// Assemble context from lead + last 5 email exchanges + notes
async function assembleLeadContext(leadId: number): Promise<LeadContext> {
  const db = getDb();
  const lead = await db.select().from(leads).where(eq(leads.id, leadId));
  const emails = await db.select().from(linkedEmails)
    .where(eq(linkedEmails.leadId, leadId))
    .orderBy(desc(linkedEmails.receivedAt))
    .limit(5);
  const noteActivities = await db.select().from(activities)
    .where(and(eq(activities.leadId, leadId), eq(activities.type, 'note_added')))
    .orderBy(desc(activities.createdAt))
    .limit(5);

  return {
    name: lead[0].name,
    eventDate: lead[0].eventDate,
    budget: lead[0].budget,
    status: lead[0].status,
    recentEmails: emails.map(e => ({
      direction: e.direction || 'inbound',
      snippet: e.snippet || '',
      date: e.receivedAt?.toISOString() || '',
    })),
    notes: noteActivities.map(a => a.content || ''),
  };
}
```

### Template Variable Substitution
```typescript
// Simple variable substitution -- no template engine needed
function substituteVariables(
  template: string,
  lead: { name: string; eventDate: string | null; budget: number | null; email: string | null; phone: string | null },
): string {
  return template
    .replace(/\{\{nom\}\}/g, lead.name || '')
    .replace(/\{\{date_evenement\}\}/g, lead.eventDate || '')
    .replace(/\{\{budget\}\}/g, lead.budget?.toString() || '')
    .replace(/\{\{email\}\}/g, lead.email || '')
    .replace(/\{\{telephone\}\}/g, lead.phone || '');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WhatsApp Conversation-Based Pricing | Per-Message Pricing (PMP) | July 2025 | Simpler billing; utility templates free within CSW |
| WhatsApp Graph API v18 | Graph API v21+ | 2025 | Use v21.0 or latest stable |
| OpenRouter basic completions | Chat completions with tool support | 2025 | Use /api/v1/chat/completions endpoint |

**Deprecated/outdated:**
- Do NOT use WhatsApp Graph API versions below v18 -- older versions are sunset
- OpenRouter's old /api/v1/completions (non-chat) endpoint is deprecated -- use chat/completions

## Open Questions

1. **WhatsApp Business API Approval Status**
   - What we know: STATE.md notes "WhatsApp Business API approval process takes weeks -- begin the application during Phase 2 or 3"
   - What's unclear: Whether the application has been submitted and approved
   - Recommendation: Check Meta Business Manager for approval status. If not approved, develop against the test phone number in Meta's App Dashboard, which allows sending to up to 5 verified numbers

2. **Gmail API Quota for Inbox Listing**
   - What we know: Gmail API has 250 quota units/second per user. threads.list = 5 units, threads.get = 10 units
   - What's unclear: Whether loading 20 threads with snippets will be fast enough for real-time feel
   - Recommendation: Use threads.list with maxResults=20 (returns id + snippet + historyId). Only fetch full thread on click. React Query caching handles repeat views.

3. **OpenRouter Rate Limits and Cost**
   - What we know: OpenRouter proxies to Anthropic. Claude Sonnet 4 is cost-effective for drafting.
   - What's unclear: Exact per-minute rate limits on OpenRouter
   - Recommendation: Single-user CRM will not hit rate limits. Use anthropic/claude-sonnet-4 as default (good quality/cost ratio). Allow model override in settings.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MAIL-01 | Gmail threads list API returns threads with pagination | unit | `npx vitest run tests/inbox.test.ts -t "listThreads" -x` | No -- Wave 0 |
| MAIL-02 | Linked emails fetched by lead ID | unit | `npx vitest run tests/inbox.test.ts -t "getLinkedEmails" -x` | No -- Wave 0 |
| MAIL-03 | Reply sent with correct threadId + headers | unit | `npx vitest run tests/inbox.test.ts -t "sendReply" -x` | No -- Wave 0 |
| MAIL-04 | Incoming email matched to lead by sender address | unit | `npx vitest run tests/inbox.test.ts -t "linkEmail" -x` | No -- Wave 0 |
| MAIL-05 | Template CRUD operations | unit | `npx vitest run tests/api/templates.test.ts -x` | No -- Wave 0 |
| MAIL-06 | AI draft generation calls OpenRouter with lead context | unit | `npx vitest run tests/ai-draft.test.ts -t "generateDraft" -x` | No -- Wave 0 |
| MAIL-07 | Draft returned as preview, not auto-sent | unit | `npx vitest run tests/ai-draft.test.ts -t "draftPreview" -x` | No -- Wave 0 |
| MAIL-08 | AI prompt config CRUD | unit | `npx vitest run tests/api/ai-config.test.ts -x` | No -- Wave 0 |
| NOTF-04 | WhatsApp message sent via Cloud API | unit | `npx vitest run tests/whatsapp.test.ts -t "sendMessage" -x` | No -- Wave 0 |
| NOTF-05 | WhatsApp incoming message stored and linked to lead | unit | `npx vitest run tests/whatsapp.test.ts -t "receiveMessage" -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/inbox.test.ts` -- covers MAIL-01, MAIL-02, MAIL-03, MAIL-04
- [ ] `tests/api/templates.test.ts` -- covers MAIL-05
- [ ] `tests/ai-draft.test.ts` -- covers MAIL-06, MAIL-07
- [ ] `tests/api/ai-config.test.ts` -- covers MAIL-08
- [ ] `tests/whatsapp.test.ts` -- covers NOTF-04, NOTF-05
- [ ] `tests/helpers/fixtures.ts` -- extend with email thread and WhatsApp message fixtures

## Sources

### Primary (HIGH confidence)
- [Gmail API Threads Guide](https://developers.google.com/workspace/gmail/api/guides/threads) -- thread listing, getting, replying
- [Gmail API threads.list Reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/list) -- pagination, query params
- [Gmail API threads.get Reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/get) -- format options
- [OpenRouter API Reference](https://openrouter.ai/docs/api/reference/overview) -- chat completions endpoint, headers, model format
- [OpenRouter Authentication](https://openrouter.ai/docs/api/reference/authentication) -- Bearer token auth
- [OpenRouter Claude Sonnet 4](https://openrouter.ai/anthropic/claude-sonnet-4) -- model ID: anthropic/claude-sonnet-4
- [WhatsApp Cloud API Send Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages/) -- send text endpoint
- [WhatsApp Cloud API Messages Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages/) -- payload format
- [WhatsApp Webhook Setup](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks/) -- verification flow, incoming payload
- [WhatsApp Webhooks Reference](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/) -- message webhook payload structure

### Secondary (MEDIUM confidence)
- [WhatsApp Business Policy](https://business.whatsapp.com/policy) -- 24h window rules, template requirements
- [WhatsApp 24h Window Guide](https://www.smsmode.com/en/whatsapp-business-api-customer-care-window-ou-templates-comment-les-utiliser/) -- conversation window mechanics
- [Gmail Thread Reply Pattern](https://github.com/googleapis/google-api-nodejs-client/issues/710) -- community-verified threadId + headers approach

### Tertiary (LOW confidence)
- WhatsApp pricing changes (July 2025 PMP) -- pricing model for cost estimation only

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- googleapis and axios already in project, OpenRouter and WhatsApp are simple REST APIs
- Architecture: HIGH -- follows existing patterns (DI, webhook routes, activity logging, React Query)
- Pitfalls: HIGH -- Gmail threading pitfalls well-documented, WhatsApp 24h window well-known
- WhatsApp Cloud API details: MEDIUM -- webhook payload structure from secondary sources, official docs CSS-only on fetch

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable APIs, 30-day window)
