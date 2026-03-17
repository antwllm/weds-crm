import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Check, CheckCheck, Clock, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useWhatsAppMessages, useLeadAiStatus, useToggleAiAgent } from '@/hooks/useWhatsApp';
import { WhatsAppCompose } from '@/components/whatsapp/WhatsAppCompose';
import type { WhatsAppMessage } from '@/types';

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground" />;
    default:
      return <Clock className="h-3 w-3 text-muted-foreground" />;
  }
}

function ChatBubble({ message }: { message: WhatsAppMessage }) {
  const isOutbound = message.direction === 'outbound';
  const timeAgo = formatDistanceToNow(new Date(message.createdAt), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-lg px-3 py-2 ${
          isOutbound
            ? 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'
            : 'bg-muted text-foreground'
        }`}
      >
        <p className="flex items-center text-xs font-medium mb-0.5 opacity-70">
          {isOutbound ? 'Vous' : 'Lead'}
          {isOutbound && message.sentBy === 'ai' && (
            <Badge className="ml-1 h-4 px-1.5 text-xs bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200 border-0">
              IA
            </Badge>
          )}
        </p>
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] opacity-60">{timeAgo}</span>
          {isOutbound && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function AiAgentBanner({ leadId, leadName }: { leadId: number; leadName?: string }) {
  const { data: aiStatus } = useLeadAiStatus(leadId);
  const toggleMutation = useToggleAiAgent();
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  const isEnabled = aiStatus?.whatsappAiEnabled ?? false;
  const hasActiveHandoff = aiStatus?.hasActiveHandoff ?? false;

  function handleToggle(checked: boolean) {
    if (!checked) {
      // Show confirmation dialog before disabling
      setShowDisableDialog(true);
      return;
    }
    // Enable directly (optimistic)
    toggleMutation.mutate(
      { leadId, enabled: true },
      {
        onSuccess: () => toast.success(`Agent IA active pour ${leadName || 'ce lead'}`),
        onError: () => toast.error('Impossible de modifier l\'agent IA. Reessayez.'),
      },
    );
  }

  function confirmDisable() {
    toggleMutation.mutate(
      { leadId, enabled: false },
      {
        onSuccess: () => {
          toast.success(`Agent IA desactive pour ${leadName || 'ce lead'}`);
          setShowDisableDialog(false);
        },
        onError: () => {
          toast.error('Impossible de modifier l\'agent IA. Reessayez.');
          setShowDisableDialog(false);
        },
      },
    );
  }

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border border-b-0 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Switch
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={toggleMutation.isPending}
            aria-label="Agent IA"
          />
          <span className="text-sm font-medium">Agent IA</span>
        </div>
        {isEnabled && hasActiveHandoff && (
          <Badge
            className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200 border-0"
            role="status"
          >
            En attente de reponse humaine
          </Badge>
        )}
      </div>

      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactiver l&apos;agent IA ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;agent ne repondra plus automatiquement aux messages WhatsApp de ce lead. Vous pouvez le reactiver a tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisable}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desactiver l&apos;agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface WhatsAppChatProps {
  leadId: number;
  leadPhone: string | null;
  leadName?: string;
}

export function WhatsAppChat({ leadId, leadPhone, leadName }: WhatsAppChatProps) {
  const { data: messages = [], isLoading } = useWhatsAppMessages(leadId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col">
      {/* AI Agent Banner */}
      <AiAgentBanner leadId={leadId} leadName={leadName} />

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="max-h-80 overflow-y-auto space-y-2 p-3 border border-t-0 bg-background"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun message WhatsApp
          </p>
        ) : (
          messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
        )}
      </div>

      {/* Compose area */}
      <WhatsAppCompose leadId={leadId} leadPhone={leadPhone} />
    </div>
  );
}
