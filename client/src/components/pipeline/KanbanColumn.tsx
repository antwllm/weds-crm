import { Component, type ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { LeadCard } from './LeadCard';
import type { Lead } from '@/types';
import type { PipelineStage } from '@/lib/constants';

class CardErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="rounded-lg border p-2 text-xs text-destructive">Erreur d'affichage</div>;
    return this.props.children;
  }
}

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
}

function SortableLeadCard({ lead }: { lead: Lead }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <LeadCard
      lead={lead}
      isDragging={isDragging}
      style={style}
      dragRef={setNodeRef}
      dragAttributes={attributes as unknown as Record<string, unknown>}
      dragListeners={listeners}
    />
  );
}

export function KanbanColumn({ stage, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value });

  const leadIds = leads.map((l) => l.id);

  return (
    <div className="flex w-[280px] shrink-0 flex-col">
      {/* Column header */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold">{stage.label}</span>
        <Badge variant="secondary" className="text-xs">
          {leads.length}
        </Badge>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? 'border-primary/50 bg-primary/5' : 'border-border'
        }`}
        style={{ minHeight: '200px', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}
      >
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Aucun lead
            </p>
          ) : (
            leads.map((lead) => (
              <CardErrorBoundary key={lead.id}>
                <SortableLeadCard lead={lead} />
              </CardErrorBoundary>
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
