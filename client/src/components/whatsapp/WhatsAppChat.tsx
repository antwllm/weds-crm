import { useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Check, CheckCheck, Clock, Loader2 } from 'lucide-react';
import { useWhatsAppMessages } from '@/hooks/useWhatsApp';
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
        <p className="text-xs font-medium mb-0.5 opacity-70">
          {isOutbound ? 'Vous' : 'Lead'}
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

interface WhatsAppChatProps {
  leadId: number;
  leadPhone: string | null;
}

export function WhatsAppChat({ leadId, leadPhone }: WhatsAppChatProps) {
  const { data: messages = [], isLoading } = useWhatsAppMessages(leadId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="max-h-80 overflow-y-auto space-y-2 p-3 border rounded-t-lg bg-background"
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
