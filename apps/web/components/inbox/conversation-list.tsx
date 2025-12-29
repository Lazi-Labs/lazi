'use client';

import { useConversations } from '@/hooks/use-conversations';
import { ConversationItem } from './conversation-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState } from 'react';

interface ConversationListProps {
  activeId?: string;
  onSelect: (id: string) => void;
}

export function ConversationList({ activeId, onSelect }: ConversationListProps) {
  const { conversations, isLoading } = useConversations();
  const [search, setSearch] = useState('');

  const filteredConversations = conversations.filter((conv) => {
    if (!search) return true;
    const contact = conv.contact as { displayName?: string; firstName?: string } | undefined;
    const name = contact?.displayName || contact?.firstName || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === activeId}
                onClick={() => onSelect(conversation.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
