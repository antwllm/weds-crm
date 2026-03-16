# Phase 5: Advanced Template Editor - Research

**Researched:** 2026-03-16
**Domain:** CodeMirror HTML editor, GCS file upload, MIME attachments
**Confidence:** HIGH

## Summary

This phase replaces the basic textarea HTML toggle in TipTapEditor with a proper CodeMirror 6 code editor, adds inline image upload to GCS with public URLs, and implements template attachment management (upload, storage, pre-loading in composer). The existing codebase already has strong foundations: TipTap editor with imperative ref, GCS upload pattern in storage.ts, attachment JSONB field on emailTemplates schema, and MIME multipart support in gmail.ts.

The main integration work involves: (1) adding CodeMirror 6 as a React component replacing the textarea in HTML mode, (2) creating a backend upload endpoint with multer for multipart/form-data, (3) creating the weds-crm-assets GCS bucket with public access, (4) building the attachment drag-and-drop UI on the template editor, and (5) pre-loading template attachments from GCS in the composer with download-then-attach-to-MIME flow.

**Primary recommendation:** Use `@uiw/react-codemirror` with `@codemirror/lang-html` for the code editor, `multer` with memory storage for file uploads, `js-beautify` for HTML pretty-print, and public GCS URLs (uniform bucket-level access) for all uploaded assets.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- CodeMirror editable replaces the basic HTML textarea (in templates AND composer)
- Syntax highlighting HTML + line numbers + auto-indent (no tag auto-completion)
- Pretty-print automatic on WYSIWYG -> Code switch + manual "Formater" button
- Available in template editor (Settings) AND email composer (ComposeReply)
- 3 image insertion methods: toolbar button + drag & drop + paste (Ctrl+V)
- Upload to dedicated GCS bucket (gs://weds-crm-assets/) -- separate from vCards bucket
- Public permanent URLs (no signed URLs, no expiration)
- No image resizing at upload
- Attachments uploaded and stored on GCS (weds-crm-assets bucket), not local
- 25 MB per file limit
- UI: drag & drop zone under editor with file list (name, size, delete button)
- Existing brochure (assets/Brochure_Weds.pdf) must be migrated to GCS
- When template selected in composer, template attachments are pre-loaded AND modifiable (add/remove)
- Template switch: confirmation alert before replacing existing attachments
- Inline images from template rendered fully in composer (faithful WYSIWYG)
- Attachments actually attached to MIME multipart sent via Gmail API (not links)
- CodeMirror installed as client dependency (not CDN)

### Claude's Discretion
- CodeMirror version and extensions choice
- Uploaded file naming on GCS (UUID, timestamp, etc.)
- Upload error handling (retry, error message)
- Backend upload endpoint format (multipart/form-data)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TMPL-01 | L'editeur HTML affiche le code source avec coloration syntaxique | CodeMirror 6 with @codemirror/lang-html provides HTML syntax highlighting, line numbers, auto-indent |
| TMPL-02 | Le code HTML brut est automatiquement formate/indente (pretty print) | js-beautify html_beautify() for auto-format on mode switch + manual button |
| TMPL-03 | L'utilisateur peut inserer des images inline via upload GCS dans l'editeur TipTap | TipTap Image extension + backend upload endpoint + GCS public bucket |
| TMPL-04 | L'utilisateur peut gerer les pieces jointes d'un modele (upload drag & drop, suppression) | Multer upload endpoint + GCS storage + JSONB attachments field on schema |
| TMPL-05 | Lors de la selection d'un modele dans le composeur, les PJ du modele sont pre-chargees | Template attachments fetched from GCS as Buffers on send, pre-loaded in composer UI |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @uiw/react-codemirror | ^4.23 | React wrapper for CodeMirror 6 | Most popular CM6 React binding (2M+ weekly npm downloads), controlled component API |
| @codemirror/lang-html | ^6.4 | HTML language support for CM6 | Official CodeMirror HTML language pack with syntax highlighting |
| js-beautify | ^1.15 | HTML pretty-printing | De facto standard for HTML formatting (10M+ weekly npm downloads) |
| multer | ^1.4 | Multipart file upload middleware | Official Express middleware for multipart/form-data handling |
| @tiptap/extension-image | ^3.20 | Image nodes in TipTap editor | Official TipTap extension for inline images |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @codemirror/theme-one-dark | ^6.1 | Dark theme for CodeMirror | If dark mode support needed (project uses next-themes) |
| uuid | ^11 | UUID generation for GCS filenames | For unique file naming on upload |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @uiw/react-codemirror | Direct CM6 with useRef/useEffect | More control but much more boilerplate for syncing React state |
| js-beautify | prettier/standalone | Prettier is heavier (~1MB), js-beautify is lighter and focused |
| multer | busboy direct | Multer wraps busboy with Express integration, less code |

**Installation (client):**
```bash
cd client && npm install @uiw/react-codemirror @codemirror/lang-html @tiptap/extension-image js-beautify
npm install -D @types/js-beautify
```

**Installation (server):**
```bash
npm install multer uuid
npm install -D @types/multer @types/uuid
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  routes/api/
    upload.ts              # POST /api/upload (multer + GCS)
  services/
    storage.ts             # Extended: uploadAsset() alongside existing uploadVCard()

client/src/
  components/
    editor/
      CodeMirrorEditor.tsx  # Reusable CM6 HTML editor component
    inbox/
      TipTapEditor.tsx      # Modified: CM6 replaces textarea in HTML mode, Image extension added
      ComposeReply.tsx       # Modified: pre-load template attachments, confirmation on switch
    settings/
      TemplateEditor.tsx    # Modified: attachment drag-drop zone, image upload toolbar
      AttachmentZone.tsx    # Reusable drag-drop attachment component
```

### Pattern 1: CodeMirror as HTML Mode Replacement
**What:** Replace the textarea in TipTapEditor's HTML mode with a CodeMirror 6 instance
**When to use:** When toggling to HTML source view in both template editor and composer
**Example:**
```typescript
// CodeMirrorEditor.tsx
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

export function CodeMirrorEditor({ value, onChange, height = '300px' }: CodeMirrorEditorProps) {
  return (
    <CodeMirror
      value={value}
      height={height}
      extensions={[html()]}
      onChange={onChange}
    />
  );
}
```

### Pattern 2: Pretty-Print on Mode Switch
**What:** Auto-format HTML when switching from WYSIWYG to Code mode
**When to use:** Every time the user clicks the Code toggle button
**Example:**
```typescript
import { html_beautify } from 'js-beautify';

const BEAUTIFY_OPTIONS = {
  indent_size: 2,
  wrap_line_length: 120,
  preserve_newlines: true,
  max_preserve_newlines: 2,
};

// In toggleHtmlMode:
const currentHtml = editor?.getHTML() ?? '';
const formatted = html_beautify(currentHtml, BEAUTIFY_OPTIONS);
setHtmlSource(formatted);
```

### Pattern 3: GCS Public Upload with Multer
**What:** Backend endpoint that receives multipart file, uploads to GCS with public URL
**When to use:** Image insertion and attachment upload
**Example:**
```typescript
// upload.ts route
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

router.post('/upload', upload.single('file'), async (req, res) => {
  const file = req.file!;
  const ext = file.originalname.split('.').pop();
  const gcsPath = `uploads/${uuidv4()}.${ext}`;

  const bucket = storage.bucket('weds-crm-assets');
  const gcsFile = bucket.file(gcsPath);

  await gcsFile.save(file.buffer, {
    contentType: file.mimetype,
    metadata: { originalName: file.originalname },
  });

  const publicUrl = `https://storage.googleapis.com/weds-crm-assets/${gcsPath}`;
  res.json({ url: publicUrl, filename: file.originalname, size: file.size, mimeType: file.mimetype, gcsPath });
});
```

### Pattern 4: TipTap Image Extension for Inline Images
**What:** Add Image extension to TipTap so uploaded images render inline as `<img>` tags
**When to use:** When user uploads an image via toolbar/drag-drop/paste in WYSIWYG mode
**Example:**
```typescript
import Image from '@tiptap/extension-image';

