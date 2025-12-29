'use client';

import { usePipeline } from '@/hooks/use-pipeline';
import { useOpportunities } from '@/hooks/use-opportunities';
import { useMemo, useCallback } from 'react';
import type { Task as KanbanTask } from './kanban-board';
import type { CRMOpportunity } from '@/lib/api';

export interface UsePipelineKanbanReturn {
  columns: Record<string, KanbanTask[]>;
  columnTitles: Record<string, string>;
  columnOrder: string[];
  isLoading: boolean;
  onColumnsChange: (newColumns: Record<string, KanbanTask[]>) => Promise<void>;
  onMoveOpportunity: (opportunityId: string, newStageId: string) => Promise<void>;
}

export function usePipelineKanban(pipelineId: string): UsePipelineKanbanReturn {
  // Get data from existing React Query hooks
  const { data: pipeline, isLoading: isPipelineLoading } = usePipeline(pipelineId);
  const { 
    opportunities = [], 
    isLoading: isOpportunitiesLoading,
    moveOpportunity: moveOpportunityMutation,
  } = useOpportunities(pipelineId);

  const stages = pipeline?.stages || [];
  const isLoading = isPipelineLoading || isOpportunitiesLoading;

  // Transform pipeline data to Kanban format
  const { columns, columnTitles, columnOrder } = useMemo(() => {
    const kanbanColumns: Record<string, KanbanTask[]> = {};
    const titles: Record<string, string> = {};
    const order: string[] = [];

    // Sort stages by their position if available
    const sortedStages = [...stages].sort((a, b) => {
      const aPos = (a as any).position || (a as any).order || 0;
      const bPos = (b as any).position || (b as any).order || 0;
      return aPos - bPos;
    });

    sortedStages.forEach((stage) => {
      const stageKey = String(stage.id);
      order.push(stageKey);
      titles[stageKey] = stage.name;

      // Filter opportunities for this stage and transform to KanbanTask
      kanbanColumns[stageKey] = opportunities
        .filter((opp: CRMOpportunity) => String(opp.stage_id) === stageKey)
        .map((opp: CRMOpportunity) => ({
          id: String(opp.id),
          title: opp.contact_name || opp.name || 'Untitled Opportunity',
          description: opp.description || `$${(opp.value || 0).toLocaleString()}`,
          priority: mapPriority(opp.status),
          assignee: '',
          dueDate: opp.expected_close_date || '',
          progress: calculateProgress(opp),
          attachments: 0,
          comments: 0,
          users: [],
        }));
    });

    return { columns: kanbanColumns, columnTitles: titles, columnOrder: order };
  }, [stages, opportunities]);

  // Handle when columns change (drag and drop)
  const onColumnsChange = useCallback(async (newColumns: Record<string, KanbanTask[]>) => {
    // Find opportunities that moved to different columns
    for (const [stageId, tasks] of Object.entries(newColumns)) {
      for (const task of tasks) {
        // Check if this task was in a different column before
        const originalStageId = findOriginalStage(task.id, columns);
        if (originalStageId && originalStageId !== stageId) {
          // Task moved to new stage - update backend
          try {
            await moveOpportunityMutation(task.id, stageId);
          } catch (error) {
            console.error('Failed to move opportunity:', error);
          }
        }
      }
    }
  }, [columns, moveOpportunityMutation]);

  // Direct move function for single opportunity
  const onMoveOpportunity = useCallback(async (opportunityId: string, newStageId: string) => {
    try {
      await moveOpportunityMutation(opportunityId, newStageId);
    } catch (error) {
      console.error('Failed to move opportunity:', error);
      throw error;
    }
  }, [moveOpportunityMutation]);

  return {
    columns,
    columnTitles,
    columnOrder,
    isLoading,
    onColumnsChange,
    onMoveOpportunity,
  };
}

// Helper functions

function mapPriority(priority: string | number | undefined): "low" | "medium" | "high" {
  if (!priority) return "medium";
  const p = String(priority).toLowerCase();
  if (p === "high" || p === "3" || p === "urgent") return "high";
  if (p === "low" || p === "1") return "low";
  return "medium";
}

function calculateProgress(opp: CRMOpportunity): number {
  // For now, return 0 - can be enhanced based on opportunity status
  // Could map status to progress: new=0, qualified=25, proposal=50, negotiation=75, won=100
  const statusMap: Record<string, number> = {
    'new': 0,
    'qualified': 25,
    'proposal': 50,
    'negotiation': 75,
    'won': 100,
    'lost': 0,
  };
  return statusMap[opp.status?.toLowerCase() || 'new'] || 0;
}

function formatUsers(assignees: any[]): Array<{ name: string; src: string; fallback?: string }> {
  if (!Array.isArray(assignees) || assignees.length === 0) return [];
  
  return assignees.map((user) => {
    const name = user.name || user.fullName || user.full_name || 'Unknown';
    const nameParts = name.split(' ');
    const initials = nameParts.length >= 2 
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
    
    return {
      name,
      src: user.avatar || user.avatarUrl || user.avatar_url || user.image || '',
      fallback: initials,
    };
  });
}

function findOriginalStage(taskId: string, columns: Record<string, KanbanTask[]>): string | null {
  for (const [stageId, tasks] of Object.entries(columns)) {
    if (tasks.some((t) => t.id === taskId)) {
      return stageId;
    }
  }
  return null;
}
