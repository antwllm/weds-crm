import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUpDown, Archive, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { PIPELINE_STAGES } from '@/lib/constants';
import { useBulkArchive, useBulkDelete, useBulkStatus } from '@/hooks/useLeads';
import { toast } from 'sonner';
import type { Lead } from '@/types';

interface ListViewProps {
  leads: Lead[];
  showArchived?: boolean;
}

const budgetFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'd MMM yyyy', { locale: fr });
  } catch {
    return dateStr;
  }
}

function getStageConfig(status: string | null) {
  return PIPELINE_STAGES.find((s) => s.value === status);
}

export function ListView({ leads, showArchived }: ListViewProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const bulkArchive = useBulkArchive();
  const bulkDelete = useBulkDelete();
  const bulkStatus = useBulkStatus();

  // Status for bulk status change confirmation
  const [pendingBulkStatus, setPendingBulkStatus] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="h-4 w-4 rounded border-input accent-primary"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-input accent-primary"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Nom
            <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('name')}</span>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.getValue('email') ?? '-',
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: 'phone',
        header: 'Telephone',
        cell: ({ row }) => row.getValue('phone') ?? '-',
        meta: { hideOnMobile: true },
      },
      {
        accessorKey: 'eventDate',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date evenement
            <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ row }) => formatDate(row.getValue('eventDate')),
      },
      {
        accessorKey: 'budget',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Budget
            <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ row }) => {
          const budget = row.getValue('budget') as number | null;
          return budget != null ? budgetFormatter.format(budget) : '-';
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Statut
            <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ row }) => {
          const status = row.getValue('status') as string | null;
          const stage = getStageConfig(status);
          if (!stage) return status ?? '-';
          return (
            <Badge variant="secondary" className={`text-xs ${stage.color}`}>
              {stage.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date creation
            <ArrowUpDown className="size-3" />
          </button>
        ),
        cell: ({ row }) => formatDate(row.getValue('createdAt')),
      },
    ],
    [],
  );

  // Hide email and phone columns on mobile
  const columnVisibility = useMemo((): VisibilityState => {
    if (typeof window === 'undefined') return {};
    const isMobile = window.innerWidth < 768;
    return isMobile ? { email: false, phone: false } : {};
  }, []);

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting, columnVisibility, rowSelection },
    getRowId: (row) => String(row.id),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedIds = Object.keys(rowSelection)
    .filter((key) => rowSelection[key])
    .map(Number);
  const selectedCount = selectedIds.length;

  function clearSelection() {
    setRowSelection({});
  }

  function handleBulkArchive() {
    bulkArchive.mutate(
      { ids: selectedIds, archived: true },
      {
        onSuccess: () => {
          toast.success(`${selectedCount} lead(s) archive(s)`);
          clearSelection();
        },
      },
    );
  }

  function handleBulkDelete() {
    bulkDelete.mutate(
      { ids: selectedIds },
      {
        onSuccess: () => {
          toast.success(`${selectedCount} lead(s) supprime(s)`);
          clearSelection();
        },
      },
    );
  }

  function handleBulkStatusChange(status: string) {
    const stage = PIPELINE_STAGES.find((s) => s.value === status);
    bulkStatus.mutate(
      { ids: selectedIds, status },
      {
        onSuccess: () => {
          toast.success(`Statut de ${selectedCount} lead(s) change en ${stage?.label ?? status}`);
          clearSelection();
          setPendingBulkStatus(null);
        },
      },
    );
  }

  return (
    <div>
      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/80 px-4 py-2 mb-2">
          <span className="text-sm font-medium">
            {selectedCount} lead(s) selectionne(s)
          </span>

          <div className="ml-auto flex items-center gap-2">
            {/* Archive */}
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
                  <AlertDialogTitle>Archiver {selectedCount} lead(s) ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Les leads archives seront masques du pipeline mais resteront accessibles via le filtre.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkArchive}>
                    Archiver
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Status change */}
            <Select
              value=""
              onValueChange={(value) => setPendingBulkStatus(value)}
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder="Changer statut" />
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
            <AlertDialog open={!!pendingBulkStatus} onOpenChange={(open) => { if (!open) setPendingBulkStatus(null); }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Changer le statut de {selectedCount} lead(s) en{' '}
                    {PIPELINE_STAGES.find((s) => s.value === pendingBulkStatus)?.label} ?
                  </AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setPendingBulkStatus(null)}>
                    Annuler
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={() => pendingBulkStatus && handleBulkStatusChange(pendingBulkStatus)}>
                    Confirmer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete */}
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
                  <AlertDialogTitle>Supprimer {selectedCount} lead(s) ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irreversible. Toutes les activites et notes associees seront egalement supprimees.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleBulkDelete}>
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  Aucun lead
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`cursor-pointer border-b transition-colors hover:bg-muted/50 ${
                    showArchived && row.original.archived ? 'opacity-50' : ''
                  }`}
                  onClick={() => navigate(`/leads/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
