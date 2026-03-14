import { useState } from 'react';
import { MessageCircle, Loader2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
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
  useSendWhatsApp,
  useWhatsAppWindow,
  useWhatsAppTemplates,
  useSendWhatsAppTemplate,
} from '@/hooks/useWhatsApp';
import { toast } from 'sonner';

interface WhatsAppComposeProps {
  leadId: number;
  leadPhone: string | null;
}

export function WhatsAppCompose({ leadId, leadPhone }: WhatsAppComposeProps) {
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const { data: windowData } = useWhatsAppWindow(leadId);
  const sendWhatsApp = useSendWhatsApp();
  const sendTemplate = useSendWhatsAppTemplate();
  const { data: templates = [] } = useWhatsAppTemplates();

  const hasPhone = !!leadPhone;
  const isWindowOpen = windowData?.isOpen ?? false;
  const canSendMessage = hasPhone && isWindowOpen && message.trim().length > 0;
  const canSendTemplate = hasPhone && !isWindowOpen && !!selectedTemplate;

  async function handleSend() {
    if (!canSendMessage) return;
    sendWhatsApp.mutate(
      { leadId, message: message.trim() },
      {
        onSuccess: () => {
          setMessage('');
          toast.success('Message WhatsApp envoyé');
        },
        onError: () => {
          toast.error("Erreur lors de l'envoi du message WhatsApp");
        },
      },
    );
  }

  async function handleSendTemplate() {
    if (!canSendTemplate || !selectedTemplate) return;
    sendTemplate.mutate(
      { leadId, templateName: selectedTemplate },
      {
        onSuccess: () => {
          setSelectedTemplate(null);
          toast.success('Modèle WhatsApp envoyé');
        },
        onError: () => {
          toast.error("Erreur lors de l'envoi du modèle WhatsApp");
        },
      },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isSending = sendWhatsApp.isPending || sendTemplate.isPending;

  return (
    <div className="border border-t-0 rounded-b-lg p-3 space-y-2 bg-background">
      {/* Window status indicator */}
      <div className="flex items-center gap-2 text-xs">
        {!hasPhone ? (
          <span className="text-muted-foreground">
            Pas de numéro de téléphone
          </span>
        ) : isWindowOpen ? (
          <>
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-green-700 dark:text-green-400">
              Fenêtre ouverte
              {windowData?.expiresAt && (
                <>
                  {' '}
                  &mdash; Expire{' '}
                  {formatDistanceToNow(new Date(windowData.expiresAt), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            <span className="text-orange-700 dark:text-orange-400">
              Fenêtre expirée &mdash; modèle requis
            </span>
          </>
        )}
      </div>

      {/* Template selector when window is expired */}
      {hasPhone && !isWindowOpen && (
        <div className="flex items-center gap-2">
          <Select
            value={selectedTemplate}
            onValueChange={setSelectedTemplate}
            disabled={templates.length === 0 || isSending}
          >
            <SelectTrigger className="flex-1">
              <SelectValue
                placeholder={
                  templates.length === 0
                    ? 'Aucun modèle disponible'
                    : 'Sélectionner un modèle...'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.name} ({t.language})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleSendTemplate}
            disabled={!canSendTemplate || isSending}
          >
            {sendTemplate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Free-form input when window is open */}
      {hasPhone && isWindowOpen && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Votre message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!canSendMessage || isSending}
          >
            {sendWhatsApp.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* No phone */}
      {!hasPhone && (
        <div className="flex items-center gap-2">
          <Input placeholder="Pas de numéro" disabled />
          <Button size="sm" disabled>
            <MessageCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
