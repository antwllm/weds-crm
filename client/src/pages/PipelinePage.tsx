import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewToggle } from '@/components/common/ViewToggle';
import { FilterBar } from '@/components/common/FilterBar';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';
import { ListView } from '@/components/pipeline/ListView';
import { useLeads } from '@/hooks/useLeads';
import type { LeadFilters } from '@/types';

type View = 'board' | 'list';

export function PipelinePage() {
  const [view, setView] = useState<View>('board');
  const [filters, setFilters] = useState<LeadFilters>({});
  const { data: leads = [], isLoading } = useLeads(filters);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onViewChange={setView} />
          <Button onClick={() => navigate('/leads/new')}>
            <Plus className="size-4" data-icon="inline-start" />
            Nouveau lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      ) : view === 'board' ? (
        <KanbanBoard leads={leads} />
      ) : (
        <ListView leads={leads} />
      )}
    </div>
  );
}
