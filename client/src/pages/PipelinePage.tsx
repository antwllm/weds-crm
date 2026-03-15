import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ViewToggle } from '@/components/common/ViewToggle';
import { FilterBar } from '@/components/common/FilterBar';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';
import { ListView } from '@/components/pipeline/ListView';
import { useLeads } from '@/hooks/useLeads';
import { useUserPreferences, useSavePreferences } from '@/hooks/useUserPreferences';
import type { LeadFilters } from '@/types';

type View = 'board' | 'list';

export function PipelinePage() {
  const [view, setView] = useState<View>('board');
  const [filters, setFilters] = useState<LeadFilters>({});
  const [sortBy, setSortBy] = useState<'createdAt' | 'eventDate'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  const { data: leads = [], isLoading } = useLeads(filters);
  const { data: savedPrefs } = useUserPreferences();
  const savePrefs = useSavePreferences();
  const navigate = useNavigate();

  // Debounce ref for saving preferences
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed state from saved preferences on first load
  useEffect(() => {
    if (savedPrefs && !prefsLoaded) {
      if (savedPrefs.filters) {
        setFilters(savedPrefs.filters);
      }
      if (savedPrefs.sortBy) {
        setSortBy(savedPrefs.sortBy);
      }
      if (savedPrefs.sortDirection) {
        setSortDirection(savedPrefs.sortDirection);
      }
      setPrefsLoaded(true);
    }
  }, [savedPrefs, prefsLoaded]);

  // Debounced save of preferences
  const debouncedSave = useCallback(
    (newFilters: LeadFilters, newSortBy: 'createdAt' | 'eventDate', newSortDir: 'asc' | 'desc') => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        savePrefs.mutate({
          filters: newFilters,
          sortBy: newSortBy,
          sortDirection: newSortDir,
        });
      }, 500);
    },
    [savePrefs],
  );

  const handleFiltersChange = (newFilters: LeadFilters) => {
    setFilters(newFilters);
    if (prefsLoaded) {
      debouncedSave(newFilters, sortBy, sortDirection);
    }
  };

  const handleSortChange = (newSortBy: 'createdAt' | 'eventDate', newSortDir: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortDirection(newSortDir);
    if (prefsLoaded) {
      debouncedSave(filters, newSortBy, newSortDir);
    }
  };

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
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      ) : view === 'board' ? (
        <KanbanBoard leads={leads} sortBy={sortBy} sortDirection={sortDirection} />
      ) : (
        <ListView leads={leads} />
      )}
    </div>
  );
}
