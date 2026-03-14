import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useThread } from '@/hooks/useInbox';
import { ComposeReply } from './ComposeReply';
import { PIPELINE_STAGES } from '@/lib/constants';

interface ThreadDetailProps {
  threadId: string;
  initialDraft?: string;
  draftLeadId?: number;
}

function getStatusColor(status: string): string {
  const stage = PIPELINE_STAGES.find((s) => s.value === status);
  return stage?.color ?? 'bg-gray-100 text-gray-800';
}

function extractInitial(from: string): string {
  const name = from.replace(/<.*>/, '').trim();
  return (name[0] ?? '?').toUpperCase();
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

function isSentByMe(from: string): boolean {
  return from.includes('contact@weds.fr') || from.includes('weds.fr');
}

/** Strip HTML tags for safe rendering. Email body from our API may contain HTML. */
function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent ?? '';
}

export function ThreadDetail({
  threadId,
  initialDraft,
  draftLeadId,
}: ThreadDetailProps) {
  const { data, isLoading } = useThread(threadId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Impossible de charger le fil de discussion
      </div>
    );
  }

  const messages = data.messages;
  const lastMessage = messages[messages.length - 1];
  const leadId = draftLeadId ?? data.matchedLead?.id;

  return (
    <div className="flex h-full flex-col">
      {/* Lead link */}
      {data.matchedLead && (
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <span className="text-sm text-muted-foreground">Lead:</span>
          <Link
            to={`/leads/${data.matchedLead.id}`}
            className="flex items-center gap-1 text-sm font-medium hover:underline"
          >
            {data.matchedLead.name}
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Badge className={cn('text-[10px]', getStatusColor(data.matchedLead.status))}>
            {data.matchedLead.status}
          </Badge>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.map((msg) => {
          const sent = isSentByMe(msg.from);
          let dateLabel = '';
          try {
            dateLabel = formatDistanceToNow(new Date(msg.date), {
              addSuffix: true,
              locale: fr,
            });
          } catch {
            dateLabel = msg.date;
          }

          return (
            <div
              key={msg.id}
              className={cn(
                'rounded-lg p-4',
                sent ? 'bg-primary/5 ml-8' : 'bg-muted/50 mr-8',
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                    sent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted-foreground/20 text-foreground',
                  )}
                >
                  {extractInitial(msg.from)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{msg.from.replace(/<.*>/, '').trim()}</span>
                  <span className="text-xs text-muted-foreground">
                    {extractEmail(msg.from)} · {dateLabel}
                  </span>
                </div>
              </div>

              {msg.subject && (
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {msg.subject}
                </p>
              )}

              <p className="whitespace-pre-wrap text-sm">
                {stripHtml(msg.body)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Compose reply */}
      {lastMessage && (
        <ComposeReply
          threadId={threadId}
          lastMessage={lastMessage}
          leadId={leadId}
          initialDraft={initialDraft}
        />
      )}
    </div>
  );
}
