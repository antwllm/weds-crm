import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Clock, MessageSquare, Bot, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiScoreFeedback } from '@/components/ai/AiScoreFeedback';
import type { AiDecision } from '@/types';

interface AiDecisionCardProps {
  decision: AiDecision;
}

export function AiDecisionCard({ decision }: AiDecisionCardProps) {
  const langfuseBaseUrl =
    import.meta.env.VITE_LANGFUSE_BASE_URL || 'https://cloud.langfuse.com';
  const langfuseProjectId = import.meta.env.VITE_LANGFUSE_PROJECT_ID || '';

  return (
    <Card className="p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {decision.action === 'reply' ? (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200">
              Reply
            </Badge>
          ) : (
            <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200">
              Handoff
            </Badge>
          )}
          {decision.createdAt && (
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(decision.createdAt), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {decision.latencyMs != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {decision.latencyMs}ms
            </span>
          )}
          {decision.model && <span>{decision.model}</span>}
        </div>
      </div>

      {/* Reason section */}
      {decision.reason && (
        <div>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Raison</span>
          <p className="text-sm">{decision.reason}</p>
        </div>
      )}

      {/* Messages section */}
      <div className="bg-muted/50 rounded-md p-3 space-y-2">
        {decision.prospectMessage && (
          <div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span className="text-xs">Prospect</span>
            </div>
            <p className="text-sm italic">{decision.prospectMessage}</p>
          </div>
        )}
        {decision.responseText && (
          <div>
            <div className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              <span className="text-xs">Reponse IA</span>
            </div>
            <p className="text-sm">{decision.responseText}</p>
          </div>
        )}
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-2 border-t">
        <AiScoreFeedback
          decisionId={decision.id}
          leadId={decision.leadId}
          currentScore={decision.score}
          currentComment={decision.scoreComment}
        />
        {decision.langfuseTraceId && (
          <a
            href={`${langfuseBaseUrl}/project/${langfuseProjectId}/traces/${decision.langfuseTraceId}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Voir la trace dans Langfuse (nouvel onglet)"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Voir dans Langfuse <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </Card>
  );
}
