import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { UserPreferences } from '@/types';

export function useUserPreferences() {
  return useQuery<UserPreferences>({
    queryKey: ['userPreferences'],
    queryFn: () => apiFetch<UserPreferences>('/leads/preferences'),
    staleTime: Infinity, // Preferences rarely change from external sources
  });
}

export function useSavePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: UserPreferences) =>
      apiFetch<UserPreferences>('/leads/preferences', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['userPreferences'], data);
    },
  });
}
