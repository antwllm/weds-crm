import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { forwardRef, useState, useEffect, useImperativeHandle, useRef, useMemo } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  ListOrdered,
  List,
  IndentIncrease,
  IndentDecrease,
  Quote,
  Link2,
  RemoveFormatting,
  Undo2,
  Redo2,
  Code2,
  AlignLeft,
  ImagePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CodeMirrorEditor } from '@/components/editor/CodeMirrorEditor';
import { html_beautify } from 'js-beautify';
import { useUpload } from '@/hooks/useUpload';
import { toast } from 'sonner';

const BEAUTIFY_OPTIONS = {
  indent_size: 2,
  wrap_line_length: 120,
  preserve_newlines: true,
  max_preserve_newlines: 2,
};

export interface TipTapEditorHandle {
  setContent: (html: string) => void;
  insertContent: (text: string) => void;
  getHTML: () => string;
}

interface TipTapEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  placeholder?: string;
  className?: string;
  /** Default editor height (CSS value). Defaults to '300px' */
  defaultHeight?: string;
}

export const TipTapEditor = forwardRef<TipTapEditorHandle, TipTapEditorProps>(
  function TipTapEditor({ content, onUpdate, placeholder, className, defaultHeight = '300px' }, ref) {
    const [htmlMode, setHtmlMode] = useState(false);
    const [htmlSource, setHtmlSource] = useState('');
    const { upload, uploading } = useUpload();

    // Stable ref for the upload function so TipTap extensions can access it
    const uploadRef = useRef<(file: File) => Promise<void>>();

    const uploadAndInsertImage = async (file: File, editorInstance: ReturnType<typeof useEditor>) => {
      if (!file.type.startsWith('image/')) return;
      try {
        const result = await upload(file);
        editorInstance?.chain().focus().setImage({ src: result.url }).run();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors de l'upload de l'image");
      }
    };

    // Create the image upload handler extension with stable ref
    const ImageUploadHandler = useMemo(
      () =>
        Extension.create({
          name: 'imageUploadHandler',
          addProseMirrorPlugins() {
            return [
              new Plugin({
                key: new PluginKey('imageUploadHandler'),
                props: {
                  handlePaste(_view, event) {
                    const items = event.clipboardData?.items;
                    if (!items) return false;
                    for (const item of items) {
                      if (item.type.startsWith('image/')) {
                        event.preventDefault();
                        const file = item.getAsFile();
                        if (file) uploadRef.current?.(file);
                        return true;
                      }
                    }
                    return false;
                  },
                  handleDrop(_view, event) {
                    const files = event.dataTransfer?.files;
                    if (!files || files.length === 0) return false;
                    for (const file of files) {
                      if (file.type.startsWith('image/')) {
                        event.preventDefault();
                        uploadRef.current?.(file);
                        return true;
                      }
                    }
                    return false;
                  },
                },
              }),
            ];
          },
        }),
      [],
    );

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          bulletList: { keepMarks: true, keepAttributes: false },
          orderedList: { keepMarks: true, keepAttributes: false },
        }),
        Link.configure({ openOnClick: false }),
        Underline,
        Placeholder.configure({ placeholder: placeholder ?? '' }),
        Image.configure({ inline: true, allowBase64: false }),
        ImageUploadHandler,
      ],
      content,
      onUpdate: ({ editor: e }) => {
        onUpdate(e.getHTML());
      },
    });

    // Keep uploadRef in sync with current editor instance
    uploadRef.current = (file: File) => uploadAndInsertImage(file, editor);

    // Expose imperative methods to parent
    useImperativeHandle(
      ref,
      () => ({
        setContent: (html: string) => {
          editor?.commands.setContent(html);
          setHtmlSource(html);
        },
        insertContent: (text: string) => {
          if (htmlMode) {
            setHtmlSource((prev) => prev + text);
            return;
          }
          editor?.commands.insertContent(text);
        },
        getHTML: () => {
          if (htmlMode) return htmlSource;
          return editor?.getHTML() ?? '';
        },
      }),
      [editor, htmlMode, htmlSource],
    );

    // Sync external content changes only when editor is not focused
    useEffect(() => {
      if (!editor) return;
      if (editor.isFocused) return;
      if (editor.getHTML() === content) return;
      editor.commands.setContent(content);
    }, [content, editor]);

    // Toggle between HTML source and WYSIWYG
    const toggleHtmlMode = () => {
      if (htmlMode) {
        // Switching back to WYSIWYG — apply HTML source
        editor?.commands.setContent(htmlSource);
        onUpdate(htmlSource);
        setHtmlMode(false);
      } else {
        // Switching to HTML — capture current editor content and pretty-print
        const currentHtml = editor?.getHTML() ?? '';
        const formatted = html_beautify(currentHtml, BEAUTIFY_OPTIONS);
        setHtmlSource(formatted);
        setHtmlMode(true);
      }
    };

    const formatHtml = () => {
      const formatted = html_beautify(htmlSource, BEAUTIFY_OPTIONS);
      setHtmlSource(formatted);
      onUpdate(formatted);
    };

    const handleImageUpload = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) uploadAndInsertImage(file, editor);
      };
      input.click();
    };

    if (!editor) return null;

    const canIndent = editor.can().sinkListItem('listItem');
    const canOutdent = editor.can().liftListItem('listItem');

    const handleLink = () => {
      if (editor.isActive('link')) {
        editor.chain().focus().unsetLink().run();
        return;
      }
      const url = window.prompt('URL du lien:', 'https://');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    };

    return (
      <div className={cn('flex flex-col', className)}>
        {/* Editor area — vertically resizable */}
        {htmlMode ? (
          <CodeMirrorEditor
            value={htmlSource}
            onChange={(val) => {
              setHtmlSource(val);
              onUpdate(val);
            }}
            height={defaultHeight}
          />
        ) : (
          <div
            className="resize-y overflow-auto"
            style={{ minHeight: '120px', maxHeight: '80vh', height: defaultHeight }}
          >
            <EditorContent
              editor={editor}
              className="h-full prose prose-sm max-w-none px-4 py-3 focus:outline-none [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_.ProseMirror_img]:rounded"
            />
          </div>
        )}

        {/* Formatting toolbar - below editor */}
        <div className="flex items-center gap-0.5 px-3 py-1.5 border-t border-border/50">
          {/* Undo / Redo */}
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().undo().run()}
            title="Annuler (Ctrl+Z)"
            disabled={!editor.can().undo()}
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().redo().run()}
            title="Refaire (Ctrl+Y)"
            disabled={!editor.can().redo()}
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Text formatting group */}
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Gras"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italique"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Souligne"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Barre"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>

          <div className="h-4 w-px bg-border mx-1" />

          {/* List group */}
          <ToolbarButton
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Liste numerotee"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Liste a puces"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
            title="Indenter"
            disabled={!canIndent}
          >
            <IndentIncrease className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={false}
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            title="Desindenter"
            disabled={!canOutdent}
          >
            <IndentDecrease className="h-4 w-4" />
          </ToolbarButton>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Block/inline group */}
          <ToolbarButton
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Citation"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('link')}
            onClick={handleLink}
            title="Lien"
          >
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={false}
            onClick={handleImageUpload}
            title="Inserer une image"
            disabled={uploading || htmlMode}
          >
            <ImagePlus className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            active={false}
            onClick={() =>
              editor.chain().focus().clearNodes().unsetAllMarks().run()
            }
            title="Effacer le formatage"
          >
            <RemoveFormatting className="h-4 w-4" />
          </ToolbarButton>

          <div className="h-4 w-px bg-border mx-1" />

          {/* HTML toggle */}
          <ToolbarButton
            active={htmlMode}
            onClick={toggleHtmlMode}
            title={htmlMode ? 'Mode visuel' : 'Mode HTML'}
          >
            <Code2 className="h-4 w-4" />
          </ToolbarButton>
          {htmlMode && (
            <ToolbarButton
              active={false}
              onClick={formatHtml}
              title="Formater le HTML"
            >
              <AlignLeft className="h-4 w-4" />
            </ToolbarButton>
          )}
        </div>
      </div>
    );
  },
);

function ToolbarButton({
  active,
  onClick,
  title,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded hover:bg-muted transition-colors',
        active && 'bg-muted text-foreground',
        disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}
