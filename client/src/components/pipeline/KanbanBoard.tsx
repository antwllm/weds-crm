import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { PIPELINE_STAGES } from '@/lib/constants';
import { useUpdateLeadStatus } from '@/hooks/useLeads';
import { KanbanColumn } from './KanbanColumn';
import { LeadCard } from './LeadCard';
import type { Lead } from '@/types';

interface KanbanBoardProps {
  leads: Lead[];
}

export function KanbanBoard({ leads }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const updateStatus = useUpdateLeadStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  // Group leads by status
  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const stage of PIPELINE_STAGES) {
      map[stage.value] = [];
    }
    for (const lead of leads) {
      const status = lead.status ?? 'nouveau';
      if (map[status]) {
        map[status].push(lead);
      } else {
        // Unknown status, default to nouveau
        map['nouveau'].push(lead);
      }
    }
    return map;
  }, [leads]);

  const activeLead = useMemo(
    () => (activeId != null ? leads.find((l) => l.id === activeId) : undefined),
    [activeId, leads],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  function handleDragOver(_event: DragOverEvent) {
    // Visual feedback handled by useDroppable isOver state
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);

    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as number;

    // Determine target column: over.id could be a column id (stage value)
    // or a lead id (dropped on another card)
    let targetStage: string | undefined;

    // Check if over.id is a stage value
    if (PIPELINE_STAGES.some((s) => s.value === over.id)) {
      targetStage = over.id as string;
    } else {
      // over.id is a lead id -- find which stage that lead belongs to
      const overLead = leads.find((l) => l.id === over.id);
      if (overLead) {
        targetStage = overLead.status ?? 'nouveau';
      }
    }

    if (!targetStage) return;

    // Find current lead status
    const currentLead = leads.find((l) => l.id === leadId);
    if (!currentLead || currentLead.status === targetStage) return;

    updateStatus.mutate({ id: leadId, status: targetStage });
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage.value}
            stage={stage}
            leads={leadsByStage[stage.value] ?? []}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
