import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { WhatsAppMessage, WhatsAppWindow } from '@/types';

export function useWhatsAppMessages(leadId: number) {
  return useQuery<WhatsAppMessage[]>({
    queryKey: ['whatsapp-messages', leadId],
    queryFn: async () => {
      const res = await apiFetch<{ messages: WhatsAppMessage[] }>(
        `/leads/${leadId}/whatsapp`,
      );
      return res.messages;
    },
    enabled: !!leadId,
    refetchInterval: 30000,
  });
}

export function useSendWhatsApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, message }: { leadId: number; message: string }) =>
      apiFetch<{ status: string; waMessageId: string }>(
        `/leads/${leadId}/whatsapp/send`,
        {
          method: 'POST',
          body: JSON.stringify({ message }),
        },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['whatsapp-messages', variables.leadId],
      });
    },
  });
}

export function useWhatsAppWindow(leadId: number) {
  return useQuery<WhatsAppWindow>({
    queryKey: ['whatsapp-window', leadId],
    queryFn: () =>
      apiFetch<WhatsAppWindow>(`/leads/${leadId}/whatsapp/window`),
    enabled: !!leadId,
  });
}
