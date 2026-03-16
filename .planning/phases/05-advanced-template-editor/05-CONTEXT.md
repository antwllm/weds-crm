# Phase 5: Advanced Template Editor - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

L'utilisateur dispose d'un editeur de templates professionnel avec mode code source (CodeMirror), images inline via upload GCS, et gestion des pieces jointes pre-chargees dans le composeur email. S'applique a la fois a l'editeur de templates (Settings) et au composeur email (ComposeReply).

</domain>

<decisions>
## Implementation Decisions

### Mode code source
- CodeMirror editable remplace le textarea HTML basique actuel (dans templates ET composeur)
- Coloration syntaxique HTML + numeros de lignes + indentation auto (pas d'auto-completion de balises)
- Pretty-print automatique au switch WYSIWYG → Code + bouton "Formater" a la demande
- Disponible dans l'editeur de templates (Settings) ET dans le composeur email (ComposeReply)

### Images inline
- 3 methodes d'insertion : bouton toolbar + drag & drop + coller depuis presse-papier (Ctrl+V)
- Upload vers un bucket GCS dedie (gs://weds-crm-assets/) — separe du bucket vCards
- URLs publiques permanentes (pas de signed URLs, pas d'expiration)
- Pas de redimensionnement a l'upload — l'image est gardee telle quelle

### Pieces jointes des modeles
- Les PJ sont uploadees et stockees sur GCS (bucket dedie weds-crm-assets), pas en local
- Limite : 25 Mo par fichier
- UI : zone drag & drop sous l'editeur avec liste des fichiers (nom, taille, bouton supprimer)
- Migration : la brochure existante (assets/Brochure_Weds.pdf) devra etre migree vers GCS

### Workflow composeur
- Quand un modele est selectionne, les PJ du modele sont pre-chargees ET modifiables (ajout/suppression)
- Changement de modele : alerte avec confirmation avant remplacement des PJ existantes
- Les images inline du template sont rendues completement dans le composeur (WYSIWYG fidele)
- Les PJ sont effectivement jointes au MIME multipart envoye via Gmail API (pas de liens)

### Claude's Discretion
- Choix de la version CodeMirror et des extensions
- Nommage des fichiers uploades sur GCS (UUID, timestamp, etc.)
- Gestion des erreurs d'upload (retry, message d'erreur)
- Format du endpoint backend d'upload (multipart/form-data)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TipTapEditor` (client/src/components/inbox/TipTapEditor.tsx): Editeur WYSIWYG avec toggle HTML basique — le toggle sera remplace par CodeMirror
- `storage.ts` (src/services/storage.ts): Upload GCS existant pour vCards — pattern a reutiliser pour images/PJ
- `ComposeReply` (client/src/components/inbox/ComposeReply.tsx): Composeur email avec drag & drop PJ basique deja en place
- `TemplateEditor` (client/src/components/settings/TemplateEditor.tsx): Editeur de templates qui utilise deja TipTapEditor

### Established Patterns
- DI pattern pour les services (httpClient injectable)
- Schema `emailTemplates` a deja les champs `attachments` (JSONB), `contentType`, `isDefault`
- GCS bucket weds-crm-vcards pour les vCards — nouveau bucket weds-crm-assets pour les assets media

### Integration Points
- `POST /api/inbox/threads/:threadId/reply` charge deja les PJ du template via `templateId` (inbox.ts)
- `sendEmail` et `sendReply` dans gmail.ts supportent deja les attachments (Buffer)
- Le composeur passe deja `html: true` et `templateId` dans le body de la requete

</code_context>

<specifics>
## Specific Ideas

- Le bucket GCS dedie s'appelle `weds-crm-assets` (a creer)
- La brochure Weds existante sur weds-crm-vcards doit etre migree vers le nouveau bucket
- CodeMirror doit etre installe comme dep client (pas de CDN)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-advanced-template-editor*
*Context gathered: 2026-03-16*
