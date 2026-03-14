import { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSendWhatsApp, useWhatsAppWindow } from '@/hooks/useWhatsApp';
import { toast } from 'sonner';

interface WhatsAppComposeProps {
  leadId: number;
  leadPhone: string | null;
}

export function WhatsAppCompose({ leadId, leadPhone }: WhatsAppComposeProps) {
  const [message, setMessage] = useState('');
  const { data: windowData } = useWhatsAppWindow(leadId);
  const sendWhatsApp = useSendWhatsApp();

  const hasPhone = !!leadPhone;
  const isWindowOpen = windowData?.isOpen ?? false;
  const canSend = hasPhone && isWindowOpen && message.trim().length > 0;

  async function handleSend() {
    if (!canSend) return;
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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

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

      {/* Expired window notice */}
      {hasPhone && !isWindowOpen && (
        <p className="text-xs text-muted-foreground">
          La fenêtre de 24h est expirée. Utilisez un modèle WhatsApp pour
          initier la conversation.
        </p>
      )}

      {/* Input + send */}
      <div className="flex items-center gap-2">
        <Input
          placeholder={hasPhone ? 'Votre message...' : 'Pas de numéro'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!hasPhone || !isWindowOpen || sendWhatsApp.isPending}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!canSend || sendWhatsApp.isPending}
        >
          {sendWhatsApp.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
