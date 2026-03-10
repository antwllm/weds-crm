import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PIPELINE_STAGES, SOURCE_BADGES } from '@/lib/constants';
import type { LeadFilters } from '@/types';

interface FilterBarProps {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
}

const sourceOptions = Object.entries(SOURCE_BADGES).map(([value, { label }]) => ({
  value,
  label,
}));

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
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
    </div>
  );
}
