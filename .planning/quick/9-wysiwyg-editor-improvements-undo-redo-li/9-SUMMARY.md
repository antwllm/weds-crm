# Quick Task 9: WYSIWYG Editor Improvements

## Changes

### TipTapEditor.tsx
- **Undo/Redo**: Added Undo2/Redo2 buttons at the start of the toolbar
- **Lists**: Configured bulletList/orderedList with keepMarks; CSS now forces `list-style-type: disc/decimal/circle/square` for nested levels
- **Indentation**: sinkListItem/liftListItem work correctly when inside a list (buttons disabled when not in list context)
- **HTML/WYSIWYG toggle**: Code2 button switches between rich text and raw HTML textarea editing
- **Configurable height**: New `defaultHeight` prop (defaults to '300px' for template editor, '150px' for composer)
- **Placeholder**: Added @tiptap/extension-placeholder support

### ComposeReply.tsx
- **Reduced default height**: Editor uses `defaultHeight="150px"` (was 300px)
- **File attachments**: Drag & drop on compose area + Paperclip button to add files. Attachment chips show name/size with remove button.
- **Default recipient**: Auto-fills "A:" field from sender email (excluding weds.fr) or lead email fallback
- **New `leadEmail` prop** to pass lead's email when no prior thread exists

### LeadEmails.tsx / LeadDetail.tsx
- `leadEmail` prop passed through to ComposeReply for the no-email-thread case

### index.css
- Fixed list styles: `list-style-type: disc` for ul, `decimal` for ol, `circle`/`square` for nested levels
- Added `li > p { margin: 0 }` for tighter list spacing
