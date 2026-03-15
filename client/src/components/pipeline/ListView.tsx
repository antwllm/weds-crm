import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SourceBadge } from '@/components/leads/SourceBadge';
import { PIPELINE_STAGES } from '@/lib/constants';
import type { Lead } from '@/types';

interface ListViewProps {
  leads: Lead[];
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

const columns: ColumnDef<Lead>[] = [
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
    header: 'T\u00e9l\u00e9phone',
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
        Date \u00e9v\u00e9nement
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
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => {
      const source = row.getValue('source') as string | null;
      return source ? <SourceBadge source={source} /> : '-';
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
        Date cr\u00e9ation
        <ArrowUpDown className="size-3" />
      </button>
    ),
    cell: ({ row }) => formatDate(row.getValue('createdAt')),
  },
];

export function ListView({ leads }: ListViewProps) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);

  // Hide email and phone columns on mobile
  const columnVisibility = useMemo((): VisibilityState => {
    if (typeof window === 'undefined') return {};
    const isMobile = window.innerWidth < 768;
    return isMobile
      ? { email: false, phone: false }
      : {};
  }, []);

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
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
                className="cursor-pointer border-b transition-colors hover:bg-muted/50"
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
  );
}
