'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { OpportunityCard } from './opportunity-card';
import type { PipelineStage, Opportunity } from '@/types';

interface KanbanColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  onOpportunityClick?: (opportunity: Opportunity) => void;
}

export function KanbanColumn({ stage, opportunities, onOpportunityClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const totalValue = opportunities.reduce((sum, o) => sum + (o.value || 0), 0);

  const formatValue = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col w-72 shrink-0',
        isOver && 'ring-2 ring-primary ring-offset-2 rounded-lg'
      )}
    >
      {/* Column Header - GHL Style */}
      <div className="mb-3">
        <h3 className="font-semibold text-sm text-foreground">{stage.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {opportunities.length} Opportunities · {formatValue(totalValue)}
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto min-h-[200px]">
        <SortableContext
          items={opportunities.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {opportunities.map((opportunity) => (
            <OpportunityCard 
              key={opportunity.id} 
              opportunity={opportunity}
              onClick={() => onOpportunityClick?.(opportunity)}
            />
          ))}
        </SortableContext>

        {opportunities.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border border-dashed rounded-lg">
            No opportunities
          </div>
        )}
      </div>
    </div>
  );
}
