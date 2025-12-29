'use client';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Conversation, Contact } from '@/types';
import { format, isToday, isYesterday } from 'date-fns';
import { Mail, MessageSquare } from 'lucide-react';

interface ConversationItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onClick?: () => void;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'MMM d');
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const contact = conversation.contact as Contact | undefined;
  const contactName = contact?.displayName || contact?.firstName || 'Unknown';
  const initials = contactName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const hasUnread = (conversation.unreadCount || 0) > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left hover:bg-accent transition-colors rounded-lg',
        isActive && 'bg-accent',
        hasUnread && 'font-medium'
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{contactName}</span>
          {conversation.lastMessageAt && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDate(conversation.lastMessageAt)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {conversation.channel === 'email' ? (
            <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm text-muted-foreground truncate">
            {conversation.subject || 'No subject'}
          </span>
        </div>
      </div>

      {hasUnread && (
        <Badge variant="default" className="shrink-0">
          {conversation.unreadCount}
        </Badge>
      )}
    </button>
  );
}
