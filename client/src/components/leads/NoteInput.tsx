import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useCreateNote } from '@/hooks/useActivities';
import { toast } from 'sonner';

interface NoteInputProps {
  leadId: number;
}

export function NoteInput({ leadId }: NoteInputProps) {
  const [content, setContent] = useState('');
  const createNote = useCreateNote(leadId);

  function handleSubmit() {
    if (!content.trim()) return;
    createNote.mutate(
      { content: content.trim() },
      {
        onSuccess: () => {
          setContent('');
          toast.success('Note ajout\u00e9e');
        },
        onError: () => {
          toast.error("Erreur lors de l'ajout de la note");
        },
      }
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Ajouter une note..."
        className="text-sm"
      />
      <Button
        onClick={handleSubmit}
        disabled={!content.trim() || createNote.isPending}
        size="sm"
      >
        {createNote.isPending ? 'Ajout...' : 'Ajouter'}
      </Button>
    </div>
  );
}
