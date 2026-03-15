---
phase: quick-7
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - client/package.json
  - client/src/components/inbox/TipTapEditor.tsx
  - client/src/components/inbox/ComposeReply.tsx
autonomous: false
requirements: [QUICK-7]
must_haves:
  truths:
    - "Email compose shows a WYSIWYG rich text editor instead of a plain textarea"
    - "Formatting toolbar provides bold, italic, underline, strikethrough, lists, blockquote, link, clear formatting"
    - "Template selection and AI draft populate the TipTap editor with rendered HTML"
    - "Variable insertion inserts {{variable}} text at cursor position in the editor"
    - "Sending an email passes HTML content from the editor to the Gmail API"
    - "Default signature appears in the editor on mount"
  artifacts:
    - path: "client/src/components/inbox/TipTapEditor.tsx"
      provides: "Reusable TipTap WYSIWYG editor component with formatting toolbar"
    - path: "client/src/components/inbox/ComposeReply.tsx"
      provides: "Redesigned compose form with header fields, action bar, editor, and footer"
  key_links:
    - from: "ComposeReply.tsx"
      to: "TipTapEditor.tsx"
      via: "content/onUpdate props"
    - from: "ComposeReply.tsx"
      to: "useSendReply"
      via: "editor.getHTML() passed as body"
    - from: "ComposeReply.tsx"
      to: "useTemplates/useTemplatePreview"
      via: "editor.commands.setContent(html)"
---

<objective>
Replace the plain textarea email composer with a TipTap WYSIWYG HTML editor.

Purpose: The current ComposeReply uses a raw textarea that shows HTML markup as text. Users need a proper rich text editing experience with formatting controls, and the output must be clean HTML for the Gmail API.

Output: A TipTapEditor component and a fully redesigned ComposeReply with email header fields, action bar, rich editor, formatting toolbar, and send footer.
</objective>

<execution_context>
@/Users/william/.claude/get-shit-done/workflows/execute-plan.md
@/Users/william/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@client/src/components/inbox/ComposeReply.tsx
@client/src/components/inbox/ThreadDetail.tsx
@client/src/components/leads/LeadEmails.tsx
@client/src/hooks/useInbox.ts
@client/src/components/settings/TemplateEditor.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install TipTap and create TipTapEditor component</name>
  <files>client/package.json, client/src/components/inbox/TipTapEditor.tsx</files>
  <action>
1. Install TipTap packages in the client directory:
   ```
   cd client && bun add @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-underline
   ```

2. Create `client/src/components/inbox/TipTapEditor.tsx` — a reusable WYSIWYG editor component:

   Props interface:
   ```typescript
   interface TipTapEditorProps {
     content: string;           // HTML string
     onUpdate: (html: string) => void;
     placeholder?: string;
     className?: string;
   }
   ```

   Implementation:
   - Use `useEditor` from `@tiptap/react` with extensions: StarterKit (includes bold, italic, strike, bulletList, orderedList, blockquote, heading), Link.configure({ openOnClick: false }), Underline
   - `EditorContent` renders with className `min-h-[300px] prose prose-sm max-w-none px-4 py-3 focus:outline-none [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none`
   - On `onUpdate` callback from useEditor, call `props.onUpdate(editor.getHTML())`
   - Expose the editor instance via `useImperativeHandle` with a forwarded ref so parent can call `editor.commands.setContent(html)` and `editor.commands.insertContent(text)`
   - Use `useEffect` to sync external `content` prop changes ONLY when the editor is not focused (to avoid cursor jumping during typing). Compare with `editor.getHTML()` before setting.

   Formatting toolbar rendered BELOW the editor area (per spec — bottom toolbar):
   - Row of icon buttons using lucide-react icons: Bold, Italic, Underline, Strikethrough, ListOrdered, List, IndentIncrease (for indent — use `editor.chain().focus().sinkListItem('listItem').run()`), IndentDecrease (liftListItem), Quote (blockquote), Link2 (insert link), RemoveFormatting
   - Group buttons with vertical dividers (h-4 w-px bg-border mx-1): [B I U S] | [OL UL Indent Outdent] | [Quote Link Clear]
   - Each button: `p-1.5 rounded hover:bg-muted` and `bg-muted text-foreground` when active (check `editor.isActive('bold')` etc.)
   - Link button: on click, prompt with `window.prompt('URL du lien:', 'https://')`. If result, `editor.chain().focus().setLink({ href: url }).run()`. If already a link, `unsetLink()`.
   - Clear formatting: `editor.chain().focus().clearNodes().unsetAllMarks().run()`
   - Indent/outdent only enabled when inside a list item

   Add minimal TipTap styles. The editor needs these CSS rules (add to the component file as a style constant or add to client/src/index.css):
   ```css
   .ProseMirror p { margin: 0.25em 0; }
   .ProseMirror ul, .ProseMirror ol { padding-left: 1.5em; }
   .ProseMirror blockquote { border-left: 3px solid #e5e7eb; padding-left: 1em; color: #6b7280; }
   .ProseMirror a { color: #2563eb; text-decoration: underline; }
   ```
  </action>
  <verify>
    <automated>cd /Users/william/Documents/Development/weds-crm/client && bun run tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>TipTapEditor component exists with useEditor setup, formatting toolbar with all specified buttons, and proper ref forwarding. TypeScript compiles without errors.</done>
</task>

<task type="auto">
  <name>Task 2: Redesign ComposeReply to use TipTap with full email composer layout</name>
  <files>client/src/components/inbox/ComposeReply.tsx</files>
  <action>