// In TipTapEditor extensions:
Image.configure({ inline: true, allowBase64: false }),

// Insert after upload:
editor?.chain().focus().setImage({ src: publicUrl }).run();
```

### Pattern 5: Template Attachment Pre-loading in Composer
**What:** When a template is selected, its attachments array is fetched and displayed as modifiable list
**When to use:** In ComposeReply when user selects a template
**Example:**
```typescript
// Template attachments stored as JSONB:
// [{ filename: "Brochure_Weds.pdf", gcsPath: "uploads/abc.pdf", url: "https://...", mimeType: "application/pdf", size: 1234567 }]

// On template select: populate attachment list from template.attachments
// On send: backend fetches each attachment from GCS URL, converts to Buffer, attaches to MIME
```

### Anti-Patterns to Avoid
- **Storing files locally on disk:** The existing brochure uses `readFileSync(resolve(process.cwd(), att.path))` -- this must be migrated to GCS fetching since Cloud Run has ephemeral filesystem
- **Base64 images in HTML content:** Use GCS URLs in `<img src>` tags, never embed base64 data
- **Signed URLs for permanent assets:** Decision is public permanent URLs, no expiration to manage
- **Client-side direct GCS upload:** Route through backend for access control and consistent naming

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML syntax highlighting | Custom regex tokenizer | @codemirror/lang-html | CM6's incremental parser handles all edge cases |
| HTML pretty-printing | Custom indentation logic | js-beautify | HTML formatting has hundreds of edge cases (void elements, attributes, embedded scripts) |
| Multipart parsing | Manual request body parsing | multer | Handles streaming, limits, content-type detection, temp file cleanup |
| Code editor React binding | Manual CM6 lifecycle management | @uiw/react-codemirror | Handles mount/unmount, value sync, extensions updates |
| Image paste handling | Manual clipboard API parsing | TipTap's built-in paste handlers + custom plugin | Clipboard API varies across browsers |

**Key insight:** The HTML editing domain has mature, battle-tested libraries. The real complexity is in the integration plumbing (mode switching, state sync, upload flows) not in the individual pieces.

## Common Pitfalls

### Pitfall 1: CodeMirror-TipTap State Sync
**What goes wrong:** HTML edited in CodeMirror gets out of sync with TipTap's internal ProseMirror document when switching back to WYSIWYG
**Why it happens:** TipTap's `setContent()` sanitizes/normalizes HTML, which can differ from what was in CodeMirror
**How to avoid:** Always go through `editor.commands.setContent(htmlSource)` when switching from Code to WYSIWYG, and accept that TipTap may normalize the HTML. The source of truth switches between TipTap (WYSIWYG mode) and CodeMirror state (Code mode).
**Warning signs:** Content disappearing or reformatting unexpectedly on mode switch

### Pitfall 2: GCS Bucket Public Access Configuration
**What goes wrong:** Uploaded files return 403 when accessed via public URL
**Why it happens:** GCS bucket needs uniform bucket-level access enabled and allUsers read permission
**How to avoid:** Create bucket with `--uniform-bucket-level-access` and add `roles/storage.objectViewer` for `allUsers`
**Warning signs:** First upload works via signed URL but public URL returns 403

### Pitfall 3: Multer with Express 5
**What goes wrong:** Multer may have compatibility issues with Express 5 (this project uses Express 5.2.1)
**Why it happens:** Multer v1 was written for Express 4. Express 5 changed some middleware patterns.
**How to avoid:** Test the upload endpoint early. If multer has issues, use `busboy` directly or `multer@2.0.0-rc.4` (Express 5 compatible pre-release).
**Warning signs:** Middleware not firing, req.file undefined

### Pitfall 4: Attachment Size in MIME Email
**What goes wrong:** Gmail API rejects emails with large attachments
**Why it happens:** Gmail has a 25MB limit per message (total including all attachments + body)
**How to avoid:** Validate total attachment size before send, not just per-file. Show clear error if over limit.
**Warning signs:** 413 or 400 errors from Gmail API on send

### Pitfall 5: Image Paste (Ctrl+V) Producing Base64
**What goes wrong:** Pasting an image from clipboard inserts a base64 data URI instead of uploading to GCS
**Why it happens:** Default browser behavior converts clipboard images to base64
**How to avoid:** Intercept the paste event, extract the blob, upload to GCS, then insert the returned URL. Use a custom TipTap extension or plugin to handle this.
**Warning signs:** Giant base64 strings in the HTML content

### Pitfall 6: Existing Brochure Migration Breaking Seeds
**What goes wrong:** After migrating brochure to GCS, the seed script (`scripts/seed-default-template.ts`) and existing templates in DB still reference local `assets/Brochure_Weds.pdf`
**Why it happens:** Hard-coded local file paths in seed script and existing DB records
**How to avoid:** Update seed script to reference GCS path. Create a migration or one-time script to update existing template attachments in DB. Keep local file as fallback during transition.
**Warning signs:** Attachments not found when sending emails after migration

## Code Examples

### Current Attachment Loading (to be replaced)
```typescript
// Current: reads from local filesystem (src/routes/api/inbox.ts line 208-210)
const filePath = resolve(process.cwd(), att.path);
const content = readFileSync(filePath);

