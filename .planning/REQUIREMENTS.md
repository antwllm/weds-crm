# Requirements: Weds CRM

**Defined:** 2026-03-16
**Core Value:** Every Mariages.net lead is captured, organized, and actionable from a single interface — no switching between Gmail, Pipedrive, and phone

## v1.1 Requirements

Requirements for milestone v1.1: Templates & Agent IA WhatsApp.

### Editeur de Templates

- [x] **TMPL-01**: L'editeur HTML affiche le code source avec coloration syntaxique
- [x] **TMPL-02**: Le code HTML brut est automatiquement formate/indente (pretty print)
- [x] **TMPL-03**: L'utilisateur peut inserer des images inline via upload GCS dans l'editeur TipTap
- [x] **TMPL-04**: L'utilisateur peut gerer les pieces jointes d'un modele (upload drag & drop, suppression)
- [x] **TMPL-05**: Lors de la selection d'un modele dans le composeur, les pieces jointes du modele sont pre-chargees

### Agent IA WhatsApp

- [x] **WAIA-01**: L'utilisateur peut activer/desactiver l'agent IA WhatsApp par lead via un toggle
- [x] **WAIA-02**: Quand l'agent est actif et qu'un message arrive, le systeme genere une reponse IA basee sur le contexte du lead
- [ ] **WAIA-03**: L'IA repond en JSON structure (action: reply/pass_to_human, response, reason)
- [ ] **WAIA-04**: Si action=reply, la reponse est envoyee automatiquement via WhatsApp
- [x] **WAIA-05**: Si action=pass_to_human, l'agent est desactive pour cette conversation et une alerte admin est envoyee
- [ ] **WAIA-06**: Si le lead renvoie un nouveau message, l'agent peut a nouveau analyser et repondre (re-activation automatique)
- [ ] **WAIA-07**: L'historique des decisions IA (action + reason) est visible dans l'UI WhatsApp du lead

### Observabilite IA

- [ ] **OBSV-01**: Chaque appel IA (WhatsApp agent + email draft) est trace dans Langfuse
- [ ] **OBSV-02**: Les traces Langfuse incluent : prompt, contexte lead, reponse, action, latence
- [ ] **OBSV-03**: Le dashboard Langfuse permet de calibrer et evaluer la qualite de l'agent

## Future Requirements

### UX & Navigation (quick tasks)

- **UX-01**: Memorisation de l'onglet actif via query params sur la fiche lead
- **UX-02**: Stabilite du scroll sur le pipeline (memorisation position au clic)

### Inbox (quick tasks)

- **INBOX-01**: Liaison manuelle email → lead depuis l'inbox (modale de recherche)
- **INBOX-02**: Composeur sticky en bas de la vue thread inbox

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auto-send IA sans review sur premiere activation | Risque qualite — l'agent doit prouver sa fiabilite d'abord |
| Agent IA email (auto-reponse email) | Complexite trop elevee pour v1.1, focus WhatsApp d'abord |
| Langfuse self-hosted | Utiliser Langfuse Cloud (gratuit jusqu'a 50k traces/mois) |
| Multi-langue agent IA | Francais uniquement pour v1.1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TMPL-01 | Phase 5 | Complete |
| TMPL-02 | Phase 5 | Complete |
| TMPL-03 | Phase 5 | Complete |
| TMPL-04 | Phase 5 | Complete |
| TMPL-05 | Phase 5 | Complete |
| WAIA-01 | Phase 6 | Complete |
| WAIA-02 | Phase 6 | Complete |
| WAIA-03 | Phase 6 | Pending |
| WAIA-04 | Phase 6 | Pending |
| WAIA-05 | Phase 6 | Complete |
| WAIA-06 | Phase 6 | Pending |
| WAIA-07 | Phase 7 | Pending |
| OBSV-01 | Phase 7 | Pending |
| OBSV-02 | Phase 7 | Pending |
| OBSV-03 | Phase 7 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after initial definition*
