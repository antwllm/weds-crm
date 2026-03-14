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
      toast.success('Modele supprime');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du modele');
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
