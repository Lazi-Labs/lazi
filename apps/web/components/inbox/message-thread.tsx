'use client';

import { useEffect, useRef } from 'react';
import { useMessages } from '@/hooks/use-messages';
import { useConversation } from '@/hooks/use-conversations';
import { useSocket } from '@/hooks/use-socket';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Contact } from '@/types';

interface MessageThreadProps {
  conversationId: string;
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const { messages, isLoading, sendMessage, isSending, refetch } = useMessages(conversationId);
  const { data: conversation } = useConversation(conversationId);
  const { socket } = useSocket();
  const bottomRef = useRef<HTMLDivElement>(null);

  const contact = conversation?.contact as Contact | undefined;
  const contactName = contact?.displayName || contact?.firstName || 'Unknown';
  const initials = contactName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Subscribe to conversation updates
  useEffect(() => {
    if (socket && conversationId) {
      socket.emit('conversation:subscribe', { conversationId });

      const handleNewMessage = () => {
        refetch();
      };

      socket.on('message:new', handleNewMessage);

      return () => {
        socket.emit('conversation:unsubscribe', { conversationId });
        socket.off('message:new', handleNewMessage);
      };
    }
  }, [socket, conversationId, refetch]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (data: { channel: 'sms' | 'email'; body: string; subject?: string }) => {
    if (!contact?.id) return;
    sendMessage({
      contactId: contact.id,
      ...data,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{contactName}</h3>
          <p className="text-sm text-muted-foreground">
            {contact?.email || contact?.phone || 'No contact info'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <Skeleton className="h-16 w-64 rounded-lg" />
              </div>
            ))
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        isSending={isSending}
        defaultChannel={conversation?.channel === 'email' ? 'email' : 'sms'}
      />
    </div>
  );
}
