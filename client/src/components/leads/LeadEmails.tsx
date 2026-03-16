import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { ArrowDownLeft, ArrowUpRight, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeadEmails } from '@/hooks/useLeadEmails';
import { useThread } from '@/hooks/useInbox';
import { ComposeReply } from '@/components/inbox/ComposeReply';
import type { LinkedEmail } from '@/types';

interface LeadEmailsProps {
  leadId: number;
  leadEmail?: string;
  initialDraft?: string;
}

/** Group linked emails by gmailThreadId, keeping the most recent email per thread on top */
function groupByThread(emails: LinkedEmail[]) {
  const map = new Map<string, LinkedEmail[]>();
  for (const email of emails) {
    const group = map.get(email.gmailThreadId);
    if (group) {
      group.push(email);
    } else {
      map.set(email.gmailThreadId, [email]);
    }
  }
  // Sort groups by most recent email date descending
  return Array.from(map.entries()).sort((a, b) => {
    const aDate = new Date(a[1][0].receivedAt).getTime();
    const bDate = new Date(b[1][0].receivedAt).getTime();
    return bDate - aDate;
  });
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent ?? '';
}

function isSentByMe(from: string): boolean {
  return from.includes('contact@weds.fr') || from.includes('weds.fr');
}

function extractInitial(from: string): string {
  const name = from.replace(/<.*>/, '').trim();
  return (name[0] ?? '?').toUpperCase();
}

function extractEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1] : from;
}

/** Inline thread detail that loads messages from Gmail API */
function InlineThread({ threadId, leadId }: { threadId: string; leadId: number }) {
  const { data, isLoading } = useThread(threadId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-2 text-xs text-muted-foreground">
        Impossible de charger le fil
      </p>
    );
  }

  const messages = data.messages;
  const lastMessage = messages[messages.length - 1];

  return (
    <div className="flex flex-col">
      {/* Messages */}
      <div className="space-y-3 py-2">
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
                'rounded-lg p-3',
                sent ? 'bg-primary/5 ml-6' : 'bg-muted/50 mr-6',
              )}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium',
                    sent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted-foreground/20 text-foreground',
                  )}
                >
                  {extractInitial(msg.from)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate">
                    {msg.from.replace(/<.*>/, '').trim()}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {extractEmail(msg.from)} · {dateLabel}
                  </span>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm break-words">
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
        />
      )}
    </div>
  );
}

export function LeadEmails({ leadId, leadEmail, initialDraft }: LeadEmailsProps) {
  const { data: emailsData, isLoading } = useLeadEmails(leadId);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);

  // Handle both response shapes: { emails: [...] } or direct array
  const emails = Array.isArray(emailsData)
    ? emailsData
    : (emailsData as { emails?: LinkedEmail[] } | undefined)?.emails ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="space-y-4">
        <ComposeReply leadId={leadId} leadEmail={leadEmail} initialDraft={initialDraft} />
        <p className="py-2 text-center text-xs text-muted-foreground">
          Aucun email lié à ce lead
        </p>
      </div>
    );
  }

  const threads = groupByThread(emails);

  return (
    <div className="space-y-1 min-w-0 overflow-hidden">
      {/* Show compose with draft when AI generates a brouillon */}
      {initialDraft && (
        <div className="mb-3">
          <ComposeReply leadId={leadId} leadEmail={leadEmail} initialDraft={initialDraft} />
        </div>
      )}
      {threads.map(([threadId, threadEmails]) => {
        const latest = threadEmails[0];
        const isExpanded = expandedThread === threadId;
        const isInbound = latest.direction === 'inbound';
        const DirectionIcon = isInbound ? ArrowDownLeft : ArrowUpRight;
        const timeAgo = formatDistanceToNow(new Date(latest.receivedAt), {
          addSuffix: true,
          locale: fr,
        });

        return (
          <div key={threadId} className="min-w-0 overflow-hidden">
            {/* Thread header row */}
            <button
              type="button"
              className="w-full text-left flex items-start gap-2 rounded-md p-2 hover:bg-muted transition-colors cursor-pointer overflow-hidden"
              onClick={() =>
                setExpandedThread(isExpanded ? null : threadId)
              }
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              )}
              <DirectionIcon
                className={`h-4 w-4 mt-0.5 shrink-0 ${
                  isInbound ? 'text-blue-500' : 'text-indigo-500'
                }`}
              />
              <div className="w-0 flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{latest.subject}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {latest.snippet}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5 shrink-0">
                {threadEmails.length > 1 && (
                  <span className="mr-1 font-medium">{threadEmails.length}</span>
                )}
                {timeAgo}
              </span>
            </button>

            {/* Expanded thread detail */}
            {isExpanded && (
              <div className="ml-2 border-l-2 border-muted pl-3 pb-2 min-w-0 overflow-hidden">
                <InlineThread threadId={threadId} leadId={leadId} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
