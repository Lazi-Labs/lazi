'use client';

import { useQuery } from '@tanstack/react-query';
import { crmApi, type CRMPipeline, type CRMPipelineStage } from '@/lib/api';

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const response = await crmApi.getPipelines();
      // Transform to match expected format for compatibility
      return {
        docs: response.pipelines,
        totalDocs: response.pipelines.length,
        limit: 100,
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    },
  });
}

export function usePipeline(id: string) {
  return useQuery({
    queryKey: ['pipeline', id],
    queryFn: async () => {
      const response = await crmApi.getPipelines();
      return response.pipelines.find(p => p.id === id) || null;
    },
    enabled: !!id,
  });
}

export function usePipelineStages(pipelineId: string) {
  return useQuery({
    queryKey: ['pipeline-stages', pipelineId],
    queryFn: async () => {
      const response = await crmApi.getPipelines();
      const pipeline = response.pipelines.find(p => p.id === pipelineId);
      const stages = pipeline?.stages || [];
      return {
        docs: stages,
        totalDocs: stages.length,
        limit: 100,
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    },
    enabled: !!pipelineId,
  });
}

export function usePipelineStats(pipelineId: string) {
  return useQuery({
    queryKey: ['pipeline-stats', pipelineId],
    queryFn: async () => {
      const response = await crmApi.getPipelineStats(pipelineId);
      return response.stats;
    },
    enabled: !!pipelineId,
  });
}
