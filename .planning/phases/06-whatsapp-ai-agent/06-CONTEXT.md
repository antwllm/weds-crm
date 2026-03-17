# Phase 6: WhatsApp AI Agent - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Un agent IA autonome repond aux messages WhatsApp des prospects. Il analyse chaque message entrant, decide s'il peut repondre ou s'il doit passer la main a l'humain. Le toggle d'activation est par lead. L'historique des decisions IA est traite en Phase 7 (observabilite).

</domain>

<decisions>
## Implementation Decisions

### Ton et personnalite
- Vouvoiement pour les statuts `nouveau`, `contacte`, `rdv`, `devis_envoye`
- Tutoiement pour le statut `signe` (relation etablie)
- Le prompt doit gerer le cas "deux maries" (pluriel, s'adresser aux deux)
- Format SMS/WhatsApp : messages courts, pas de longs paves
- L'agent peut repondre aux questions basiques sur les prestations (style photo, deroulement journee, equipe, materiel) — infos tirees de la base de connaissances
- L'agent ne donne JAMAIS de tarifs, disponibilites de dates specifiques, ou devis

### Prompt et contexte
- Prompt systeme WhatsApp **separe** du prompt email (chacun a son editeur dans Settings)
- Deux sources de contexte : prompt systeme de base + champ editable "Base de connaissances" dans Settings
- Le prompt est modifiable via l'interface Settings sans toucher au code
- Le prompt inclut le contexte du lead (nom, date evenement, statut) et l'historique des 10 derniers messages WhatsApp
- Reponse IA en JSON structure : `{ action: "reply" | "pass_to_human", response: string, reason: string }`

### Regles de handoff (pass_to_human)
- Triggers : tarifs/devis, disponibilites dates, reclamation/probleme, question hors perimetre, 5 echanges IA consecutifs sans resolution
- L'agent reste **silencieux** lors du handoff — pas de message de transition au prospect
- Alerte admin : SMS Free Mobile + email avec contexte complet (historique conversation, raison IA)
- Anti-spam alertes : max 1 alerte par lead par heure (meme si plusieurs handoffs)

### Re-activation automatique
- Des qu'un lead envoie un nouveau message, l'agent l'analyse immediatement (meme apres un pass_to_human)
- Si c'est encore un sujet sensible, il re-passe la main sans re-alerter (si < 1h depuis la derniere alerte)
- Pas de delai ni de condition sur la reponse humaine — l'agent est toujours pret a analyser

### Toggle UI et etats visuels
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

</decisions>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above and in the project requirements document.

### Project requirements
- `.planning/REQUIREMENTS.md` — WAIA-01 through WAIA-06 define the scope

### Existing WhatsApp implementation
- `src/routes/webhook.ts` — WhatsApp incoming message handler (integration point for AI interception)
- `src/services/whatsapp.ts` — sendWhatsAppMessage, parseIncomingMessage functions
- `src/services/openrouter.ts` — assembleLeadContext, generateDraft (pattern for AI calls)
- `src/routes/api/whatsapp.ts` — WhatsApp API routes (send, templates, window check)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `openrouter.ts` — `assembleLeadContext()` gathers lead data + recent emails/notes. Pattern to extend for WhatsApp context.
- `whatsapp.ts` — `sendWhatsAppMessage()` already sends free-text messages. Agent responses use this directly.
- `WhatsAppCompose.tsx` — Compose area with toggle pattern (24h window indicator) — similar UI pattern for agent toggle.
- `aiPromptConfig` table — stores prompt template + model. Pattern to replicate for WhatsApp agent prompt.

### Established Patterns
- DI pattern for HTTP clients (axios injectable for testing)
- `setImmediate` for async processing in webhooks
- Activity logging for all message events (whatsapp_sent, whatsapp_received)
- Notification dispatch via `Promise.allSettled` (SMS + email, best-effort)

### Integration Points
- `POST /webhook/whatsapp` handler — inject AI agent check after message parsing, before the "no lead found" branch
- `whatsappMessages` table — needs `sentBy` column ('human' | 'ai') to distinguish message origin
- `leads` table — needs `whatsappAiEnabled` boolean column
- Settings page — new tab or section for WhatsApp agent prompt + knowledge base

</code_context>

<specifics>
## Specific Ideas

- Le prompt propose dans les specs utilisateur est un bon point de depart mais doit etre adaptable via Settings
- Le compteur de 5 echanges IA consecutifs se reset quand William repond manuellement
- L'agent doit avoir acces au statut du lead pour adapter le vouvoiement/tutoiement

</specifics>

<deferred>
## Deferred Ideas

- Historique des decisions IA visible dans l'UI — Phase 7
- Langfuse traces — Phase 7
- Agent IA pour les emails — future milestone

</deferred>

---

*Phase: 06-whatsapp-ai-agent*
*Context gathered: 2026-03-17*
