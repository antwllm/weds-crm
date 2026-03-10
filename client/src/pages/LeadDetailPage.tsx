import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { LeadDetail } from '@/components/leads/LeadDetail';
import { useLeads, useDeleteLead } from '@/hooks/useLeads';
import { toast } from 'sonner';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const leadId = Number(id);

  const { data: leads, isLoading } = useLeads();
  const deleteLead = useDeleteLead();

  const lead = leads?.find((l) => l.id === leadId);

  function handleDelete() {
    deleteLead.mutate(leadId, {
      onSuccess: () => {
        toast.success('Lead supprime');
        navigate('/pipeline');
      },
      onError: () => {
        toast.error('Erreur lors de la suppression');
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Lead non trouve</p>
        <Link
          to="/pipeline"
          className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au pipeline
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/pipeline"
            className="rounded-md p-1 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">{lead.name}</h1>
        </div>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4" data-icon="inline-start" />
                Supprimer
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce lead ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irreversible. Toutes les activites et notes
                associees seront egalement supprimees.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteLead.isPending}
                variant="destructive"
              >
                {deleteLead.isPending ? 'Suppression...' : 'Supprimer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Lead detail content */}
      <LeadDetail lead={lead} />
    </div>
  );
}
