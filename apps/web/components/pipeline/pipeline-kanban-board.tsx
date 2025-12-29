'use client';

import { usePipelineKanban } from './use-pipeline-kanban';
import KanbanBoard from './kanban-board';
import { Skeleton } from '@/components/ui/skeleton';

interface PipelineKanbanBoardProps {
  pipelineId: string;
}

export function PipelineKanbanBoard({ pipelineId }: PipelineKanbanBoardProps) {
  const {
    columns,
    columnTitles,
    columnOrder,
    isLoading,
    onColumnsChange,
  } = usePipelineKanban(pipelineId);

  if (isLoading) {
    return <PipelineKanbanSkeleton />;
  }

  return (
    <KanbanBoard
      initialColumns={columns}
      initialColumnTitles={columnTitles}
      initialColumnOrder={columnOrder}
      onColumnsChange={onColumnsChange}
      showFilters={false}
      showTabs={false}
      showAddBoard={false}
    />
  );
}

function PipelineKanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[340px]">
          <Skeleton className="h-12 w-full mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
