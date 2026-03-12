import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import type {
  Lead,
  LeadFilters,
  CreateLeadRequest,
  UpdateLeadRequest,
} from '@/types';

function buildLeadsQueryParams(filters?: LeadFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.source) params.set('source', filters.source);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function useLeads(filters?: LeadFilters) {
  return useQuery<Lead[]>({
    queryKey: ['leads', filters],
    queryFn: () => apiFetch<Lead[]>(`/leads${buildLeadsQueryParams(filters)}`),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeadRequest) =>
      apiFetch<Lead>('/leads', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLeadRequest }) =>
      apiFetch<Lead>(`/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['leads'] });

      // Snapshot previous data for rollback
      const previousQueries = queryClient.getQueriesData<Lead[]>({
        queryKey: ['leads'],
      });

      // Optimistically update all matching lead queries
      queryClient.setQueriesData<Lead[]>(
        { queryKey: ['leads'] },
        (old) =>
          old?.map((lead) =>
            lead.id === id ? { ...lead, ...data } as Lead : lead
          ),
      );

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      // Rollback to snapshot on error
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch<Lead>(`/leads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['leads'] });

      // Snapshot previous data for rollback
      const previousQueries = queryClient.getQueriesData<Lead[]>({
        queryKey: ['leads'],
      });

      // Optimistically update all matching lead queries
      queryClient.setQueriesData<Lead[]>(
        { queryKey: ['leads'] },
        (old) =>
          old?.map((lead) =>
            lead.id === id
              ? { ...lead, status: status as Lead['status'] }
              : lead
          ),
      );

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      // Rollback to snapshot on error
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error('Erreur lors du changement de statut');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/leads/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
