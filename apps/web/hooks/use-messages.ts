'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Message, PaginatedResponse } from '@/types';

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () =>
      api.get<PaginatedResponse<Message>>(
        `/messages?where[conversation][equals]=${conversationId}&sort=createdAt&limit=100`
      ),
    enabled: !!conversationId,
  });

  const sendMutation = useMutation({
    mutationFn: (data: { contactId: string; channel: 'sms' | 'email'; body: string; subject?: string }) =>
      api.post('/messages/send', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return {
    messages: query.data?.docs ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
  };
}
