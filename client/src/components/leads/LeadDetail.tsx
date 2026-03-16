import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { InlineField } from '@/components/leads/InlineField';
import { ActivityTimeline } from '@/components/leads/ActivityTimeline';
import { NoteInput } from '@/components/leads/NoteInput';
import { LeadEmails } from '@/components/leads/LeadEmails';
import { WhatsAppChat } from '@/components/whatsapp/WhatsAppChat';
import { Button } from '@/components/ui/button';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUpdateLead } from '@/hooks/useLeads';
import { useActivities } from '@/hooks/useActivities';
import { SOURCE_BADGES } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import type { Lead } from '@/types';

const budgetFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

interface LeadDetailProps {
  lead: Lead;
}

export function LeadDetail({ lead }: LeadDetailProps) {
  const updateLead = useUpdateLead();
  const { data: activities = [] } = useActivities(lead.id);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftContent, setDraftContent] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('notes');

  const sourceOptions = [
    ...Object.entries(SOURCE_BADGES).map(([value, info]) => ({
      value,
      label: info.label,
    })),
  ];

  function handleSave(field: string, value: string) {
    const payload: Record<string, unknown> = {};

    if (field === 'budget') {
      payload[field] = value === '' ? null : Number(value);
    } else {
      payload[field] = value || null;
    }

    updateLead.mutate(
      { id: lead.id, data: payload },
      {
        onSuccess: () => toast.success('Modifications enregistrées'),
        onError: () => toast.error('Erreur lors de la sauvegarde'),
      }
    );
  }

  // Split stored "Prénom Nom" into two parts
  const nameParts = (lead.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  function handleNameSave(part: 'first' | 'last', value: string) {
    const trimmedValue = value.trim();
    // Re-read current name at save time to avoid stale closure
    const currentParts = (lead.name || '').split(' ');
    const currentFirst = currentParts[0] || '';
    const currentLast = currentParts.slice(1).join(' ') || '';
    const newFirst = part === 'first' ? trimmedValue : currentFirst;
    const newLast = part === 'last' ? trimmedValue : currentLast;
    const fullName = [newFirst, newLast].filter(Boolean).join(' ');
    if (fullName) {
      handleSave('name', fullName);
    }
  }

  async function handleGenerateDraft() {
    setIsGeneratingDraft(true);
    try {
      const res = await apiFetch<{ draft: string }>('/ai/generate-draft', {
        method: 'POST',
        body: JSON.stringify({ leadId: lead.id }),
      });
      setDraftContent(res.draft);
      setActiveTab('emails');
    } catch {
      toast.error('Erreur lors de la génération du brouillon');
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[320px_minmax(0,1fr)] gap-6 h-full min-h-0 overflow-hidden">
      {/* Left sidebar: Condensed fields + Activity timeline */}
      <div className="space-y-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0">
          <InlineField
            label="Prénom"
            value={firstName}
            onSave={(v) => handleNameSave('first', v)}
            type="text"
            placeholder="Prénom"
          />
          <InlineField
            label="Nom"
            value={lastName}
            onSave={(v) => handleNameSave('last', v)}
            type="text"
            placeholder="Nom"
          />
          <div className="col-span-2">
            <InlineField
              label="Email"
              value={lead.email || ''}
              onSave={(v) => handleSave('email', v)}
              type="email"
              placeholder="email@exemple.fr"
            />
          </div>
          <div className="col-span-2">
            <InlineField
              label="Téléphone"
              value={lead.phone || ''}
              onSave={(v) => handleSave('phone', v)}
              type="tel"
              placeholder="+33..."
            />
          </div>
          <InlineField
            label="Date de l'événement"
            value={lead.eventDate || ''}
            onSave={(v) => handleSave('eventDate', v)}
            type="date"
          />
          <div className="cursor-default rounded-md px-2 py-1.5 space-y-0.5">
            <span className="text-sm text-muted-foreground">Date de création</span>
            <div className="text-sm font-medium">
              {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('fr-FR') : '-'}
            </div>
          </div>
          <InlineField
            label="Source"
            value={lead.source || ''}
            onSave={(v) => handleSave('source', v)}
            type="select"
            options={sourceOptions}
          />
          <InlineField
            label="Budget"
            value={lead.budget != null ? String(lead.budget) : ''}
            onSave={(v) => handleSave('budget', v)}
            type="number"
            placeholder="0"
            displayValue={lead.budget != null ? budgetFormatter.format(lead.budget) : undefined}
          />
        </div>
        <InlineField
          label="Message"
          value={lead.message || ''}
          onSave={(v) => handleSave('message', v)}
          type="textarea"
          placeholder="Message du lead..."
        />

        {/* Activity timeline */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Historique
          </h3>
          <ActivityTimeline activities={activities} />
        </div>
      </div>

      {/* Right content area: Tabbed interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0 min-w-0 overflow-hidden">
        <TabsList className="shrink-0">
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="mt-4 flex-1 min-h-0 overflow-y-auto">
          <NoteInput leadId={lead.id} />
        </TabsContent>

        <TabsContent value="emails" className="mt-4 flex-1 min-h-0 min-w-0 overflow-y-auto">
          <div className="mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateDraft}
              disabled={isGeneratingDraft}
            >
              {isGeneratingDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
              ) : (
                <Sparkles className="h-4 w-4" data-icon="inline-start" />
              )}
              {isGeneratingDraft ? 'Génération...' : 'Générer un brouillon'}
            </Button>
          </div>
          <LeadEmails leadId={lead.id} leadEmail={lead.email ?? undefined} initialDraft={draftContent} />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4 flex-1 min-h-0 overflow-y-auto">
          <WhatsAppChat leadId={lead.id} leadPhone={lead.phone} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
