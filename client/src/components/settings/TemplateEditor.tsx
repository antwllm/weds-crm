import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TipTapEditor, type TipTapEditorHandle } from '@/components/inbox/TipTapEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  type EmailTemplate,
} from '@/hooks/useSettings';

const AVAILABLE_VARIABLES = [
  '{{nom}}',
  '{{date_evenement}}',
  '{{budget}}',
  '{{email}}',
  '{{telephone}}',
];

interface TemplateFormData {
  name: string;
  subject: string;
  body: string;
}

export function TemplateEditor() {
  const { data: templates = [], isLoading } = useTemplates();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<TemplateFormData>({
    name: '',
    subject: '',
    body: '',
  });

  const editorRef = useRef<TipTapEditorHandle>(null);

  function startCreate() {
    setEditingId(null);
    setIsCreating(true);
    setForm({ name: '', subject: '', body: '' });
    editorRef.current?.setContent('');
  }

  function startEdit(template: EmailTemplate) {
    setIsCreating(false);
    setEditingId(template.id);
    const body = template.body || '';
    setForm({
      name: template.name,
      subject: template.subject || '',
      body,
    });
    editorRef.current?.setContent(body);
  }

  function cancelEdit() {
    setEditingId(null);
    setIsCreating(false);
    setForm({ name: '', subject: '', body: '' });
    editorRef.current?.setContent('');
  }

  function insertVariable(variable: string) {
    editorRef.current?.insertContent(variable);
  }

  async function handleSave() {
    if (!form.name.trim()) return;

    if (isCreating) {
      await createMutation.mutateAsync({
        name: form.name,
        subject: form.subject,
        body: form.body,
        variables: AVAILABLE_VARIABLES.map((v) => v.replace(/\{\{|\}\}/g, '')),
      });
      setIsCreating(false);
    } else if (editingId !== null) {
      await updateMutation.mutateAsync({
        id: editingId,
        data: {
          name: form.name,
          subject: form.subject,
          body: form.body,
        },
      });
      setEditingId(null);
    }
    setForm({ name: '', subject: '', body: '' });
    editorRef.current?.setContent('');
  }

  async function handleDelete(id: number) {
    await deleteMutation.mutateAsync(id);
    if (editingId === id) {
      cancelEdit();
    }
  }

  const isEditing = isCreating || editingId !== null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      {/* Template list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            Modèles ({templates.length})
          </h3>
          <Button size="sm" variant="outline" onClick={startCreate}>
            <Plus className="size-4" />
            Nouveau modèle
          </Button>
        </div>

        {templates.length === 0 && !isCreating && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun modèle. Cliquez sur &quot;Nouveau modèle&quot; pour commencer.
          </p>
        )}

        {templates.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer p-3 transition-colors hover:bg-muted/50 ${
              editingId === template.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => startEdit(template)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{template.name}</p>
                {template.subject && (
                  <p className="truncate text-sm text-muted-foreground">
                    {template.subject}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(template);
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    render={
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-7 p-0 text-destructive hover:text-destructive"
                      />
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer le modèle</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer &quot;{template.name}
                        &quot; ? Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() => handleDelete(template.id)}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Editor panel */}
      <div>
        {isEditing ? (
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">
              {isCreating ? 'Nouveau modèle' : 'Modifier le modèle'}
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nom du modèle</label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Premier contact"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Objet</label>
              <Input
                value={form.subject}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, subject: e.target.value }))
                }
                placeholder="Ex: Re: Votre demande de devis"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Corps du message</label>
              <div className="rounded-md border">
                <TipTapEditor
                  ref={editorRef}
                  content={form.body}
                  onUpdate={(html) =>
                    setForm((prev) => ({ ...prev, body: html }))
                  }
                  placeholder="Bonjour {{nom}}, Merci pour votre demande..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Variables disponibles
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_VARIABLES.map((variable) => (
                  <Badge
                    key={variable}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => insertVariable(variable)}
                  >
                    {variable}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Cliquez sur une variable pour l&apos;insérer dans le corps du
                message
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving || !form.name.trim()}>
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-16">
            <p className="text-sm text-muted-foreground">
              Sélectionnez un modèle ou créez-en un nouveau
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
