# Roadmap: Weds CRM

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-15)
- 🚧 **v1.1 Templates & Agent IA WhatsApp** — Phases 5-7 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-4) -- SHIPPED 2026-03-15</summary>

- [x] Phase 1: Foundation and Automation Core (5/5 plans) -- completed 2026-03-10
- [x] Phase 2: Lead Management UI (5/5 plans) -- completed 2026-03-10
- [x] Phase 3: Pipedrive Sync (5/5 plans) -- completed 2026-03-14
- [x] Phase 4: Gmail Inbox, AI Drafting, and WhatsApp (8/8 plans) -- completed 2026-03-15

</details>

### v1.1 Templates & Agent IA WhatsApp (In Progress)

**Milestone Goal:** Transformer le CRM en outil de communication intelligent -- editeur de templates professionnel avec images/PJ et agent IA WhatsApp autonome avec observabilite Langfuse.

- [ ] **Phase 5: Advanced Template Editor** - Editeur HTML avance avec coloration syntaxique, images inline GCS, et gestion des pieces jointes
- [x] **Phase 6: WhatsApp AI Agent** - Agent IA autonome qui repond aux prospects WhatsApp avec handoff humain (completed 2026-03-17)
- [ ] **Phase 7: AI Observability & Decision UI** - Traces Langfuse pour tous les appels IA et historique des decisions visible dans l'UI

## Phase Details

### Phase 5: Advanced Template Editor
**Goal**: L'utilisateur dispose d'un editeur de templates professionnel avec code source, images inline, et pieces jointes pre-chargees dans le composeur
**Depends on**: Phase 4 (existing TipTap editor and template system)
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05
**Success Criteria** (what must be TRUE):
  1. L'utilisateur peut basculer en vue code source et voir le HTML avec coloration syntaxique dans l'editeur de templates
  2. Le code HTML brut est automatiquement formate/indente lors de l'affichage en mode source
  3. L'utilisateur peut inserer une image dans un template via upload, et l'image est stockee sur GCS et affichee inline
  4. L'utilisateur peut ajouter/supprimer des pieces jointes sur un modele via drag & drop
  5. Quand l'utilisateur selectionne un modele dans le composeur email, les pieces jointes du modele sont automatiquement pre-chargees
**Plans**: 4 plans

Plans:
- [ ] 05-01-PLAN.md — CodeMirror 6 HTML mode + pretty-print (TMPL-01, TMPL-02)
- [ ] 05-02-PLAN.md — Backend upload endpoint + GCS storage service (TMPL-03, TMPL-04)
- [ ] 05-03-PLAN.md — Inline images + template attachment management UI (TMPL-03, TMPL-04)
- [ ] 05-04-PLAN.md — Composer attachment pre-loading + GCS migration (TMPL-05)

### Phase 6: WhatsApp AI Agent
**Goal**: Un agent IA autonome repond aux messages WhatsApp des prospects, avec capacite de passer la main a l'humain quand le sujet depasse son perimetre
**Depends on**: Phase 5 (template system complete), Phase 4 (WhatsApp messaging)
**Requirements**: WAIA-01, WAIA-02, WAIA-03, WAIA-04, WAIA-05, WAIA-06
**Success Criteria** (what must be TRUE):
  1. L'utilisateur peut activer/desactiver l'agent IA sur chaque lead via un toggle dans l'UI WhatsApp
  2. Quand un prospect envoie un message WhatsApp et que l'agent est actif, une reponse IA est generee et envoyee automatiquement
  3. L'agent repond en francais avec le ton adapte au contexte du lead (nom, date evenement, lieu, budget)
  4. Quand l'IA detecte un sujet sensible (tarifs, disponibilite dates), elle passe la main a l'humain et William recoit une alerte
  5. Si un lead ayant ete passe a l'humain renvoie un nouveau message, l'agent reprend automatiquement l'analyse
**Plans**: 3 plans

Plans:
- [ ] 06-01-PLAN.md — Schema changes, types, and agent config API (WAIA-01, WAIA-02, WAIA-05)
- [ ] 06-02-PLAN.md — AI agent service + webhook integration (WAIA-02, WAIA-03, WAIA-04, WAIA-05, WAIA-06)
- [ ] 06-03-PLAN.md — Chat UI (toggle, badges, handoff) + Settings page (WAIA-01, WAIA-05)

### Phase 7: AI Observability & Decision UI
**Goal**: Chaque appel IA est trace dans Langfuse et l'historique des decisions de l'agent est visible dans l'interface WhatsApp du lead
**Depends on**: Phase 6 (AI agent operational)
**Requirements**: WAIA-07, OBSV-01, OBSV-02, OBSV-03
**Success Criteria** (what must be TRUE):
  1. L'historique des decisions IA (action reply/pass_to_human + raison) est affiche dans la vue WhatsApp de chaque lead
  2. Chaque appel IA (agent WhatsApp et email draft) apparait comme trace dans le dashboard Langfuse
  3. Les traces Langfuse incluent le prompt complet, le contexte lead, la reponse, l'action choisie et la latence
  4. William peut utiliser le dashboard Langfuse pour evaluer la qualite des reponses et calibrer l'agent
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Langfuse tracing setup + ai_decisions schema + wire into AI services (OBSV-01, OBSV-02)
- [ ] 07-02-PLAN.md — AI decisions API + Decisions IA tab UI with scoring (WAIA-07, OBSV-03)

## Progress

**Execution Order:** Phase 5 -> Phase 6 -> Phase 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation and Automation Core | v1.0 | 5/5 | Complete | 2026-03-10 |
| 2. Lead Management UI | v1.0 | 5/5 | Complete | 2026-03-10 |
| 3. Pipedrive Sync | v1.0 | 5/5 | Complete | 2026-03-14 |
| 4. Gmail Inbox, AI Drafting & WhatsApp | v1.0 | 8/8 | Complete | 2026-03-15 |
| 5. Advanced Template Editor | v1.1 | 4/4 | Complete | - |
| 6. WhatsApp AI Agent | v1.1 | 3/3 | Complete | 2026-03-17 |
| 7. AI Observability & Decision UI | v1.1 | 0/2 | Not started | - |
