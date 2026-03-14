import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { InlineField } from '@/components/leads/InlineField';
import { ActivityTimeline } from '@/components/leads/ActivityTimeline';
import { NoteInput } from '@/components/leads/NoteInput';
import { LeadEmails } from '@/components/leads/LeadEmails';
import { WhatsAppChat } from '@/components/whatsapp/WhatsAppChat';
import { Button } from '@/components/ui/button';
import { useUpdateLead } from '@/hooks/useLeads';
import { useActivities } from '@/hooks/useActivities';
import { PIPELINE_STAGES, SOURCE_BADGES } from '@/lib/constants';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import type { Lead } from '@/types';

interface LeadDetailProps {
  lead: Lead;
}

export function LeadDetail({ lead }: LeadDetailProps) {
  const updateLead = useUpdateLead();
  const { data: activities = [] } = useActivities(lead.id);
  const navigate = useNavigate();
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  const stageOptions = PIPELINE_STAGES.map((s) => ({
    value: s.value,
    label: s.label,
  }));

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
        onSuccess: () => toast.success('Modifications enregistrees'),
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
    const newFirst = part === 'first' ? trimmedValue : firstName;
    const newLast = part === 'last' ? trimmedValue : lastName;
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
      navigate('/inbox', {
        state: {
          draft: res.draft,
          leadId: lead.id,
          leadEmail: lead.email,
        },
      });
    } catch {
      toast.error('Erreur lors de la generation du brouillon');
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Left column: Editable fields */}
      <div className="space-y-1">
        <div className="grid grid-cols-2 gap-4">
          <InlineField
            label="Prenom"
            value={firstName}
            onSave={(v) => handleNameSave('first', v)}
            type="text"
            placeholder="Prenom"
          />
          <InlineField
            label="Nom"
            value={lastName}
            onSave={(v) => handleNameSave('last', v)}
            type="text"
            placeholder="Nom"
          />
        </div>
        <InlineField
          label="Email"
          value={lead.email || ''}
          onSave={(v) => handleSave('email', v)}
          type="email"
          placeholder="email@exemple.fr"
        />
        <InlineField
          label="Telephone"
          value={lead.phone || ''}
          onSave={(v) => handleSave('phone', v)}
          type="tel"
          placeholder="+33..."
        />
        <InlineField
          label="Date de l'evenement"
          value={lead.eventDate || ''}
          onSave={(v) => handleSave('eventDate', v)}
          type="date"
        />
        <InlineField
          label="Budget"
          value={lead.budget != null ? String(lead.budget) : ''}
          onSave={(v) => handleSave('budget', v)}
          type="number"
          placeholder="0"
        />
        <InlineField
          label="Source"
          value={lead.source || ''}
          onSave={(v) => handleSave('source', v)}
          type="select"
          options={sourceOptions}
        />
        <InlineField
          label="Statut"
          value={lead.status || 'nouveau'}
          onSave={(v) => handleSave('status', v)}
          type="select"
          options={stageOptions}
        />
        <InlineField
          label="Message"
          value={lead.message || ''}
          onSave={(v) => handleSave('message', v)}
          type="textarea"
          placeholder="Message du lead..."
        />
      </div>

      {/* Right column: Notes, Emails, WhatsApp, Activity timeline */}
      <div className="space-y-6">
        {/* Notes */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Notes
          </h3>
          <NoteInput leadId={lead.id} />
        </div>

        {/* Emails */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Emails
            </h3>
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
              {isGeneratingDraft ? 'Generation...' : 'Generer un brouillon'}
            </Button>
          </div>
          <LeadEmails leadId={lead.id} />
        </div>

        {/* WhatsApp */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            WhatsApp
          </h3>
          <WhatsAppChat leadId={lead.id} leadPhone={lead.phone} />
        </div>

        {/* Activity timeline */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Historique d'activites
          </h3>
          <ActivityTimeline activities={activities} />
        </div>
      </div>
    </div>
  );
}
