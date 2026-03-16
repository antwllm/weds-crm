import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Sparkles,
  Loader2,
  FileText,
  Paperclip,
  X,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useSendReply,
  useTemplates,
  useTemplatePreview,
  useGenerateDraft,
} from '@/hooks/useInbox';
import { TipTapEditor, type TipTapEditorHandle } from './TipTapEditor';
import type { GmailMessage } from '@/types';

const DEFAULT_SIGNATURE =
  '<p></p><p></p><p>--</p><p>William Kant</p><p>Directeur Photographique</p><p>WEDS</p><p>contact@weds.fr</p>';

const VARIABLE_OPTIONS = [
  { label: 'Nom', value: '{{nom}}' },
  { label: 'Date evenement', value: '{{date_evenement}}' },
  { label: 'Budget', value: '{{budget}}' },
  { label: 'Email', value: '{{email}}' },
  { label: 'Telephone', value: '{{telephone}}' },
];

/** Extract email from "Name <email>" format */
function extractEmailFromHeader(header: string): string {
  const match = header.match(/<([^>]+)>/);
  return match ? match[1] : header.trim();
}

interface AttachmentFile {
  file: File;
  name: string;
  size: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

interface ComposeReplyProps {
  threadId?: string;
  lastMessage?: GmailMessage;
  leadId?: number;
  leadEmail?: string;
  initialDraft?: string;
  initialTo?: string;
  initialSubject?: string;
}

export function ComposeReply({
  threadId,
  lastMessage,
  leadId,
  leadEmail,
  initialDraft,
  initialTo,
  initialSubject,
}: ComposeReplyProps) {
  const [body, setBody] = useState(initialDraft ?? '');
  // Default "to": initialTo > lastMessage sender (non-weds) > leadEmail
  const defaultTo = initialTo
    ?? ((lastMessage?.from && !lastMessage.from.includes('weds.fr')
      ? extractEmailFromHeader(lastMessage.from)
      : '') || leadEmail || '');
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(
    initialSubject ??
    (lastMessage?.subject
      ? `Re: ${lastMessage.subject.replace(/^Re:\s*/i, '')}`
      : ''),
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [variableKey, setVariableKey] = useState<string>('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const editorRef = useRef<TipTapEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const sendReply = useSendReply();
  const { data: templatesData } = useTemplates();
  const templatePreview = useTemplatePreview();
  const generateDraft = useGenerateDraft();

  // Default signature on mount (only for new compose, no draft, no thread reply)
  useEffect(() => {
    if (!initialDraft && !lastMessage) {
      setBody(DEFAULT_SIGNATURE);
      editorRef.current?.setContent(DEFAULT_SIGNATURE);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update editor when initialDraft changes (e.g. from draft-from-lead flow)
  useEffect(() => {
    if (initialDraft) {
      setBody(initialDraft);
      editorRef.current?.setContent(initialDraft);
    }
  }, [initialDraft]);

  const handleTemplateSelect = async (value: string | null) => {
    if (!value) return;
    setSelectedTemplateId(value);
    const templateId = parseInt(value, 10);
    if (!leadId) {
      const template = templatesData?.templates.find((t) => t.id === templateId);
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
        editorRef.current?.setContent(template.body);
      }
      return;
    }
    try {
      const preview = await templatePreview.mutateAsync({
        templateId,
        leadId,
      });
      setSubject(preview.subject);
      setBody(preview.body);
      editorRef.current?.setContent(preview.body);
    } catch {
      toast.error('Erreur lors de la previsualisation du modele');
    }
  };

  const handleVariableInsert = (value: string | null) => {
    if (!value) return;
    editorRef.current?.insertContent(value);
    setVariableKey('');
  };

  const handleGenerateDraft = async () => {
    if (!leadId) return;
    try {
      const result = await generateDraft.mutateAsync({ leadId });
      setBody(result.draft);
      editorRef.current?.setContent(result.draft);
    } catch {
      toast.error('Erreur lors de la generation du brouillon');
    }
  };

  // File attachment handling
  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files).map((file) => ({
      file,
      name: file.name,
      size: file.size,
    }));
    setAttachments((prev) => [...prev, ...newFiles]);
  }, []);

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Drag & drop on the whole compose area
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleSend = async () => {
    if (!body.trim() || body === '<p></p>') {
      toast.error('Le message ne peut pas etre vide');
      return;
    }
    if (!to.trim()) {
      toast.error('Le destinataire est requis');
      return;
    }

    try {
      if (threadId) {
        await sendReply.mutateAsync({
          threadId,
          to,
          subject,
          body,
          inReplyTo: lastMessage?.messageId,
          references: lastMessage
            ? `${lastMessage.references ?? ''} ${lastMessage.messageId}`.trim()
            : undefined,
        });
      } else {
        await sendReply.mutateAsync({
          threadId: 'new',
          to,
          subject,
          body,
        });
      }
      toast.success('Reponse envoyee');
      setBody('');
      editorRef.current?.setContent('');
      setAttachments([]);
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
  };

  const handleDiscard = () => {
    setBody('');
    editorRef.current?.setContent('');
    setSubject('');
    setTo('');
    setSelectedTemplateId(null);
    setAttachments([]);
  };

  const templates = templatesData?.templates ?? [];

  return (
    <div
      className="border rounded-lg bg-background"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Email header fields */}
      <div className="px-4 pt-3 space-y-0">
        {/* De: */}
        <div className="flex items-center gap-3 py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground w-12 shrink-0">De:</span>
          <span className="text-sm">contact@weds.fr</span>
        </div>

        {/* A: */}
        <div className="flex items-center gap-3 py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground w-12 shrink-0">A:</span>
          <Input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="destinataire@email.com"
            className="flex-1 border-0 shadow-none focus-visible:ring-0 h-auto py-0 px-0 text-sm"
          />
        </div>

        {/* Objet: */}
        <div className="flex items-center gap-3 py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground w-12 shrink-0">Objet:</span>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Objet"
            className="flex-1 border-0 shadow-none focus-visible:ring-0 h-auto py-0 px-0 text-sm"
            readOnly={!!threadId}
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="px-4 py-2 flex items-center gap-2 border-b border-border/50 flex-wrap">
        {/* Template selector */}
        <Select
          value={selectedTemplateId ?? undefined}
          onValueChange={handleTemplateSelect}
          disabled={templates.length === 0}
        >
          <SelectTrigger className="w-auto max-w-80 h-8 text-xs">
            <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            <SelectValue placeholder={templates.length === 0 ? 'Aucun modele' : 'Choisir un modele'} />
          </SelectTrigger>
          <SelectContent className="max-w-96">
            {templates.map((t) => (
              <SelectItem key={t.id} value={String(t.id)} className="whitespace-normal">
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {templates.length === 0 && (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Creer
          </button>
        )}

        {/* Variable insertion */}
        <Select
          value={variableKey}
          onValueChange={handleVariableInsert}
        >
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="Inserer un champ" />
          </SelectTrigger>
          <SelectContent>
            {VARIABLE_OPTIONS.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* AI draft button */}
        {leadId && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleGenerateDraft}
            disabled={generateDraft.isPending}
          >
            {generateDraft.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1" />
            )}
            Generer un brouillon
          </Button>
        )}
      </div>

      {/* TipTap editor area — reduced default height */}
      <TipTapEditor
        ref={editorRef}
        content={body}
        onUpdate={setBody}
        placeholder="Votre message..."
        defaultHeight="150px"
      />

      {/* Attachments list */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-border/50 flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div
              key={`${att.name}-${i}`}
              className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate max-w-40">{att.name}</span>
              <span className="text-muted-foreground">({formatFileSize(att.size)})</span>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="ml-0.5 rounded hover:bg-destructive/10 p-0.5"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t flex items-center justify-between">
        {/* Left: attachment button */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            title="Piece jointe"
            onClick={handleFileSelect}
          >
            <Paperclip className="h-4 w-4" />
          </button>
        </div>

        {/* Right: discard + send */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDiscard}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <Button
            onClick={handleSend}
            disabled={sendReply.isPending || !body.trim() || body === '<p></p>'}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {sendReply.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}