// New: fetch from GCS
const bucket = storage.bucket('weds-crm-assets');
const [content] = await bucket.file(att.gcsPath).download();
```

### GCS Bucket Creation Commands
```bash
# Create the assets bucket
gcloud storage buckets create gs://weds-crm-assets --location=europe-west1 --uniform-bucket-level-access

# Make all objects publicly readable
gcloud storage buckets add-iam-policy-binding gs://weds-crm-assets \
  --member=allUsers \
  --role=roles/storage.objectViewer

# Migrate existing brochure
gsutil cp assets/Brochure_Weds.pdf gs://weds-crm-assets/attachments/Brochure_Weds.pdf
```

### Upload Endpoint Response Shape
```typescript
// POST /api/upload response
interface UploadResponse {
  url: string;        // https://storage.googleapis.com/weds-crm-assets/uploads/<uuid>.<ext>
  filename: string;   // original filename
  size: number;       // bytes
  mimeType: string;   // detected MIME type
  gcsPath: string;    // GCS object path for storage reference
}
```

### Template Attachments JSONB Shape
```typescript
// Stored in emailTemplates.attachments JSONB field
interface TemplateAttachment {
  filename: string;   // display name
  gcsPath: string;    // GCS object path (uploads/<uuid>.<ext>)
  url: string;        // public URL
  mimeType: string;
  size: number;
}
```

### Composer Send Flow with GCS Attachments
```typescript
// On send in inbox.ts route:
// 1. Get template attachments from DB (JSONB array)
// 2. For each: download from GCS bucket.file(att.gcsPath).download()
// 3. Build MIME attachment array: { filename, content: Buffer, mimeType }
// 4. Pass to sendReply/sendEmail (already supports this signature)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Local file attachments | GCS-stored attachments | This phase | Fixes Cloud Run ephemeral FS issue |
| Textarea HTML mode | CodeMirror 6 with syntax highlighting | This phase | Professional code editing experience |
| Manual HTML formatting | js-beautify auto-format | This phase | Consistent readable HTML output |
| Base textarea in TipTap | CM6 inline within TipTap toggle | This phase | Syntax coloring + line numbers |

