import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import { useLeadEmails } from '@/hooks/useLeadEmails';

interface LeadEmailsProps {
  leadId: number;
}

export function LeadEmails({ leadId }: LeadEmailsProps) {
  const { data: emails = [], isLoading } = useLeadEmails(leadId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aucun email lié à ce lead
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {emails.map((email) => {
        const isInbound = email.direction === 'inbound';
        const DirectionIcon = isInbound ? ArrowDownLeft : ArrowUpRight;
        const timeAgo = formatDistanceToNow(new Date(email.receivedAt), {
          addSuffix: true,
          locale: fr,
        });

        return (
          <button
            key={email.id}
            type="button"
            className="w-full text-left flex items-start gap-3 rounded-md p-2 hover:bg-muted transition-colors cursor-pointer"
            onClick={() =>
              navigate('/inbox', {
                state: { threadId: email.gmailThreadId },
              })
            }
          >
            <DirectionIcon
              className={`h-4 w-4 mt-0.5 shrink-0 ${
                isInbound ? 'text-blue-500' : 'text-indigo-500'
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{email.subject}</p>
              <p className="text-xs text-muted-foreground truncate">
                {email.snippet}
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
              {timeAgo}
            </span>
          </button>
        );
      })}
    </div>
  );
}
