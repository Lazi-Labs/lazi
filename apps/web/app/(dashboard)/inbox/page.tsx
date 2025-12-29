'use client';

import { useState } from 'react';
import { ConversationList, MessageThread } from '@/components/inbox';
import { BuilderSection } from '@/components/builder';
import { PageHeader } from '@/components/shared';

export default function InboxPage() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <BuilderSection>
        <PageHeader 
          title="Inbox" 
          description="Manage all your conversations in one place"
        />
      </BuilderSection>

      <div className="flex h-[calc(100vh-220px)] rounded-lg border bg-background overflow-hidden">
        <div className="w-80 shrink-0">
          <ConversationList
            activeId={activeConversationId || undefined}
            onSelect={setActiveConversationId}
          />
        </div>

        <div className="flex-1">
          {activeConversationId ? (
            <MessageThread conversationId={activeConversationId} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a conversation to view messages
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