**Deprecated/outdated:**
- CodeMirror 5: CM6 is a complete rewrite, use CM6 only
- `@uiw/react-codemirror` < v4: Versions before 4.x use CM5

## Open Questions

1. **Multer + Express 5 compatibility**
   - What we know: This project uses Express 5.2.1, multer v1 was designed for Express 4
   - What's unclear: Whether multer v1 works seamlessly with Express 5 or needs v2 RC
   - Recommendation: Test early in Wave 1, fallback to busboy if needed

2. **GCS bucket region**
   - What we know: Project is GCP-hosted, likely Europe
   - What's unclear: Exact region preference for the new bucket
   - Recommendation: Use europe-west1 (same as likely app region)

3. **Dark mode theme for CodeMirror**
   - What we know: Project uses next-themes for dark mode support
   - What's unclear: Whether CM6 default theme works well in both modes
   - Recommendation: Start with default, add @codemirror/theme-one-dark if needed (Claude's discretion)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run tests/api/templates.test.ts --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TMPL-01 | CodeMirror displays HTML with syntax highlighting | manual-only | N/A (client-side visual) | N/A |
| TMPL-02 | HTML auto-formatted on mode switch | unit | `npx vitest run tests/beautify.test.ts -x` | No - Wave 0 |
| TMPL-03 | Image upload to GCS returns public URL | unit | `npx vitest run tests/api/upload.test.ts -x` | No - Wave 0 |
| TMPL-04 | Template attachment CRUD (upload, list, delete) | unit | `npx vitest run tests/api/templates.test.ts -x` | Partial (exists but no attachment tests) |
| TMPL-05 | Composer pre-loads template attachments on select | integration | `npx vitest run tests/api/inbox.test.ts -x` | Partial (exists but no attachment pre-load tests) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/api/templates.test.ts tests/api/upload.test.ts --reporter=verbose`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before /gsd:verify-work

### Wave 0 Gaps
- [ ] `tests/api/upload.test.ts` -- covers TMPL-03 (upload endpoint)
- [ ] `tests/beautify.test.ts` -- covers TMPL-02 (HTML formatting)
- [ ] Add attachment management tests to `tests/api/templates.test.ts` -- covers TMPL-04
- [ ] Add attachment pre-load tests to `tests/api/inbox.test.ts` -- covers TMPL-05

## Sources

### Primary (HIGH confidence)
- Project codebase: TipTapEditor.tsx, storage.ts, ComposeReply.tsx, TemplateEditor.tsx, templates.ts route, inbox.ts route, schema.ts
- [npm @uiw/react-codemirror](https://www.npmjs.com/package/@uiw/react-codemirror) - React CM6 wrapper
- [npm js-beautify](https://www.npmjs.com/package/js-beautify) - HTML formatting
- [multer GitHub](https://github.com/expressjs/multer) - File upload middleware
- [GCS Node.js client](https://www.npmjs.com/package/@google-cloud/storage) - Already in project deps

### Secondary (MEDIUM confidence)
- [uiwjs/react-codemirror GitHub](https://github.com/uiwjs/react-codemirror) - Usage patterns and API docs
- [React CodeMirror docs](https://uiwjs.github.io/react-codemirror/) - Component API reference

### Tertiary (LOW confidence)
- Express 5 + multer compatibility -- needs runtime verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries are well-established with large user bases
- Architecture: HIGH - patterns follow existing codebase conventions (storage.ts, TipTap imperative ref)
- Pitfalls: MEDIUM - Express 5 + multer compatibility and image paste handling need runtime validation

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable libraries, no fast-moving changes expected)
