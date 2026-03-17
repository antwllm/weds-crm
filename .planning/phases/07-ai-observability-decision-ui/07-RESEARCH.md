# Phase 7: AI Observability & Decision UI - Research

**Researched:** 2026-03-17
**Domain:** LLM observability (Langfuse), decision persistence, feedback UI
**Confidence:** HIGH

## Summary

This phase adds two capabilities: (1) tracing every AI call (WhatsApp agent + email draft) in Langfuse Cloud, and (2) displaying AI decision history in a new "Decisions IA" tab in the lead detail view with thumbs up/down scoring that syncs to Langfuse.

The project uses direct axios calls to OpenRouter (not the OpenAI SDK), so we need the low-level Langfuse tracing SDK (`@langfuse/tracing` + `@langfuse/otel` + `@opentelemetry/sdk-node`) for trace creation, plus `@langfuse/client` for score submission. The tracing wraps around the existing `callOpenRouter` and `generateDraft` functions. A new `ai_decisions` table stores decisions locally for the UI tab.

**Primary recommendation:** Use Langfuse JS/TS SDK v5 with OpenTelemetry setup. Wrap AI calls with `startActiveObservation` + `startObservation(asType: "generation")`. Store `langfuseTraceId` in `ai_decisions` for deep linking. Use `@langfuse/client` for score submission from the feedback endpoint.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Nouvel onglet "Decisions IA" dans la vue lead (a cote des onglets WhatsApp, Email, etc.)
- Scope onglet : WhatsApp uniquement (pas les email drafts -- format trop different)
- Liste chronologique (plus recent en haut), filtrable par action (reply/pass_to_human)
- Chaque entree affiche : action (badge colore vert=reply, orange=handoff), raison de la decision, message du prospect + reponse IA generee, latence + modele utilise
- Langfuse Cloud (SaaS gratuit, 50k observations/mois) -- cles API dans .env
- Tracer les 3 sources IA : agent WhatsApp (whatsapp-agent.ts), email draft (openrouter.ts), et prevoir un wrapper generique
- Granularite : une trace par appel IA (pas par conversation)
- Metadonnees par trace : leadId + leadName, prompt complet avec variables substituees, reponse brute + JSON parse (action, response, reason), latence + modele + tokens (input/output)
- Feedback depuis l'app Weds : thumbs up/down + commentaire texte optionnel
- Score envoye a Langfuse via API (score 1 ou 0 + comment)
- Tracking des versions de prompt via un tag prompt_version (hash ou timestamp)
- Nouvelle table ai_decisions : id, leadId, messageId, action, reason, responseText, model, latencyMs, promptVersion, score, scoreComment, langfuseTraceId, createdAt
- Pas de politique de retention, pas d'anonymisation

### Claude's Discretion
- Choix du SDK Langfuse (langfuse-node ou wrapper HTTP direct)
- Format exact du hash prompt_version
- Design exact de l'onglet (spacing, composants shadcn)
- Gestion des erreurs Langfuse (best-effort, ne doit pas bloquer le flow principal)
- Wrapper generique pour futures fonctions IA -- interface et pattern

### Deferred Ideas (OUT OF SCOPE)
- Agent IA pour les emails (email draft -> agent autonome)
- Dashboard analytics IA integre dans l'app (au lieu de Langfuse)
- Auto-evaluation IA (un second modele qui note les reponses)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WAIA-07 | L'historique des decisions IA (action + reason) est visible dans l'UI WhatsApp du lead | New `ai_decisions` table + API endpoint + AiDecisionsTab component in LeadDetail |
| OBSV-01 | Chaque appel IA (WhatsApp agent + email draft) est trace dans Langfuse | Langfuse SDK v5 wrapping `callOpenRouter` in whatsapp-agent.ts and `generateDraft` in openrouter.ts |
| OBSV-02 | Les traces Langfuse incluent : prompt, contexte lead, reponse, action, latence | `startObservation` with `asType: "generation"`, input/output/metadata/usageDetails fields |
| OBSV-03 | Le dashboard Langfuse permet de calibrer et evaluer la qualite de l'agent | Score submission via `@langfuse/client` score.create + prompt_version tagging |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@langfuse/tracing` | 5.0.1 | Core tracing functions (startActiveObservation, startObservation) | Official Langfuse SDK for manual instrumentation |
| `@langfuse/otel` | 5.0.1 | LangfuseSpanProcessor for OpenTelemetry export | Required bridge between OTel spans and Langfuse |
| `@opentelemetry/sdk-node` | latest | OpenTelemetry Node SDK runtime | Required dependency for Langfuse v5 tracing |
| `@langfuse/client` | 5.0.1 | Langfuse API client for scores, prompts | Score submission from feedback endpoint |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | (already in client) | `formatDistanceToNow` with French locale | Timestamp display in decision cards |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Langfuse SDK v5 | OpenRouter Broadcast to Langfuse | Broadcast is zero-code but excludes prompt/completion content by default, and we can't store traceId locally |
| Langfuse SDK v5 | Direct Langfuse REST API | More control but no OTel integration, must handle batching/retry manually |
| `@langfuse/tracing` | Old `langfuse` package (v3) | Simpler API but deprecated, no future support |

