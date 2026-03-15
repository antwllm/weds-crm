import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TipTapEditorHandle {
  setContent: (html: string) => void;
  insertContent: (text: string) => void;
}

interface TipTapEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export const TipTapEditor = forwardRef<TipTapEditorHandle, TipTapEditorProps>(
  function TipTapEditor({ content, onUpdate, placeholder, className }, ref) {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Link.configure({ openOnClick: false }),
        Underline,
      ],
      content,
      onUpdate: ({ editor: e }) => {
        onUpdate(e.getHTML());
      },
    });

    // Expose imperative methods to parent
    useImperativeHandle(
      ref,
      () => ({
        setContent: (html: string) => {
          editor?.commands.setContent(html);
        },
        insertContent: (text: string) => {
          editor?.commands.insertContent(text);
        },
      }),
      [editor],
    );

    // Sync external content changes only when editor is not focused
    useEffect(() => {
      if (!editor) return;
      if (editor.isFocused) return;
      if (editor.getHTML() === content) return;
      editor.commands.setContent(content);
    }, [content, editor]);

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
        {/* Editor area */}
        <EditorContent
          editor={editor}
          className="min-h-[300px] prose prose-sm max-w-none px-4 py-3 focus:outline-none [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none"
        />

        {/* Formatting toolbar - below editor */}
        <div className="flex items-center gap-0.5 px-3 py-1.5 border-t border-border/50">
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
            onClick={() =>
              editor.chain().focus().clearNodes().unsetAllMarks().run()
            }
            title="Effacer le formatage"
          >
            <RemoveFormatting className="h-4 w-4" />
          </ToolbarButton>
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
