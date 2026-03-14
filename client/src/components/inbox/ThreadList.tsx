import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GmailThread } from '@/types';
import { PIPELINE_STAGES } from '@/lib/constants';

interface ThreadListProps {
  threads: GmailThread[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore: boolean;
}

function extractSender(snippet: string): string {
  // Try to extract a name-like prefix before any separator
  const parts = snippet.split(/[:\-]/);
  if (parts.length > 1 && parts[0].trim().length < 40) {
    return parts[0].trim();
  }
  return snippet.slice(0, 30);
}

function getStatusColor(status: string): string {
  const stage = PIPELINE_STAGES.find((s) => s.value === status);
  return stage?.color ?? 'bg-gray-100 text-gray-800';
}

export function ThreadList({
  threads,
  selectedId,
  onSelect,
  isLoading,
  onLoadMore,
  hasMore,
}: ThreadListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Aucun fil de discussion
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {threads.map((thread) => (
        <button
          key={thread.id}
          onClick={() => onSelect(thread.id)}
          className={cn(
            'flex flex-col gap-1 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50',
            selectedId === thread.id && 'bg-muted',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">
              {extractSender(thread.snippet)}
            </span>
          </div>

          <p className="line-clamp-2 text-xs text-muted-foreground">
            {thread.snippet}
          </p>

          <div className="flex items-center gap-2">
            {thread.matchedLead && (
              <Badge className={cn('text-[10px]', getStatusColor(thread.matchedLead.status))}>
                {thread.matchedLead.name}
              </Badge>
            )}
          </div>
        </button>
      ))}

      {hasMore && onLoadMore && (
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={onLoadMore}
          >
            Charger plus
          </Button>
        </div>
      )}
    </div>
  );
}