**Recommendation:** Use `@langfuse/tracing` v5. The OpenTelemetry requirement adds ~3 lines of setup code but is the only supported path forward.

**Installation:**
```bash
# Server-side
npm install @langfuse/tracing @langfuse/otel @opentelemetry/sdk-node @langfuse/client

# No new client-side packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── instrumentation.ts       # OTel + Langfuse init (imported first in index.ts)
├── services/
│   ├── langfuse.ts          # Wrapper: traceAiCall(), submitScore(), generic interface
│   ├── whatsapp-agent.ts    # Modified: persist ai_decision + call traceAiCall
│   └── openrouter.ts        # Modified: call traceAiCall after generateDraft
├── routes/api/
│   └── ai-decisions.ts      # New: GET /api/leads/:id/ai-decisions, POST /api/ai-decisions/:id/score
├── db/
│   └── schema.ts            # Modified: add aiDecisions table
└── types.ts                 # Modified: add AiDecision type

client/src/
├── components/leads/
│   ├── LeadDetail.tsx        # Modified: add 4th tab (grid-cols-4)
│   └── AiDecisionsTab.tsx    # New: tab content with filter + card list
├── components/ai/
│   ├── AiDecisionCard.tsx    # New: single decision card
│   └── AiScoreFeedback.tsx   # New: thumbs up/down + comment
├── hooks/
│   └── useAiDecisions.ts    # New: useQuery + useMutation hooks
└── types/index.ts            # Modified: add AiDecision interface
```

### Pattern 1: Langfuse Initialization (instrumentation.ts)
**What:** Initialize OpenTelemetry with LangfuseSpanProcessor before any tracing code runs.
**When to use:** Once at app startup, must be imported before other modules.
**Example:**
```typescript
// src/instrumentation.ts
// Source: https://langfuse.com/docs/observability/sdk/typescript/setup
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";

const sdk = new NodeSDK({
  spanProcessors: [new LangfuseSpanProcessor()],
});

sdk.start();

// Graceful shutdown
process.on("SIGTERM", () => sdk.shutdown());
```

