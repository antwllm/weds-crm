import { ArrowUp, ArrowDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PIPELINE_STAGES, SOURCE_BADGES } from '@/lib/constants';
import type { LeadFilters } from '@/types';

interface FilterBarProps {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
  sortBy: 'createdAt' | 'eventDate';
  sortDirection: 'asc' | 'desc';
  onSortChange: (sortBy: 'createdAt' | 'eventDate', sortDirection: 'asc' | 'desc') => void;
  showArchived?: boolean;
  onShowArchivedChange?: (show: boolean) => void;
}

const sourceOptions = Object.entries(SOURCE_BADGES).map(([value, { label }]) => ({
  value,
  label,
}));

export function FilterBar({ filters, onFiltersChange, sortBy, sortDirection, onSortChange, showArchived, onShowArchivedChange }: FilterBarProps) {
  const update = (patch: Partial<LeadFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status filter */}
      <Select
        value={filters.status ?? ''}
        onValueChange={(value) => update({ status: value || undefined })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Tous les statuts</SelectItem>
          {PIPELINE_STAGES.map((stage) => (
            <SelectItem key={stage.value} value={stage.value}>
              {stage.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Source filter */}
      <Select
        value={filters.source ?? ''}
        onValueChange={(value) => update({ source: value || undefined })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Toutes les sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Toutes les sources</SelectItem>
          {sourceOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date range */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Du</label>
        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => update({ dateFrom: e.target.value || undefined })}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Au</label>
        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => update({ dateTo: e.target.value || undefined })}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground">Trier par</label>
        <Select
          value={sortBy}
          onValueChange={(value) => onSortChange(value as 'createdAt' | 'eventDate', sortDirection)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Date de creation</SelectItem>
            <SelectItem value="eventDate">Date evenement</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => onSortChange(sortBy, sortDirection === 'asc' ? 'desc' : 'asc')}
          title={sortDirection === 'asc' ? 'Croissant' : 'Decroissant'}
        >
          {sortDirection === 'asc' ? (
            <ArrowUp className="size-4" />
          ) : (
            <ArrowDown className="size-4" />
          )}
        </Button>
      </div>

      {/* Archived toggle (list view only) */}
      {showArchived !== undefined && onShowArchivedChange && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => onShowArchivedChange(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          Afficher les archives
        </label>
      )}
    </div>
  );
}
