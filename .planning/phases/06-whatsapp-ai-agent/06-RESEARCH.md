# Phase 6: WhatsApp AI Agent - Research

**Researched:** 2026-03-17
**Domain:** AI agent integration (OpenRouter + WhatsApp Cloud API), webhook interception, per-lead state management
**Confidence:** HIGH

## Summary

Phase 6 adds an autonomous AI agent that intercepts incoming WhatsApp messages, generates contextual responses via OpenRouter, and auto-sends them. The agent operates per-lead (toggle on/off), uses structured JSON output to decide between replying and passing to human, and integrates deeply into the existing webhook handler (`POST /webhook/whatsapp`).

The codebase already has all the building blocks: `openrouter.ts` with `assembleLeadContext()` + `generateDraft()`, `whatsapp.ts` with `sendWhatsAppMessage()`, the webhook handler that parses incoming messages and finds the matching lead, and the `aiPromptConfig` table pattern for editable prompts. The work is primarily: (1) schema changes (new columns on `leads` + `whatsappMessages`), (2) a new `whatsapp-agent.ts` service, (3) webhook handler modification, (4) UI toggle + badge in WhatsAppChat, (5) Settings page for WhatsApp-specific prompt + knowledge base.

**Primary recommendation:** Build a single `src/services/whatsapp-agent.ts` that encapsulates all AI logic (context assembly, OpenRouter call with JSON schema, handoff detection, alert dispatch, consecutive counter management). The webhook handler calls this service after message storage when `lead.whatsappAiEnabled === true`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Vouvoiement pour les statuts `nouveau`, `contacte`, `rdv`, `devis_envoye`; tutoiement pour `signe`
- Prompt doit gerer le cas "deux maries" (pluriel)
- Format SMS/WhatsApp : messages courts, pas de longs paves
- L'agent peut repondre aux questions basiques sur les prestations (style photo, deroulement journee, equipe, materiel) -- infos tirees de la base de connaissances
- L'agent ne donne JAMAIS de tarifs, disponibilites de dates specifiques, ou devis
- Prompt systeme WhatsApp **separe** du prompt email (chacun a son editeur dans Settings)
- Deux sources de contexte : prompt systeme de base + champ editable "Base de connaissances" dans Settings
- Le prompt est modifiable via l'interface Settings sans toucher au code
- Le prompt inclut le contexte du lead (nom, date evenement, statut) et l'historique des 10 derniers messages WhatsApp
- Reponse IA en JSON structure : `{ action: "reply" | "pass_to_human", response: string, reason: string }`
- Triggers handoff : tarifs/devis, disponibilites dates, reclamation/probleme, question hors perimetre, 5 echanges IA consecutifs sans resolution
- L'agent reste **silencieux** lors du handoff -- pas de message de transition au prospect
- Alerte admin : SMS Free Mobile + email avec contexte complet (historique conversation, raison IA)
- Anti-spam alertes : max 1 alerte par lead par heure (meme si plusieurs handoffs)
- Re-activation automatique : des qu'un lead envoie un nouveau message, l'agent l'analyse immediatement (meme apres un pass_to_human)
- Si c'est encore un sujet sensible, il re-passe la main sans re-alerter (si < 1h depuis la derniere alerte)
- Pas de delai ni de condition sur la reponse humaine -- l'agent est toujours pret a analyser
- Toggle switch "Agent IA" positionne au-dessus du chat WhatsApp (bandeau entre onglets et messages)
- Confirmation requise avant desactivation manuelle (dialog)
- Messages envoyes par l'IA ont un badge "IA" visible pour differencier des messages humains
- Quand l'agent a fait un pass_to_human : badge orange "En attente de reponse humaine" affiche sous le toggle
- Le toggle reste actif pendant un handoff (l'agent re-analysera au prochain message)

### Claude's Discretion
- Modele OpenRouter a utiliser (Claude Sonnet par defaut, comme l'email draft)
- Format exact du badge IA sur les messages
- Gestion des erreurs API OpenRouter (retry, fallback)
- Schema exact de la table/colonne pour le compteur de messages IA consecutifs

### Deferred Ideas (OUT OF SCOPE)
- Historique des decisions IA visible dans l'UI -- Phase 7
- Langfuse traces -- Phase 7
- Agent IA pour les emails -- future milestone
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WAIA-01 | L'utilisateur peut activer/desactiver l'agent IA WhatsApp par lead via un toggle | New `whatsappAiEnabled` boolean column on `leads` table + toggle UI in WhatsAppChat banner |
| WAIA-02 | Quand l'agent est actif et qu'un message arrive, le systeme genere une reponse IA basee sur le contexte du lead | Webhook handler intercepts after message storage, calls `whatsapp-agent.ts` which assembles WhatsApp-specific context + calls OpenRouter |
| WAIA-03 | L'IA repond en JSON structure (action: reply/pass_to_human, response, reason) | OpenRouter call with explicit JSON format instruction in system prompt; parse response with zod validation |
| WAIA-04 | Si action=reply, la reponse est envoyee automatiquement via WhatsApp | Agent service calls existing `sendWhatsAppMessage()` then stores message with `sentBy: 'ai'` |
| WAIA-05 | Si action=pass_to_human, l'agent est desactive pour cette conversation et une alerte admin est envoyee | Set `whatsappAiHandoffAt` timestamp on lead, dispatch SMS + email alert with rate limiting (1/lead/hour) |
| WAIA-06 | Si le lead renvoie un nouveau message, l'agent peut a nouveau analyser et repondre (re-activation automatique) | Agent always analyzes when `whatsappAiEnabled=true`, regardless of handoff state; handoff is not a permanent disable |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OpenRouter API | v1 | AI completions via `anthropic/claude-sonnet-4` | Already used for email drafts in `openrouter.ts` |
| axios | existing | HTTP client for OpenRouter + Free Mobile SMS | DI pattern already established |
| drizzle-orm | existing | Schema + migrations for new columns | All DB access uses Drizzle |
| zod | existing | Validate AI JSON response structure | Already used for all request validation |
| Express | existing | Webhook + API routes | Project standard |

### Supporting (already in project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tanstack/react-query | existing | Client-side state for toggle + messages | Hooks in `useWhatsApp.ts` |
| sonner | existing | Toast notifications for toggle actions | UI feedback |
| lucide-react | existing | Icons for AI badge, toggle states | UI elements |
| shadcn/ui | existing | Switch, Badge, AlertDialog components | Toggle + confirmation + badge |

### No New Dependencies Required
This phase requires zero new npm packages. All functionality is built on existing stack.

## Architecture Patterns

### Recommended Project Structure
```
src/
  services/
    whatsapp-agent.ts      # NEW: AI agent logic (core service)
  routes/
    webhook.ts             # MODIFY: inject agent call after message storage
    api/
      whatsapp.ts          # MODIFY: add toggle endpoint
      ai.ts                # MODIFY: add WhatsApp prompt CRUD endpoints
  db/
    schema.ts              # MODIFY: add columns to leads + whatsappMessages tables
    migrations/
      0004_*.sql           # NEW: migration for schema changes

client/src/
  components/
    whatsapp/
      WhatsAppChat.tsx         # MODIFY: add agent banner with toggle + handoff badge
      WhatsAppChat.tsx         # MODIFY: ChatBubble shows AI badge
    settings/
      WhatsAppAgentSettings.tsx  # NEW: prompt editor + knowledge base editor
  hooks/
    useWhatsApp.ts             # MODIFY: add useToggleAiAgent, useLeadAiStatus hooks
  pages/
    SettingsPage.tsx            # MODIFY: add "Agent WhatsApp" tab
```

### Pattern 1: Webhook Interception (async, non-blocking)
**What:** After storing the inbound message and creating the activity, check if AI agent is enabled for the lead and dispatch AI processing asynchronously.
**When to use:** In the `POST /webhook/whatsapp` handler, inside the existing `if (lead)` block.
**Example:**
```typescript
// In webhook.ts, after message storage + activity creation, before SMS alert
// The AI agent runs INSTEAD of the default Free Mobile SMS alert for incoming messages
if (lead.whatsappAiEnabled) {
  setImmediate(async () => {
    try {
      await processWhatsAppAiResponse(lead, text);
    } catch (error) {
      logger.error('Agent IA WhatsApp: erreur traitement', {
        leadId: lead.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
```

### Pattern 2: Structured JSON Response from OpenRouter
**What:** Force the AI to return structured JSON with action/response/reason fields.
**When to use:** Every AI agent call.
**Example:**
```typescript
const aiResponseSchema = z.object({
  action: z.enum(['reply', 'pass_to_human']),
  response: z.string(),
  reason: z.string(),
});

// In the system prompt, explicitly instruct:
// "Tu DOIS repondre en JSON avec exactement ce format: {action, response, reason}"
// Then parse: aiResponseSchema.safeParse(JSON.parse(content))
```

### Pattern 3: Separate WhatsApp AI Prompt Config
**What:** A second row in `aiPromptConfig` (or a new table) to store the WhatsApp agent prompt separately from the email draft prompt.
**When to use:** Settings page has two separate editors.
**Recommended approach:** Add a `type` discriminator column to `aiPromptConfig` (`'email_draft' | 'whatsapp_agent'`) or create a dedicated `whatsappAgentConfig` table with `promptTemplate`, `knowledgeBase`, and `model` fields.

**Recommendation: dedicated `whatsappAgentConfig` table.** Reasons:
- The WhatsApp agent needs a `knowledgeBase` text field (separate from prompt template)
- Different default prompt vs email
- Cleaner separation, no risk of breaking existing email draft feature
- Single-row table (like `aiPromptConfig`)

```typescript
export const whatsappAgentConfig = pgTable('whatsapp_agent_config', {
  id: serial('id').primaryKey(),
  promptTemplate: text('prompt_template').notNull(),
  knowledgeBase: text('knowledge_base'), // editable "base de connaissances"
  model: varchar('model', { length: 100 }).default('anthropic/claude-sonnet-4'),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Pattern 4: Per-Lead AI State (columns on `leads` table)
**What:** Track AI agent state directly on the lead record.
**Why columns on leads, not a separate table:** Simple boolean + timestamp, queried on every webhook, no join needed.

```typescript
// New columns on leads table:
whatsappAiEnabled: boolean('whatsapp_ai_enabled').default(false),
whatsappAiHandoffAt: timestamp('whatsapp_ai_handoff_at'), // last pass_to_human timestamp
whatsappAiLastAlertAt: timestamp('whatsapp_ai_last_alert_at'), // anti-spam: last alert sent
whatsappAiConsecutiveCount: integer('whatsapp_ai_consecutive_count').default(0), // resets when human sends
```

### Pattern 5: Message Origin Tracking
**What:** Add `sentBy` column to `whatsappMessages` to distinguish human vs AI messages.
```typescript
// New column on whatsappMessages:
sentBy: varchar('sent_by', { length: 10 }).default('human'), // 'human' | 'ai'
```

### Anti-Patterns to Avoid
- **Blocking the webhook response for AI:** The AI call takes 1-5 seconds. MUST use `setImmediate` to process async (already the established pattern in this codebase).
- **Storing AI decisions in a separate log table in Phase 6:** Deferred to Phase 7. Just store `sentBy` and `whatsappAiHandoffAt` for now.
- **Using function calling / tool_use for structured output:** OpenRouter's tool_use support varies by model. Simpler and more reliable to instruct JSON in the system prompt and parse with zod.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON response parsing | Regex extraction of JSON fields | `zod.safeParse(JSON.parse(content))` | Edge cases: escaped quotes, newlines, partial JSON |
| Rate limiting alerts | Custom timestamp comparison | Simple check: `lastAlertAt && (now - lastAlertAt) < 3600000` on lead column | Already have timestamp columns on leads table |
| Toggle confirmation dialog | Custom modal | shadcn `AlertDialog` component | Already available in shadcn/ui |
| WhatsApp message context | Manual string building | Extend `assembleLeadContext` pattern with WhatsApp-specific data | Consistent with email draft approach |

## Common Pitfalls

### Pitfall 1: OpenRouter Returns Non-JSON or Malformed JSON
**What goes wrong:** The AI model sometimes wraps JSON in markdown code blocks (```json ... ```) or adds explanatory text around the JSON.
**Why it happens:** LLMs are probabilistic; even with explicit instructions, they occasionally deviate.
**How to avoid:**
1. Strip markdown code fences before parsing: `content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()`
2. Use `zod.safeParse()` and handle failure gracefully (treat as `pass_to_human`)
3. Add a fallback: if JSON parse fails, log the raw response and pass to human
**Warning signs:** `SyntaxError: Unexpected token` in logs

### Pitfall 2: WhatsApp 24h Window Constraint
**What goes wrong:** The AI agent tries to send a free-form reply but the 24h window has expired.
**Why it happens:** Prospect sends a message (opens window), but AI response is delayed or fails, and by the time retry happens, window may be closed. Or: the message is the first in >24h.
**How to avoid:** An incoming message from the prospect ALWAYS opens a new 24h window. The AI response will be within seconds, so the window is guaranteed to be open. No special handling needed for the agent -- the window check is only relevant for human-initiated messages.
**Warning signs:** 400 errors from WhatsApp API with "outside of allowed window"

### Pitfall 3: Consecutive Counter Not Resetting
**What goes wrong:** The 5-message consecutive AI counter keeps incrementing even after William responds manually.
**Why it happens:** The counter is only updated by the AI agent, not by the human send endpoint.
**How to avoid:** In the `POST /api/leads/:leadId/whatsapp/send` handler (human sends), reset `whatsappAiConsecutiveCount` to 0.
**Warning signs:** Agent keeps handing off after William has already responded

### Pitfall 4: Duplicate AI Processing
**What goes wrong:** The same inbound message triggers the AI agent multiple times (Meta webhook retry).
**Why it happens:** Meta retries webhooks if the response is slow (>15s) or returns non-200.
**How to avoid:** The webhook already returns 200 immediately before processing. The `waMessageId` is stored in DB -- could check for duplicate `waMessageId` before AI processing, but the current architecture (immediate 200 + `setImmediate`) should prevent retries.
**Warning signs:** Multiple AI responses to the same prospect message

### Pitfall 5: AI Agent Processes Status Updates
**What goes wrong:** `parseIncomingMessage` returns null for status updates, but if logic changes, status events could trigger AI.
**How to avoid:** The null check already exists. Ensure the AI agent check is ONLY called when `parsed` is non-null and text is actual content (not 'Media recu').
**Warning signs:** AI trying to respond to delivery receipts

## Code Examples

### WhatsApp Agent Service Core
```typescript
// src/services/whatsapp-agent.ts
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import axios from 'axios';
import { getDb } from '../db/index.js';
import { leads, whatsappMessages, whatsappAgentConfig } from '../db/schema.js';
import { sendWhatsAppMessage } from './whatsapp.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

const aiResponseSchema = z.object({
  action: z.enum(['reply', 'pass_to_human']),
  response: z.string(),
  reason: z.string(),
});

export async function processWhatsAppAiResponse(
  lead: Lead,
  incomingText: string,
): Promise<void> {
  const db = getDb();

  // 1. Load WhatsApp agent config (prompt + knowledge base)
  const [agentConfig] = await db.select().from(whatsappAgentConfig).limit(1);
  if (!agentConfig) {
    logger.warn('Agent IA WhatsApp: aucune configuration trouvee, passage a l\'humain');
    return;
  }

  // 2. Fetch last 10 WhatsApp messages for context
  const recentMessages = await db.select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.leadId, lead.id))
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(10);

  // 3. Build system prompt with lead context + conversation history
  const systemPrompt = buildSystemPrompt(agentConfig, lead, recentMessages.reverse());

  // 4. Call OpenRouter
  const response = await callOpenRouter(systemPrompt, incomingText, agentConfig.model);

  // 5. Parse structured JSON response
  const parsed = parseAiResponse(response);

  if (parsed.action === 'reply') {
    // Send reply via WhatsApp
    const waId = await sendWhatsAppMessage(
      config.WHATSAPP_PHONE_NUMBER_ID!,
      config.WHATSAPP_ACCESS_TOKEN!,
      lead.phone!,
      parsed.response,
    );
    // Store with sentBy: 'ai'
    await db.insert(whatsappMessages).values({
      leadId: lead.id, waMessageId: waId,
      direction: 'outbound', body: parsed.response,
      status: 'sent', sentBy: 'ai',
    });
    // Increment consecutive counter
    await db.update(leads)
      .set({ whatsappAiConsecutiveCount: (lead.whatsappAiConsecutiveCount || 0) + 1 })
      .where(eq(leads.id, lead.id));
  } else {
    // pass_to_human: update handoff timestamp, send alert if not rate-limited
    await handleHandoff(lead, parsed.reason, recentMessages);
  }
}
```

### Alert Dispatch with Rate Limiting
```typescript
async function handleHandoff(
  lead: Lead,
  reason: string,
  conversationHistory: WhatsAppMessage[],
): Promise<void> {
  const db = getDb();
  const now = new Date();

  // Update handoff timestamp
  await db.update(leads)
    .set({ whatsappAiHandoffAt: now })
    .where(eq(leads.id, lead.id));

  // Anti-spam: max 1 alert per lead per hour
  const lastAlert = lead.whatsappAiLastAlertAt;
  if (lastAlert && (now.getTime() - new Date(lastAlert).getTime()) < 3600_000) {
    logger.info('Agent IA WhatsApp: alerte rate-limitee', { leadId: lead.id });
    return;
  }

  // Update last alert timestamp
  await db.update(leads)
    .set({ whatsappAiLastAlertAt: now })
    .where(eq(leads.id, lead.id));

  // Dispatch SMS + email alert (best-effort via Promise.allSettled)
  const alertMsg = `Agent IA WhatsApp: passage a l'humain pour ${lead.name}\nRaison: ${reason}`;
  await Promise.allSettled([
    // Free Mobile SMS
    axios.get('https://smsapi.free-mobile.fr/sendmsg', {
      params: { user: config.FREE_MOBILE_USER, pass: config.FREE_MOBILE_PASS, msg: alertMsg },
    }),
    // Email alert (would use sendEmail from gmail.ts)
  ]);
}
```

### Toggle API Endpoint
```typescript
// PATCH /api/leads/:leadId/whatsapp/ai-toggle
router.patch('/leads/:leadId/whatsapp/ai-toggle', ensureAuthenticated, async (req, res) => {
  const leadId = Number(req.params.leadId);
  const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);

  const db = getDb();
  const [updated] = await db.update(leads)
    .set({ whatsappAiEnabled: enabled })
    .where(eq(leads.id, leadId))
    .returning({ whatsappAiEnabled: leads.whatsappAiEnabled });

  res.json({ whatsappAiEnabled: updated.whatsappAiEnabled });
});
```

### System Prompt Construction
```typescript
function buildSystemPrompt(
  agentConfig: WhatsAppAgentConfig,
  lead: Lead,
  messages: WhatsAppMessage[],
): string {
  const formality = ['nouveau', 'contacte', 'rdv', 'devis_envoye'].includes(lead.status ?? '')
    ? 'Utilisez le vouvoiement.'
    : 'Utilisez le tutoiement (relation etablie).';

  const conversationHistory = messages
    .map(m => `[${m.direction === 'inbound' ? 'Prospect' : m.sentBy === 'ai' ? 'Agent IA' : 'William'}]: ${m.body}`)
    .join('\n');

  return [
    agentConfig.promptTemplate,
    '',
    '--- Base de connaissances ---',
    agentConfig.knowledgeBase || '(Aucune)',
    '',
    '--- Contexte du lead ---',
    `Nom: ${lead.name}`,
    `Statut: ${lead.status}`,
    `Date evenement: ${lead.eventDate || 'Non renseignee'}`,
    `Budget: ${lead.budget || 'Non renseigne'}`,
    formality,
    '',
    '--- Historique conversation WhatsApp (10 derniers messages) ---',
    conversationHistory || 'Aucun historique',
    '',
    '--- Instructions de reponse ---',
    'Tu DOIS repondre UNIQUEMENT en JSON avec ce format exact:',
    '{"action": "reply" | "pass_to_human", "response": "ton message", "reason": "explication courte"}',
    'Messages courts, style WhatsApp. Pas de longs paves.',
    'JAMAIS de tarifs, disponibilites de dates ou devis.',
  ].join('\n');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Email draft only | Extend to WhatsApp agent | Phase 6 | Reuse `assembleLeadContext` pattern |
| Single `aiPromptConfig` | Separate `whatsappAgentConfig` table | Phase 6 | Dedicated config per channel |
| All outbound = human | Track `sentBy` on messages | Phase 6 | UI shows AI badge |

## Open Questions

1. **OpenRouter JSON mode vs prompt instruction**
   - What we know: OpenRouter supports `response_format: { type: "json_object" }` for some models. Claude models on OpenRouter may support this.
   - What's unclear: Whether this is reliable on `anthropic/claude-sonnet-4` via OpenRouter specifically.
   - Recommendation: Use prompt instruction + zod parsing as primary strategy. Optionally add `response_format` as a reinforcement, but do not rely on it alone. The fallback (treat parse failure as pass_to_human) handles edge cases.

2. **Email alert during handoff -- Gmail client availability**
   - What we know: The webhook handler does not have access to the Gmail client (it's initialized separately for authenticated routes).
   - What's unclear: Whether the Gmail client is reliably available in the webhook context.
   - Recommendation: Use the `getGmailClientInstance()` pattern from the Gmail webhook. If null, skip email alert (SMS still works). This matches the existing "best-effort" notification pattern.

3. **WhatsApp Cloud API rate limits for auto-replies**
   - What we know: Meta allows sending within 24h window freely. The volume is low (wedding CRM, ~10-50 leads/month).
   - Recommendation: No special rate limiting needed for the API calls themselves. The anti-spam is only on admin alerts.

## Sources

### Primary (HIGH confidence)
- `src/services/openrouter.ts` -- existing OpenRouter integration pattern (assembleLeadContext, generateDraft)
- `src/routes/webhook.ts` -- webhook handler, insertion point for AI agent
- `src/services/whatsapp.ts` -- sendWhatsAppMessage, parseIncomingMessage
- `src/db/schema.ts` -- current schema, migration pattern
- `src/routes/api/ai.ts` -- prompt CRUD pattern to replicate
- `client/src/components/settings/AiPromptEditor.tsx` -- UI pattern to replicate for WhatsApp prompt
- `client/src/components/whatsapp/WhatsAppChat.tsx` -- ChatBubble component to modify for AI badge
- `client/src/hooks/useWhatsApp.ts` -- hook patterns to extend

### Secondary (MEDIUM confidence)
- OpenRouter API documentation for `response_format` JSON mode support

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all patterns established in codebase
- Architecture: HIGH -- clear insertion points, well-documented existing patterns
- Pitfalls: HIGH -- identified from reading actual codebase code paths

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (stable domain, no external dependency changes expected)
