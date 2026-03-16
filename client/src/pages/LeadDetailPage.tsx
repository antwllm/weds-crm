import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Loader2, RefreshCw, Upload, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
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
import { useLeads, useDeleteLead, useUpdateLead } from '@/hooks/useLeads';
import { syncLeadToPipedrive } from '@/lib/api';
import { PIPELINE_STAGES } from '@/lib/constants';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const leadId = Number(id);

  const { data: leads, isLoading } = useLeads({ includeArchived: 'true' });
  const deleteLead = useDeleteLead();
  const updateLead = useUpdateLead();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const lead = leads?.find((l) => l.id === leadId);

  function handleStatusChange(newStatus: string | null) {
    if (!newStatus || !lead) return;
    updateLead.mutate(
      { id: leadId, data: { status: newStatus } },
      {
        onSuccess: () => {
          toast.success('Statut mis a jour');
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        },
        onError: () => toast.error('Erreur lors de la mise a jour du statut'),
      }
    );
  }

  async function handleSync() {
    setIsSyncing(true);
    try {
      await syncLeadToPipedrive(leadId);
      toast.success('Synchronisation Pipedrive réussie');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch {
      toast.error('Échec de la synchronisation Pipedrive');
    } finally {
      setIsSyncing(false);
    }
  }

  function handleArchiveToggle() {
    if (!lead) return;
    const newArchived = !lead.archived;
    updateLead.mutate(
      { id: leadId, data: { archived: newArchived } as any },
      {
        onSuccess: () => {
          toast.success(newArchived ? 'Lead archive' : 'Lead desarchive');
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        },
        onError: () => toast.error('Erreur lors de l\'archivage'),
      }
    );
  }

  function handleDelete() {
    deleteLead.mutate(leadId, {
      onSuccess: () => {
        toast.success('Lead supprimé');
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
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/pipeline"
            className="rounded-md p-1 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">{lead.name}</h1>
          <Select value={lead.status || 'nouveau'} onValueChange={handleStatusChange}>
            <SelectTrigger className="border-none shadow-none p-0 h-auto focus:ring-0">
              <SelectValue>
                {(() => {
                  const stage = PIPELINE_STAGES.find((s) => s.value === (lead.status || 'nouveau'));
                  return stage ? (
                    <Badge variant="secondary" className={`text-xs ${stage.color}`}>
                      {stage.label}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">{lead.status}</Badge>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  <Badge variant="secondary" className={`text-xs ${stage.color}`}>
                    {stage.label}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {lead.archived ? (
            <Button variant="outline" size="sm" onClick={handleArchiveToggle}>
              <ArchiveRestore className="h-4 w-4" data-icon="inline-start" />
              Restaurer
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button variant="outline" size="sm">
                    <Archive className="h-4 w-4" data-icon="inline-start" />
                    Archiver
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archiver ce lead ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le lead sera masque du pipeline mais restera accessible via le filtre &quot;Afficher les archives&quot; en vue liste.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchiveToggle}>
                    Archiver
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" data-icon="inline-start" />
            ) : lead.pipedriveDealId ? (
              <RefreshCw className="h-4 w-4" data-icon="inline-start" />
            ) : (
              <Upload className="h-4 w-4" data-icon="inline-start" />
            )}
            {isSyncing
              ? 'Synchronisation...'
              : lead.pipedriveDealId
                ? 'Re-synchroniser Pipedrive'
                : 'Envoyer vers Pipedrive'}
          </Button>

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
                Cette action est irréversible. Toutes les activités et notes
                associées seront également supprimées.
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
      </div>

      {/* Lead detail content */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <LeadDetail lead={lead} />
      </div>
    </div>
  );
}
