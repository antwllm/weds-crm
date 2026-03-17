import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { AiDecision } from '@/types';

export function useAiDecisions(leadId: number, actionFilter?: string) {
  const params = actionFilter ? `?action=${actionFilter}` : '';
  return useQuery<AiDecision[]>({
    queryKey: ['ai-decisions', leadId, actionFilter],
    queryFn: async () => {
      const res = await apiFetch<{ decisions: AiDecision[] }>(
        `/leads/${leadId}/ai-decisions${params}`,
      );
      return res.decisions;
    },
    enabled: !!leadId,
  });
}

export function useSubmitScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      decisionId,
      score,
      comment,
    }: {
      decisionId: number;
      leadId: number;
      score: number;
      comment?: string;
    }) =>
      apiFetch<{ ok: boolean }>(`/ai-decisions/${decisionId}/score`, {
        method: 'POST',
        body: JSON.stringify({ score, comment }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['ai-decisions', variables.leadId],
      });
    },
  });
}
