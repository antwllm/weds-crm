import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAiPrompt, useUpdateAiPrompt } from '@/hooks/useSettings';

const AI_VARIABLES = [
  '{{nom}}',
  '{{date_evenement}}',
  '{{budget}}',
  '{{email}}',
  '{{telephone}}',
  '{{historique_emails}}',
  '{{notes}}',
];

const DEFAULT_PLACEHOLDER = `Tu es un photographe de mariage professionnel base en France. Tu reponds aux demandes de couples qui souhaitent des informations sur tes services.

Informations du lead :
- Nom : {{nom}}
- Date : {{date_evenement}}
- Budget : {{budget}}
- Email : {{email}}
- Telephone : {{telephone}}

Historique des echanges :
{{historique_emails}}

Notes :
{{notes}}

Redige une reponse chaleureuse et professionnelle.`;

export function AiPromptEditor() {
  const { data: config, isLoading } = useAiPrompt();
  const updateMutation = useUpdateAiPrompt();

  const [promptTemplate, setPromptTemplate] = useState('');
  const [model, setModel] = useState('anthropic/claude-sonnet-4');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setPromptTemplate(config.promptTemplate || '');
      setModel(config.model || 'anthropic/claude-sonnet-4');
      setHasChanges(false);
    }
  }, [config]);

  function handlePromptChange(value: string) {
    setPromptTemplate(value);
    setHasChanges(true);
  }

  function handleModelChange(value: string) {
    setModel(value);
    setHasChanges(true);
  }

  async function handleSave() {
    await updateMutation.mutateAsync({
      promptTemplate,
      model,
    });
    setHasChanges(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Prompt systeme</label>
        <Textarea
          value={promptTemplate}
          onChange={(e) => handlePromptChange(e.target.value)}
          placeholder={DEFAULT_PLACEHOLDER}
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Variables disponibles</label>
        <div className="flex flex-wrap gap-1.5">
          {AI_VARIABLES.map((variable) => (
            <Badge key={variable} variant="secondary">
              {variable}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Ces variables seront remplacees par les donnees du lead lors de la
          generation
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Modele IA (OpenRouter)</label>
        <Input
          value={model}
          onChange={(e) => handleModelChange(e.target.value)}
          placeholder="anthropic/claude-sonnet-4"
        />
        <p className="text-xs text-muted-foreground">
          Identifiant du modele sur OpenRouter (ex: anthropic/claude-sonnet-4,
          google/gemini-2.5-pro)
        </p>
      </div>

      {config?.updatedAt && (
        <p className="text-xs text-muted-foreground">
          Derniere mise a jour :{' '}
          {new Date(config.updatedAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending || !hasChanges || !promptTemplate.trim()}
      >
        {updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
      </Button>
    </div>
  );
}
