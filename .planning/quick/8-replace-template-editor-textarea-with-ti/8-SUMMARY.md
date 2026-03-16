# Quick Task 8: Replace template editor textarea with TipTap WYSIWYG

## What changed
- `client/src/components/settings/TemplateEditor.tsx`: Replaced the raw `<Textarea>` with the existing `TipTapEditor` component (same one used in the mail composer)
- Variable insertion now uses `editorRef.current?.insertContent()` instead of textarea cursor manipulation
- Editor content is synced via `setContent()` on template select, create, edit, cancel, and save

## Result
The Settings > Templates editor now has the same rich text WYSIWYG experience as the inbox mail composer, with formatting toolbar (bold, italic, underline, lists, links, etc.) and resizable editor area.
