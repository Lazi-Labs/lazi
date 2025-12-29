'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi, type CRMContact } from '@/lib/api';

export function useContacts(params?: { search?: string; stage?: string; limit?: number; offset?: number }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['contacts', params],
    queryFn: () => crmApi.getContacts(params),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CRMContact> }) =>
      crmApi.updateContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const moveToStageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      crmApi.moveContactToStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  return {
    contacts: query.data?.data ?? [],
    totalDocs: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateContact: updateMutation.mutate,
    moveContactToStage: moveToStageMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const response = await crmApi.getContact(id);
      return response.contact;
    },
    enabled: !!id,
  });
}
