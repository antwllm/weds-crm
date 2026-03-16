import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

// --- Types ---

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string | null;
  body: string | null;
  variables: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  subject?: string;
  body?: string;
  variables?: string[];
}

export interface UpdateTemplateRequest {
  name?: string;
  subject?: string;
  body?: string;
  variables?: string[];
}

export interface AiPromptConfig {
  id?: number;
  promptTemplate: string;
  model: string;
  updatedAt?: string;
}

export interface UpdateAiPromptRequest {
  promptTemplate: string;
  model?: string;
}

// --- Template hooks ---

export function useTemplates() {
  return useQuery<EmailTemplate[]>({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await apiFetch<{ templates: EmailTemplate[] }>('/templates');
      return res.templates;
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateRequest) =>
      apiFetch<EmailTemplate>('/templates', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Modele cree');
    },
    onError: () => {
      toast.error('Erreur lors de la creation du modele');
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTemplateRequest }) =>
      apiFetch<EmailTemplate>(`/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Modele sauvegarde');
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde du modele');
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Modèle supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du modèle');
    },
  });
}

// --- Notification settings hooks ---

export interface NotificationSetting {
  id: number;
  channel: string;
  enabled: boolean;
  label: string;
  updatedAt: string;
}

export interface ActivityLogEntry {
  id: number;
  leadId: number;
  leadName: string;
  type: string;
  content: string | null;
  metadata: unknown;
  createdAt: string;
}

export function useNotificationSettings() {
  return useQuery<NotificationSetting[]>({
    queryKey: ['notification-settings'],
    queryFn: () => apiFetch<NotificationSetting[]>('/settings/notifications'),
  });
}

export function useToggleNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ channel, enabled }: { channel: string; enabled: boolean }) =>
      apiFetch<NotificationSetting>(`/settings/notifications/${channel}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      }),
    onMutate: async ({ channel, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['notification-settings'] });
      const previous = queryClient.getQueryData<NotificationSetting[]>(['notification-settings']);
      queryClient.setQueryData<NotificationSetting[]>(['notification-settings'], (old) =>
        old?.map((s) => (s.channel === channel ? { ...s, enabled } : s))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notification-settings'], context.previous);
      }
      toast.error('Erreur lors de la mise a jour de la notification');
    },
    onSuccess: () => {
      toast.success('Notification mise a jour');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });
}

export function useActivityLog(params: { type?: string; limit?: number; offset?: number }) {
  return useQuery<{ activities: ActivityLogEntry[]; total: number }>({
    queryKey: ['activity-log', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.type) searchParams.set('type', params.type);
      if (params.limit) searchParams.set('limit', String(params.limit));
      if (params.offset) searchParams.set('offset', String(params.offset));
      const qs = searchParams.toString();
      return apiFetch(`/settings/activities${qs ? `?${qs}` : ''}`);
    },
  });
}

// --- AI Prompt hooks ---

export function useAiPrompt() {
  return useQuery<AiPromptConfig>({
    queryKey: ['ai-prompt'],
    queryFn: () => apiFetch<AiPromptConfig>('/ai/prompt'),
  });
}

export function useUpdateAiPrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAiPromptRequest) =>
      apiFetch<AiPromptConfig>('/ai/prompt', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-prompt'] });
      toast.success('Prompt IA sauvegarde');
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde du prompt IA');
    },
  });
}