### Pattern 2: Generic AI Tracing Wrapper (langfuse.ts)
**What:** Best-effort wrapper that traces any AI call without blocking the main flow.
**When to use:** Around every OpenRouter call (WhatsApp agent + email draft).
**Example:**
```typescript
// src/services/langfuse.ts
import { startActiveObservation, startObservation, propagateAttributes } from "@langfuse/tracing";
import { LangfuseClient } from "@langfuse/client";
import { createHash } from "crypto";

const langfuseClient = new LangfuseClient();

interface AiTraceInput {
  name: string;           // "whatsapp-agent" | "email-draft"
  leadId: number;
  leadName: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  promptVersion: string;
}

interface AiTraceResult {
  langfuseTraceId: string | null;
  latencyMs: number;
  response: string;
}

export function computePromptVersion(promptTemplate: string): string {
  return createHash("sha256").update(promptTemplate).digest("hex").slice(0, 8);
}

export async function traceAiCall(
  input: AiTraceInput,
  callFn: () => Promise<string>,
): Promise<AiTraceResult> {
  const start = Date.now();
  let langfuseTraceId: string | null = null;

  try {
    const response = await startActiveObservation(input.name, async (span) => {
      // propagateAttributes sets metadata on all child spans
      return await propagateAttributes(
        {
          userId: String(input.leadId),
          metadata: { leadId: input.leadId, leadName: input.leadName, promptVersion: input.promptVersion },
          tags: [input.name, `prompt:${input.promptVersion}`],
        },
        async () => {
          const generation = startObservation(
            "llm-call",
            {
              model: input.model,
              input: [
                { role: "system", content: input.systemPrompt },
                { role: "user", content: input.userMessage },
              ],
            },
            { asType: "generation" },
          );

          const result = await callFn();

          generation.update({
            output: { content: result },
          }).end();

          span.update({ output: result });
          // getActiveTraceId() to capture trace ID
          return result;
        },
      );
    });

    const latencyMs = Date.now() - start;
    return { langfuseTraceId, latencyMs, response };
  } catch (error) {
    // Best-effort: if Langfuse fails, still return the response
    const latencyMs = Date.now() - start;
    const response = await callFn();
    return { langfuseTraceId: null, latencyMs, response };
  }
}

export async function submitScore(
  traceId: string,
  score: number, // 0 or 1
  comment?: string,
): Promise<void> {
  try {
    await langfuseClient.score.create({
      traceId,
      name: "user-feedback",
      value: score,
      dataType: "NUMERIC",
      comment: comment || undefined,
    });
    await langfuseClient.flush();
  } catch (error) {
    // Best-effort: log but don't throw
    console.error("Langfuse score submission failed:", error);
  }
}
```

### Pattern 3: Best-Effort Error Handling
**What:** Langfuse operations never block the main WhatsApp agent flow.
**When to use:** All Langfuse interactions (tracing + scoring).
**Example:**
```typescript
// In whatsapp-agent.ts: wrap the trace in try/catch
try {
  const traceResult = await traceAiCall(traceInput, () => callOpenRouter(systemPrompt, incomingText, model));
  responseContent = traceResult.response;
  langfuseTraceId = traceResult.langfuseTraceId;
  latencyMs = traceResult.latencyMs;
} catch (error) {
  // Fallback: call OpenRouter directly without tracing
  logger.warn("Langfuse tracing echoue, appel direct OpenRouter", { error });
  responseContent = await callOpenRouter(systemPrompt, incomingText, model);
}
```

