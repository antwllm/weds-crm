import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  GmailThread,
  ThreadDetail,
  EmailTemplate,
  LinkedEmail,
} from '@/types';

// --- Thread queries ---

interface ThreadsResponse {
  threads: GmailThread[];
  nextPageToken?: string;
}

export function useThreads(pageToken?: string, q?: string) {
  const params = new URLSearchParams();
  if (pageToken) params.set('pageToken', pageToken);
  if (q) params.set('q', q);
  const qs = params.toString();

  return useQuery<ThreadsResponse>({
    queryKey: ['inbox-threads', pageToken, q],
    queryFn: () =>
      apiFetch<ThreadsResponse>(`/inbox/threads${qs ? `?${qs}` : ''}`),
  });
}

export function useThread(threadId: string | null) {
  return useQuery<ThreadDetail>({
    queryKey: ['inbox-thread', threadId],
    queryFn: () => apiFetch<ThreadDetail>(`/inbox/threads/${threadId}`),
    enabled: !!threadId,
  });
}

// --- Reply mutation ---

interface SendReplyParams {
  threadId: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  templateId?: number;
}

export function useSendReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, ...data }: SendReplyParams) =>
      apiFetch<{ status: string }>(`/inbox/threads/${threadId}/reply`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['inbox-thread', variables.threadId],
      });
      queryClient.invalidateQueries({ queryKey: ['inbox-threads'] });
    },
  });
}

// --- Templates ---

interface TemplatesResponse {
  templates: EmailTemplate[];
}

export function useTemplates() {
  return useQuery<TemplatesResponse>({
    queryKey: ['templates'],
    queryFn: () => apiFetch<TemplatesResponse>('/templates'),
  });
}

interface TemplatePreviewParams {
  templateId: number;
  leadId: number;
}

interface TemplatePreviewResponse {
  subject: string;
  body: string;
}

export function useTemplatePreview() {
  return useMutation({
    mutationFn: ({ templateId, leadId }: TemplatePreviewParams) =>
      apiFetch<TemplatePreviewResponse>(`/templates/${templateId}/preview`, {
        method: 'POST',
        body: JSON.stringify({ leadId }),
      }),
  });
}

// --- AI draft ---

interface GenerateDraftParams {
  leadId: number;
}

interface GenerateDraftResponse {
  draft: string;
}

export function useGenerateDraft() {
  return useMutation({
    mutationFn: (data: GenerateDraftParams) =>
      apiFetch<GenerateDraftResponse>('/ai/generate-draft', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

// --- Lead emails ---

interface LeadEmailsResponse {
  emails: LinkedEmail[];
}

export function useLeadEmails(leadId: number | null) {
  return useQuery<LeadEmailsResponse>({
    queryKey: ['lead-emails', leadId],
    queryFn: () => apiFetch<LeadEmailsResponse>(`/leads/${leadId}/emails`),
    enabled: !!leadId,
  });
}
