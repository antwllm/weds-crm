import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAiDecisions } from '@/hooks/useAiDecisions';
import { AiDecisionCard } from '@/components/ai/AiDecisionCard';

interface AiDecisionsTabProps {
  leadId: number;
}

export function AiDecisionsTab({ leadId }: AiDecisionsTabProps) {
  const [actionFilter, setActionFilter] = useState<string | undefined>(undefined);
  const { data: allDecisions, isLoading, isError } = useAiDecisions(leadId);

  const filtered = actionFilter
    ? allDecisions?.filter((d) => d.action === actionFilter)
    : allDecisions;

  const replyCount = allDecisions?.filter((d) => d.action === 'reply').length ?? 0;
  const handoffCount = allDecisions?.filter((d) => d.action === 'pass_to_human').length ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div
        className="flex items-center gap-2 mb-4"
        role="radiogroup"
        aria-label="Filtrer par type de decision"
      >
        <Badge
          role="radio"
          aria-checked={!actionFilter}
          variant={!actionFilter ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setActionFilter(undefined)}
        >
          Toutes
        </Badge>
        <Badge
          role="radio"
          aria-checked={actionFilter === 'reply'}
          variant={actionFilter === 'reply' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setActionFilter('reply')}
        >
          Reply ({replyCount})
        </Badge>
        <Badge
          role="radio"
          aria-checked={actionFilter === 'pass_to_human'}
          variant={actionFilter === 'pass_to_human' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setActionFilter('pass_to_human')}
        >
          Handoff ({handoffCount})
        </Badge>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive">
            Impossible de charger les decisions IA. Rechargez la page ou reessayez plus tard.
          </p>
        )}

        {!isLoading && !isError && allDecisions && allDecisions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-base font-semibold">Aucune decision IA</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              L'agent IA n'a pas encore traite de messages pour ce lead. Activez l'agent dans
              l'onglet WhatsApp pour commencer.
            </p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          allDecisions &&
          allDecisions.length > 0 &&
          filtered &&
          filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="text-base font-semibold">Aucun resultat</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Aucune decision de type "{actionFilter === 'reply' ? 'Reply' : 'Handoff'}" pour ce
                lead.
              </p>
            </div>
          )}

        {!isLoading && !isError && filtered && filtered.length > 0 && (
          <ScrollArea className="h-full">
            <div className="space-y-4">
              {filtered.map((d) => (
                <AiDecisionCard key={d.id} decision={d} />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
