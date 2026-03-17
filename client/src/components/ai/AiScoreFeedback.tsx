import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSubmitScore } from '@/hooks/useAiDecisions';
import { toast } from 'sonner';

interface AiScoreFeedbackProps {
  decisionId: number;
  leadId: number;
  currentScore: number | null;
  currentComment: string | null;
}

export function AiScoreFeedback({
  decisionId,
  leadId,
  currentScore,
  currentComment,
}: AiScoreFeedbackProps) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState(currentComment ?? '');
  const submitScore = useSubmitScore();

  function handleScore(score: number) {
    submitScore.mutate(
      { decisionId, leadId, score, comment: comment || undefined },
      {
        onSuccess: () => toast.success('Evaluation enregistree'),
        onError: () => toast.error("Erreur lors de l'enregistrement de l'evaluation"),
      },
    );
  }

  function handleCommentSubmit() {
    if (currentScore !== null) {
      submitScore.mutate(
        { decisionId, leadId, score: currentScore, comment: comment || undefined },
        {
          onSuccess: () => toast.success('Evaluation enregistree'),
          onError: () => toast.error("Erreur lors de l'enregistrement de l'evaluation"),
        },
      );
    }
  }

  const isPending = submitScore.isPending;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="min-w-[48px] min-h-[48px]"
          aria-pressed={currentScore === 1}
          aria-label="Evaluer positivement"
          onClick={() => handleScore(1)}
          disabled={isPending}
        >
          {isPending && submitScore.variables?.score === 1 ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ThumbsUp
              className={`h-4 w-4 ${currentScore === 1 ? 'text-blue-600' : 'text-muted-foreground'}`}
            />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="min-w-[48px] min-h-[48px]"
          aria-pressed={currentScore === 0}
          aria-label="Evaluer negativement"
          onClick={() => handleScore(0)}
          disabled={isPending}
        >
          {isPending && submitScore.variables?.score === 0 ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <ThumbsDown
              className={`h-4 w-4 ${currentScore === 0 ? 'text-orange-600' : 'text-muted-foreground'}`}
            />
          )}
        </Button>
      </div>

      {currentComment && !showComment && (
        <p className="text-xs text-muted-foreground pl-2">{currentComment}</p>
      )}

      {!showComment ? (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground pl-2"
          onClick={() => setShowComment(true)}
        >
          Ajouter un commentaire
        </button>
      ) : (
        <div className="space-y-1 pl-2">
          <Textarea
            aria-label="Commentaire sur cette decision IA"
            placeholder="Commentaire optionnel sur cette decision..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={handleCommentSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCommentSubmit();
              }
            }}
            className="text-sm"
            rows={2}
          />
        </div>
      )}
    </div>
  );
}
