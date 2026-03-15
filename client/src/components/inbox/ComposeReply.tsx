import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Sparkles,
  Loader2,
  FileText,
  Paperclip,
  Eye,
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

interface ComposeReplyProps {
  threadId?: string;
  lastMessage?: GmailMessage;
  leadId?: number;
  initialDraft?: string;
  initialTo?: string;
  initialSubject?: string;
}

export function ComposeReply({
  threadId,
  lastMessage,
  leadId,
  initialDraft,
  initialTo,
  initialSubject,
}: ComposeReplyProps) {
  const [body, setBody] = useState(initialDraft ?? '');
  const [to, setTo] = useState(initialTo ?? lastMessage?.from ?? '');
  const [subject, setSubject] = useState(
    initialSubject ??
    (lastMessage?.subject
      ? `Re: ${lastMessage.subject.replace(/^Re:\s*/i, '')}`
      : ''),
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [variableKey, setVariableKey] = useState<string>('');
  const editorRef = useRef<TipTapEditorHandle>(null);

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

  const handleVariableInsert = (value: string) => {
    if (!value) return;
    editorRef.current?.insertContent(value);
    // Reset so user can insert the same variable again
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
  };

  const templates = templatesData?.templates ?? [];

  return (
    <div className="border rounded-lg bg-background">
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
          <SelectTrigger className="w-56 h-8 text-xs">
            <FileText className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            <SelectValue placeholder={templates.length === 0 ? 'Aucun modele' : 'Choisir un modele'} />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
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

      {/* TipTap editor area */}
      <TipTapEditor
        ref={editorRef}
        content={body}
        onUpdate={setBody}
        placeholder="Votre message..."
      />

      {/* Footer */}
      <div className="px-4 py-3 border-t flex items-center justify-between">
        {/* Left: placeholder icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            title="Piece jointe"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            title="Apercu"
          >
            <Eye className="h-4 w-4" />
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
