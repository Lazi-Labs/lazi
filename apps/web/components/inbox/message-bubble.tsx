'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Message } from '@/types';
import { format } from 'date-fns';
import { Mail, MessageSquare, Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

const statusIcons = {
  pending: Clock,
  sent: Check,
  delivered: CheckCheck,
  received: CheckCheck,
  failed: AlertCircle,
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';
  const StatusIcon = statusIcons[message.status] || Check;

  return (
    <div
      className={cn(
        'flex',
        isOutbound ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          isOutbound
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        {/* Channel badge */}
        <div className="flex items-center gap-2 mb-1">
          {message.channel === 'email' ? (
            <Mail className="h-3 w-3" />
          ) : (
            <MessageSquare className="h-3 w-3" />
          )}
          <span className="text-xs opacity-70">
            {message.channel.toUpperCase()}
          </span>
        </div>

        {/* Subject for emails */}
        {message.subject && (
          <p className="text-sm font-medium mb-1">{message.subject}</p>
        )}

        {/* Message body */}
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>

        {/* Footer with time and status */}
        <div className="flex items-center justify-end gap-2 mt-2">
          <span className="text-xs opacity-70">
            {format(new Date(message.createdAt), 'h:mm a')}
          </span>
          {isOutbound && (
            <StatusIcon
              className={cn(
                'h-3 w-3',
                message.status === 'failed' && 'text-destructive',
                message.status === 'delivered' && 'text-green-500'
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
