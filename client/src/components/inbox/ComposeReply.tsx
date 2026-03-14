import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import type { GmailMessage } from '@/types';

interface ComposeReplyProps {
  threadId?: string;
  lastMessage?: GmailMessage;
  leadId?: number;
  initialDraft?: string;
  initialTo?: string;
}

export function ComposeReply({
  threadId,
  lastMessage,
  leadId,
  initialDraft,
  initialTo,
}: ComposeReplyProps) {
  const [body, setBody] = useState(initialDraft ?? '');
  const [to, setTo] = useState(initialTo ?? lastMessage?.from ?? '');
  const [subject, setSubject] = useState(
    lastMessage?.subject
      ? `Re: ${lastMessage.subject.replace(/^Re:\s*/i, '')}`
      : '',
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const navigate = useNavigate();
  const sendReply = useSendReply();
  const { data: templatesData } = useTemplates();
  const templatePreview = useTemplatePreview();
  const generateDraft = useGenerateDraft();

  // Update body when initialDraft changes (e.g. from draft-from-lead flow)
  useEffect(() => {
    if (initialDraft) setBody(initialDraft);
  }, [initialDraft]);

  const handleTemplateSelect = async (value: string | null) => {
    if (!value) return;
    setSelectedTemplateId(value);
    const templateId = parseInt(value, 10);
    if (!leadId) {
      // Without a lead, just insert the raw template
      const template = templatesData?.templates.find((t) => t.id === templateId);
      if (template) {
        setSubject(template.subject);
        setBody(template.body);
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
    } catch {
      toast.error('Erreur lors de la prévisualisation du modèle');
    }
  };

  const handleGenerateDraft = async () => {
    if (!leadId) return;
    try {
      const result = await generateDraft.mutateAsync({ leadId });
      setBody(result.draft);
    } catch {
      toast.error('Erreur lors de la génération du brouillon');
    }
  };

  const handleSend = async () => {
    if (!body.trim()) {
      toast.error('Le message ne peut pas être vide');
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
        // Standalone compose (no thread yet) - use inbox reply endpoint without threadId
        await sendReply.mutateAsync({
          threadId: 'new',
          to,
          subject,
          body,
        });
      }
      toast.success('Réponse envoyée');
      setBody('');
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
  };

  const templates = templatesData?.templates ?? [];

  return (
    <div className="space-y-3 border-t bg-background p-4">
      {/* To field */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground w-8">A:</span>
        <Input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="destinataire@email.com"
          className="flex-1"
        />
      </div>

      {/* Subject field */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground w-8">Obj:</span>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Objet"
          className="flex-1"
          readOnly={!!threadId}
        />
      </div>

      {/* Body */}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Votre message..."
        rows={4}
        className="min-h-24"
      />

      {/* Actions bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Template picker */}
        {templates.length > 0 ? (
          <Select
            value={selectedTemplateId}
            onValueChange={handleTemplateSelect}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Modèle..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Créer un modèle
          </button>
        )}

        {/* AI draft button */}
        {leadId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateDraft}
            disabled={generateDraft.isPending}
          >
            {generateDraft.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Générer un brouillon
          </Button>
        )}

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={sendReply.isPending || !body.trim()}
          className="ml-auto"
        >
          {sendReply.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Send className="h-4 w-4 mr-1" />
          )}
          Envoyer
        </Button>
      </div>
    </div>
  );
}