Rewrite ComposeReply.tsx to match the specified email composer layout. Keep ALL existing hooks and logic (useSendReply, useTemplates, useTemplatePreview, useGenerateDraft) and the same ComposeReplyProps interface. Keep all existing send/reply logic intact (threadId handling, inReplyTo, references).

Layout structure (top to bottom, wrapped in a `border rounded-lg bg-background` container):

**1. Email header fields** (px-4 pt-3 space-y-0):
   - "De:" row — static display showing "contact@weds.fr" (use a Select component visually but with single option, or just a styled div with text)
   - "A:" row — Input for recipient email, pre-filled from `to` state (same as current)
   - "Objet:" row — Input for subject (same as current, readOnly when threadId exists)
   - Each row: `flex items-center gap-3 py-2 border-b border-border/50` with label span `text-sm text-muted-foreground w-12 shrink-0`

**2. Action bar** (px-4 py-2 flex items-center gap-2 border-b border-border/50):
   - Template selector dropdown (existing Select component, slightly restyled): icon FileText + "Choisir un modele" as placeholder. Keep existing handleTemplateSelect logic, but when template body is received, call `editorRef.current?.setContent(preview.body)` instead of `setBody`.
   - "Inserer un champ" dropdown using a Select or Popover. Options: `{{nom}}`, `{{date_evenement}}`, `{{budget}}`, `{{email}}`, `{{telephone}}`. On select, call `editorRef.current?.insertContent(variable)` to insert at cursor position. Reset select value after insertion so it can be re-selected.
   - AI draft button (existing, but on result call `editorRef.current?.setContent(result.draft)` instead of `setBody`)

**3. TipTap editor area** (flex-1):
   - Render `<TipTapEditor ref={editorRef} content={body} onUpdate={setBody} placeholder="Votre message..." />`
   - Default signature: On mount (useEffect with empty deps), if body is empty AND no initialDraft, set content to:
     ```html
     <p></p><p></p><p>--</p><p>William Kant</p><p>Directeur Photographique</p><p>WEDS</p><p>contact@weds.fr</p>
     ```
   - The TipTapEditor component renders its formatting toolbar at the bottom of the editor area.

**4. Footer** (px-4 py-3 border-t flex items-center justify-between):
   - Left side: Attachment button (Paperclip icon, non-functional placeholder for now — just the icon button), Eye icon button (preview placeholder)
   - Right side: flex items-center gap-2
     - Trash2 icon button (muted, resets editor content and navigates away or clears form)
     - Send button: green background (`bg-green-600 hover:bg-green-700 text-white`), with Send icon + "Envoyer" text. Calls handleSend which reads `body` state (already updated via onUpdate callback from TipTap). The body is HTML and goes directly to Gmail API (backend already accepts HTML).

Key integration points:
- `body` state remains as the source of truth (string of HTML), updated by TipTapEditor's onUpdate callback
- `editorRef` is a ref to the TipTapEditor for imperative setContent/insertContent calls (templates, AI drafts, variables)
- handleSend uses `body` (HTML string) exactly as before — no changes to the API call
- initialDraft effect: when initialDraft changes, call `editorRef.current?.setContent(initialDraft)` instead of `setBody(initialDraft)` (and also setBody so state stays in sync)
  </action>
  <verify>
    <automated>cd /Users/william/Documents/Development/weds-crm/client && bun run tsc --noEmit 2>&1 | head -30</automated>
  </verify>
  <done>ComposeReply renders a full email composer layout with header fields (De/A/Objet), action bar (template selector, variable insertion, AI draft), TipTap WYSIWYG editor with bottom formatting toolbar, and footer with send/delete buttons. All existing functionality preserved: template loading, AI drafts, send/reply with HTML body to Gmail API.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual verification of TipTap email composer</name>
  <files>client/src/components/inbox/ComposeReply.tsx</files>
  <action>Human verifies the TipTap WYSIWYG email composer visually and functionally.</action>
  <verify>
    1. Start the dev server: `cd client && bun dev`
    2. Navigate to a lead detail page and open the Emails tab
    3. Verify the compose form shows:
       - De/A/Objet header fields with subtle borders
       - Action bar with template selector, variable insertion dropdown, AI draft button
       - Rich text editor area (min 300px height) with default signature
       - Bottom formatting toolbar (Bold, Italic, Underline, etc. grouped by dividers)
       - Footer with attachment/preview icons on left, send (green) and trash on right
    4. Type text and apply formatting: bold, italic, lists, blockquote, link
    5. Select a template from the dropdown — should render as formatted HTML in the editor
    6. Insert a variable (e.g. {{nom}}) — should appear at cursor position
    7. Click "Generer un brouillon" if a lead has enough context
    8. Send an email — verify it arrives with HTML formatting preserved
  </verify>
  <done>User confirms the TipTap editor works correctly with all formatting, templates, variables, and send functionality.</done>
</task>

</tasks>

<verification>
- TypeScript compiles: `cd client && bun run tsc --noEmit`
- Dev server starts: `cd client && bun dev` (no console errors)
- TipTap editor renders and accepts input
- Formatting toolbar toggles produce correct HTML
- Template/AI draft/variable insertion all update the editor content
- Send passes HTML body through existing useSendReply hook unchanged
</verification>

<success_criteria>
- Plain textarea replaced with TipTap WYSIWYG editor
- All formatting options functional (B, I, U, S, lists, indent, blockquote, link, clear)
- Template selection renders HTML in editor (not raw markup)
- Variable insertion works at cursor position
- AI draft populates editor
- Default signature present on new compose
- Send delivers HTML email via Gmail API (no backend changes)
- Existing reply-in-thread and standalone compose flows both work
</success_criteria>

<output>
After completion, create `.planning/quick/7-replace-plain-textarea-email-composer-wi/07-SUMMARY.md`
</output>
