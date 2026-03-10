import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Activity, CreateNoteRequest } from '@/types';

export function useActivities(leadId: number) {
  return useQuery<Activity[]>({
    queryKey: ['activities', leadId],
    queryFn: () => apiFetch<Activity[]>(`/leads/${leadId}/activities`),
    enabled: !!leadId,
  });
}

export function useCreateNote(leadId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNoteRequest) =>
      apiFetch<Activity>(`/leads/${leadId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', leadId] });
    },
  });
}
