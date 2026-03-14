import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { LinkedEmail } from '@/types';

export function useLeadEmails(leadId: number) {
  return useQuery<LinkedEmail[]>({
    queryKey: ['lead-emails', leadId],
    queryFn: async () => {
      const res = await apiFetch<{ emails: LinkedEmail[] }>(
        `/leads/${leadId}/emails`,
      );
      return res.emails;
    },
    enabled: !!leadId,
  });
}
