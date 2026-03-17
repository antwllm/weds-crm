# Phase 7: AI Observability & Decision UI - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Tracer chaque appel IA (WhatsApp agent + email draft) dans Langfuse et afficher l'historique des décisions de l'agent WhatsApp dans un onglet dédié de la vue lead. Le scoring/feedback des réponses IA se fait depuis l'app Weds avec envoi vers Langfuse.

</domain>

<decisions>
## Implementation Decisions

### Historique des décisions IA
- Nouvel onglet "Décisions IA" dans la vue lead (à côté des onglets WhatsApp, Email, etc.)
- Scope onglet : WhatsApp uniquement (pas les email drafts — format trop différent)
- Liste chronologique (plus récent en haut), filtrable par action (reply/pass_to_human)
- Chaque entrée affiche : action (badge coloré vert=reply, orange=handoff), raison de la décision, message du prospect + réponse IA générée, latence + modèle utilisé

### Langfuse integration
- Langfuse Cloud (SaaS gratuit, 50k observations/mois) — clés API dans .env
- Tracer les 3 sources IA : agent WhatsApp (whatsapp-agent.ts), email draft (openrouter.ts), et prévoir un wrapper générique pour futures fonctions IA
- Granularité : une trace par appel IA (pas par conversation)
- Métadonnées par trace : leadId + leadName, prompt complet avec variables substituées, réponse brute + JSON parsé (action, response, reason), latence + modèle + tokens (input/output)

### Évaluation et scoring
- Feedback depuis l'app Weds : thumbs up/down + commentaire texte optionnel sur chaque décision dans l'onglet
- Score envoyé à Langfuse via API (score 1 ou 0 + comment)
- Tracking des versions de prompt via un tag `prompt_version` (hash ou timestamp) dans chaque trace — permet la comparaison avant/après dans Langfuse

### Stockage des décisions
- Nouvelle table `ai_decisions` : id, leadId, messageId, action, reason, responseText, model, latencyMs, promptVersion, score, scoreComment, langfuseTraceId, createdAt
- Pas de politique de rétention pour l'instant (volume faible — CRM mono-utilisateur)
- Pas d'anonymisation dans Langfuse (données déjà chez OpenRouter, Langfuse est RGPD-compliant)

### Claude's Discretion
- Choix du SDK Langfuse (langfuse-node ou wrapper HTTP direct)
- Format exact du hash prompt_version
- Design exact de l'onglet (spacing, composants shadcn à utiliser)
- Gestion des erreurs Langfuse (best-effort, ne doit pas bloquer le flow principal)
- Wrapper générique pour futures fonctions IA — interface et pattern

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Agent IA existant
- `src/services/whatsapp-agent.ts` — processWhatsAppAiResponse, callOpenRouter, parseAiResponse, handleHandoff — points d'insertion pour Langfuse traces
- `src/services/openrouter.ts` — generateDraft — second point d'insertion pour traces email draft

### Schema et types
- `src/db/schema.ts` — whatsappMessages (sentBy), leads (AI columns), whatsappAgentConfig — patterns pour la nouvelle table ai_decisions
- `src/types.ts` — types inférés Drizzle — pattern à suivre pour AiDecision type
- `client/src/types/index.ts` — types client — ajouter AiDecision interface

### UI existante
- `client/src/components/whatsapp/WhatsAppChat.tsx` — ChatBubble, AiAgentBanner — pattern onglets lead
- `client/src/components/leads/LeadDetail.tsx` — système d'onglets existant (WhatsApp, Email) — point d'insertion pour l'onglet Décisions IA
- `client/src/components/settings/WhatsAppAgentSettings.tsx` — pattern Settings avec Textarea/Input

### Phase 6 context
- `.planning/phases/06-whatsapp-ai-agent/06-CONTEXT.md` — décisions sur le format JSON (action/reason), badge IA violet, handoff orange

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `whatsapp-agent.ts` : processWhatsAppAiResponse retourne déjà `{ action, response, reason }` — il suffit de persister et tracer
- `openrouter.ts` : generateDraft fait un appel similaire — même pattern de wrapping Langfuse
- Badge component (shadcn) : déjà utilisé pour le badge IA violet et handoff orange — réutilisable pour action badges
- Tabs system dans LeadDetail.tsx : pattern d'onglets existant pour ajouter "Décisions IA"
- `useQuery`/`useMutation` hooks pattern dans useSettings.ts et useWhatsApp.ts

### Established Patterns
- Appels API via `apiFetch` helper côté client
- Toast notifications pour feedback utilisateur (sonner)
- DI pattern pour HTTP clients (axios injectable)
- `setImmediate` pour processing async non-bloquant dans webhooks

### Integration Points
- `whatsapp-agent.ts` : après parseAiResponse — insérer le record ai_decisions + trace Langfuse
- `openrouter.ts` : après generateDraft — insérer trace Langfuse (pas de record ai_decisions car pas d'onglet email)
- `LeadDetail.tsx` : ajouter un onglet "Décisions IA" au système de tabs
- `src/routes/api/` : nouveaux endpoints pour GET ai-decisions par lead, POST score

</code_context>

<specifics>
## Specific Ideas

- Le wrapper Langfuse doit être best-effort : si Langfuse est down, l'agent WhatsApp continue normalement
- Le `langfuseTraceId` dans `ai_decisions` permet de linker l'entrée locale avec la trace Langfuse (deep link vers le dashboard)
- Le compteur de messages IA consécutifs (whatsappAiConsecutiveCount) est déjà reset par un humain send — le score/feedback n'affecte pas ce compteur

</specifics>

<deferred>
## Deferred Ideas

- Agent IA pour les emails (email draft → agent autonome) — future milestone
- Dashboard analytics IA intégré dans l'app (au lieu de Langfuse) — pas nécessaire tant que le volume est faible
- Auto-évaluation IA (un second modèle qui note les réponses) — trop complexe pour le volume actuel

</deferred>

---

*Phase: 07-ai-observability-decision-ui*
*Context gathered: 2026-03-17*
