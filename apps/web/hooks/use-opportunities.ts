'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi, type CRMOpportunity } from '@/lib/api';

export function useOpportunities(pipelineId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['opportunities', pipelineId],
    queryFn: async () => {
      const response = await crmApi.getOpportunities(
        pipelineId ? { pipeline_id: pipelineId } : undefined
      );
      return response.opportunities;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CRMOpportunity> }) =>
      crmApi.updateOpportunity(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CRMOpportunity>) =>
      crmApi.createOpportunity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });

  const moveToStageMutation = useMutation({
    mutationFn: ({ id, stage_id }: { id: string; stage_id: number }) =>
      crmApi.moveOpportunityToStage(id, stage_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });

  const moveOpportunity = async (opportunityId: string, newStageId: string) => {
    await moveToStageMutation.mutateAsync({
      id: opportunityId,
      stage_id: parseInt(newStageId),
    });
  };

  return {
    opportunities: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    moveOpportunity,
    createOpportunity: createMutation.mutate,
    updateOpportunity: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: ['opportunity', id],
    queryFn: async () => {
      const response = await crmApi.getOpportunities();
      return response.opportunities.find(o => o.id === id) || null;
    },
    enabled: !!id,
  });
}
