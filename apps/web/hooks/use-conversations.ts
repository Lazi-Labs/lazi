'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Conversation, PaginatedResponse } from '@/types';

export function useConversations(params?: { status?: string; limit?: number }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.status) {
        searchParams.set('where[status][equals]', params.status);
      }
      searchParams.set('limit', String(params?.limit || 50));
      searchParams.set('sort', '-lastMessageAt');
      return api.get<PaginatedResponse<Conversation>>(`/conversations?${searchParams.toString()}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Conversation> }) =>
      api.patch<Conversation>(`/conversations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return {
    conversations: query.data?.docs ?? [],
    totalDocs: query.data?.totalDocs ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    updateConversation: updateMutation.mutate,
  };
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api.get<Conversation>(`/conversations/${id}?depth=2`),
    enabled: !!id,
  });
}