### Pattern 4: ai_decisions Table Schema
**What:** New Drizzle table for persisting AI decisions locally.
**When to use:** After each WhatsApp agent decision.
**Example:**
```typescript
// In src/db/schema.ts
export const aiDecisions = pgTable("ai_decisions", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  messageId: integer("message_id"), // whatsapp_messages.id of the inbound message
  action: varchar("action", { length: 20 }).notNull(), // "reply" | "pass_to_human"
  reason: text("reason"),
  responseText: text("response_text"),
  prospectMessage: text("prospect_message"), // The inbound message text
  model: varchar("model", { length: 100 }),
  latencyMs: integer("latency_ms"),
  promptVersion: varchar("prompt_version", { length: 20 }),
  score: integer("score"), // 0 or 1, null if unscored
  scoreComment: text("score_comment"),
  langfuseTraceId: varchar("langfuse_trace_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Anti-Patterns to Avoid
- **Blocking on Langfuse:** Never `await langfuse.flush()` in the webhook hot path -- use fire-and-forget or setImmediate
- **Tracing per conversation:** Decision says "une trace par appel IA" -- do not batch multiple messages into one trace
- **Storing raw prompt in ai_decisions:** The prompt is in Langfuse traces, the DB only needs action/reason/response for the UI
- **Coupling score submission to trace creation:** Scores are submitted asynchronously from the feedback endpoint, not at trace creation time

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM call tracing | Custom logging to DB | `@langfuse/tracing` with `startObservation(asType: "generation")` | Handles batching, retry, token counting, dashboard UI |
| Score/evaluation tracking | Custom score table + dashboard | Langfuse scores API via `@langfuse/client` | Built-in evaluation dashboard, comparison views |
| Trace ID generation | UUID generation | `createTraceId` from `@langfuse/tracing` or OTel auto-generated IDs | Ensures correct format for Langfuse deep links |
| Prompt versioning | Manual version counter | SHA-256 hash of prompt template (first 8 chars) | Deterministic, no state management needed |

**Key insight:** Langfuse provides the analytics dashboard (OBSV-03) -- we only need to send data to it correctly, not build our own visualizations.

## Common Pitfalls

### Pitfall 1: OTel Initialization Order
**What goes wrong:** Traces don't appear in Langfuse because instrumentation.ts was imported after the first AI call.
**Why it happens:** OpenTelemetry must be initialized before any traced code runs.
**How to avoid:** Import `./instrumentation` as the very first line in `src/index.ts`.
**Warning signs:** Traces appear in server logs but not in Langfuse dashboard.

### Pitfall 2: Missing flush() in Short-Lived Contexts
**What goes wrong:** Traces are lost when the process exits before the SDK flushes its buffer.
**Why it happens:** Langfuse SDK batches traces and sends them asynchronously.
**How to avoid:** Call `sdk.shutdown()` on SIGTERM. For this Express app (long-lived), this is less critical but still good practice.
**Warning signs:** Some traces missing, especially during deployments.

### Pitfall 3: Langfuse Errors Breaking WhatsApp Agent
**What goes wrong:** A Langfuse API error causes the WhatsApp agent to fail silently, not sending a response.
**Why it happens:** Awaiting Langfuse operations in the critical path without try/catch.
**How to avoid:** Always wrap Langfuse operations in try/catch. The AI response MUST be sent regardless of tracing success.
**Warning signs:** Agent stops responding when Langfuse Cloud is down.

### Pitfall 4: Tab Grid Mismatch
**What goes wrong:** Adding a 4th tab without updating `grid-cols-3` to `grid-cols-4` causes layout issues.
**Why it happens:** LeadDetail.tsx uses `grid w-full grid-cols-3` for TabsList.
**How to avoid:** Change to `grid-cols-4` when adding the "Decisions IA" tab trigger.
**Warning signs:** Tabs overflow or compress oddly.

### Pitfall 5: Environment Variables Missing in Dev
**What goes wrong:** Langfuse SDK throws on initialization because env vars are not set.
**Why it happens:** LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY not in .env.
**How to avoid:** Make Langfuse initialization conditional -- skip if env vars are missing, log a warning.
**Warning signs:** App crashes on startup in dev environment.

## Code Examples

### Inserting an AI Decision Record
```typescript
// After parsing AI response in whatsapp-agent.ts
await db.insert(aiDecisions).values({
  leadId: lead.id,
  messageId: inboundMessageId, // from the stored inbound whatsapp_messages row
  action: parsed.action,
  reason: parsed.reason,
  responseText: parsed.response,
  prospectMessage: incomingText,
  model,
  latencyMs,
  promptVersion: computePromptVersion(agentConfig.promptTemplate),
  langfuseTraceId,
});
```

### API Endpoint for Decisions
```typescript
// GET /api/leads/:id/ai-decisions?action=reply
router.get("/leads/:id/ai-decisions", async (req, res) => {
  const { id } = req.params;
  const { action } = req.query;

  let query = db
    .select()
    .from(aiDecisions)
    .where(eq(aiDecisions.leadId, Number(id)))
    .orderBy(desc(aiDecisions.createdAt));

  if (action && (action === "reply" || action === "pass_to_human")) {
    query = query.where(eq(aiDecisions.action, action));
  }

  const decisions = await query;
  res.json(decisions);
});
```

### Score Submission Endpoint
```typescript
// POST /api/ai-decisions/:id/score
router.post("/ai-decisions/:id/score", async (req, res) => {
  const { id } = req.params;
  const { score, comment } = req.body; // score: 0 | 1

  // Update local DB
  await db
    .update(aiDecisions)
    .set({ score, scoreComment: comment || null })
    .where(eq(aiDecisions.id, Number(id)));

  // Forward to Langfuse (best-effort)
  const [decision] = await db
    .select({ langfuseTraceId: aiDecisions.langfuseTraceId })
    .from(aiDecisions)
    .where(eq(aiDecisions.id, Number(id)));

  if (decision?.langfuseTraceId) {
    submitScore(decision.langfuseTraceId, score, comment).catch((err) =>
      logger.warn("Langfuse score echoue", { error: err })
    );
  }

  res.json({ ok: true });
});
```

### Langfuse Deep Link URL
```typescript
// Build deep link to Langfuse trace dashboard
function getLangfuseTraceUrl(traceId: string): string {
  const baseUrl = process.env.LANGFUSE_BASE_URL || "https://cloud.langfuse.com";
  const projectId = process.env.LANGFUSE_PROJECT_ID || "";
  return `${baseUrl}/project/${projectId}/traces/${traceId}`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `langfuse` npm package (v3) | `@langfuse/tracing` + `@langfuse/otel` (v5) | Aug 2025 (v4), then v5 | Must use OTel-based approach |
| `Langfuse` class with `trace()` | `startActiveObservation()` + `startObservation()` | v4 rewrite | Different API surface |
| Manual token counting | `usageDetails` field in generation spans | v4+ | SDK handles token tracking |

**Deprecated/outdated:**
- `langfuse` npm package: Deprecated, replaced by `@langfuse/tracing` v5
- `langfuse-node` npm package: Deprecated
- `langfuse.trace()` / `langfuse.generation()`: Replaced by `startActiveObservation` / `startObservation`

## Open Questions

1. **Getting traceId from OTel spans**
   - What we know: `getActiveTraceId()` exists in `@langfuse/tracing` and `createTraceId()` can set custom IDs
   - What's unclear: Exact method to reliably capture the Langfuse trace ID after span creation for DB storage
   - Recommendation: Test with `getActiveTraceId()` inside the `startActiveObservation` callback; fall back to `createTraceId()` with a pre-generated UUID if needed

2. **Langfuse Project ID for deep links**
   - What we know: Deep link format is `{baseUrl}/project/{projectId}/traces/{traceId}`
   - What's unclear: Whether projectId is available from SDK or must be configured separately
   - Recommendation: Add `LANGFUSE_PROJECT_ID` to .env; can be found in Langfuse Cloud dashboard settings

3. **OpenRouter usage/token data in response**
   - What we know: OpenRouter returns `usage` object in chat completion responses with `prompt_tokens` and `completion_tokens`
   - What's unclear: Whether the current axios call captures this data (response.data.usage)
   - Recommendation: Extract `response.data.usage` from OpenRouter response and pass to `usageDetails` in the generation span

## Sources

### Primary (HIGH confidence)
- [Langfuse SDK Overview](https://langfuse.com/docs/observability/sdk/overview) - Package structure, v5 current
- [Langfuse TypeScript Instrumentation](https://langfuse.com/docs/observability/sdk/typescript/instrumentation) - startActiveObservation, startObservation, propagateAttributes
- [Langfuse Get Started](https://langfuse.com/docs/observability/get-started) - OTel initialization, NodeSDK setup
- [Langfuse JS/TS SDK Cookbook](https://langfuse.com/guides/cookbook/js_langfuse_sdk) - Code examples with generations and metadata
- [Langfuse Scores via SDK](https://langfuse.com/docs/evaluation/evaluation-methods/scores-via-sdk) - LangfuseClient score.create API
- [Langfuse OpenRouter Integration](https://langfuse.com/integrations/gateways/openrouter) - OpenRouter-specific tracing

### Secondary (MEDIUM confidence)
- [OpenRouter Broadcast to Langfuse](https://openrouter.ai/docs/guides/features/broadcast/langfuse) - Alternative zero-code approach (rejected: excludes prompt content)
- [Langfuse v4 to v5 Migration](https://langfuse.com/docs/observability/sdk/upgrade-path/js-v4-to-v5) - Breaking changes in v5

### Tertiary (LOW confidence)
- npm version checks (5.0.1 for all @langfuse packages) - verified via `npm view`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Langfuse docs + npm version verified
- Architecture: HIGH - Based on existing codebase patterns (schema.ts, types.ts, LeadDetail.tsx)
- Pitfalls: HIGH - Common OTel initialization issues well-documented
- Langfuse v5 API surface: MEDIUM - v5 is recent; code examples may have minor differences from actual API

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (Langfuse SDK is actively evolving but core API is stable)
