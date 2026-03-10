import { InlineField } from '@/components/leads/InlineField';
import { ActivityTimeline } from '@/components/leads/ActivityTimeline';
import { NoteInput } from '@/components/leads/NoteInput';
import { useUpdateLead } from '@/hooks/useLeads';
import { useActivities } from '@/hooks/useActivities';
import { PIPELINE_STAGES, SOURCE_BADGES } from '@/lib/constants';
import { toast } from 'sonner';
import type { Lead } from '@/types';

interface LeadDetailProps {
  lead: Lead;
}

export function LeadDetail({ lead }: LeadDetailProps) {
  const updateLead = useUpdateLead();
  const { data: activities = [] } = useActivities(lead.id);

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
    const newFirst = part === 'first' ? value.trim() : firstName;
    const newLast = part === 'last' ? value.trim() : lastName;
    const fullName = `${newFirst} ${newLast}`.trim();
    handleSave('name', fullName);
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
          type="text"
          placeholder="Ex: 15 juin 2026"
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

      {/* Right column: Activity timeline + Note input */}
      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Historique
          </h3>
          <ActivityTimeline activities={activities} />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Notes
          </h3>
          <NoteInput leadId={lead.id} />
        </div>
      </div>
    </div>
  );
}
