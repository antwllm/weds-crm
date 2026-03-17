import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useWhatsAppAgentConfig, useUpdateWhatsAppAgentConfig } from '@/hooks/useSettings';

const WA_VARIABLES = [
  '{{nom}}',
  '{{date_evenement}}',
  '{{statut}}',
  '{{budget}}',
  '{{historique_whatsapp}}',
];

export function WhatsAppAgentSettings() {
  const { data: config, isLoading } = useWhatsAppAgentConfig();
  const updateMutation = useUpdateWhatsAppAgentConfig();

  const [promptTemplate, setPromptTemplate] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [model, setModel] = useState('anthropic/claude-sonnet-4');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setPromptTemplate(config.promptTemplate || '');
      setKnowledgeBase(config.knowledgeBase || '');
      setModel(config.model || 'anthropic/claude-sonnet-4');
      setHasChanges(false);
    }
  }, [config]);

  function handleChange(setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setHasChanges(true);
    };
  }

  async function handleSave() {
    await updateMutation.mutateAsync({
      promptTemplate,
      knowledgeBase: knowledgeBase || undefined,
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
        <label htmlFor="wa-prompt" className="text-sm font-medium">
          Prompt systeme WhatsApp
        </label>
        <Textarea
          id="wa-prompt"
          value={promptTemplate}
          onChange={(e) => handleChange(setPromptTemplate)(e.target.value)}
          rows={10}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Variables disponibles</label>
        <div className="flex flex-wrap gap-2">
          {WA_VARIABLES.map((variable) => (
            <Badge key={variable} variant="secondary">
              {variable}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Ces variables seront remplacees par les donnees du lead lors de la generation
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="wa-knowledge" className="text-sm font-medium">
          Base de connaissances
        </label>
        <Textarea
          id="wa-knowledge"
          value={knowledgeBase}
          onChange={(e) => handleChange(setKnowledgeBase)(e.target.value)}
          rows={8}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Informations sur vos prestations, style, equipe et deroulement que l&apos;agent peut communiquer aux prospects
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="wa-model" className="text-sm font-medium">
          Modele IA (OpenRouter)
        </label>
        <Input
          id="wa-model"
          value={model}
          onChange={(e) => handleChange(setModel)(e.target.value)}
          placeholder="anthropic/claude-sonnet-4"
        />
        <p className="text-xs text-muted-foreground">
          Identifiant du modele sur OpenRouter (ex: anthropic/claude-sonnet-4)
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

      {/* Langfuse sync status */}
      <div className="space-y-1 rounded-md border p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Langfuse :</span>
          {config?.langfuseSyncedAt ? (
            <Badge variant="secondary" className="gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Synchronise le{' '}
              {new Date(config.langfuseSyncedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-400" />
              Non synchronise
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Prompt : {config?.langfusePromptName || 'whatsapp-agent-prompt'}
        </p>
        {!hasChanges && (!config?.langfuseSyncedAt || (config.updatedAt && config.langfuseSyncedAt && new Date(config.langfuseSyncedAt) < new Date(config.updatedAt))) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending || !promptTemplate.trim()}
            className="mt-1"
          >
            {updateMutation.isPending ? 'Synchronisation...' : 'Synchroniser maintenant'}
          </Button>
        )}
      </div>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending || !hasChanges || !promptTemplate.trim()}
      >
        {updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
      </Button>
    </div>
  );
}
