'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';

interface MessageInputProps {
  onSend: (data: { channel: 'sms' | 'email'; body: string; subject?: string }) => void;
  isSending?: boolean;
  defaultChannel?: 'sms' | 'email';
}

export function MessageInput({ onSend, isSending, defaultChannel = 'sms' }: MessageInputProps) {
  const [channel, setChannel] = useState<'sms' | 'email'>(defaultChannel);
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    onSend({
      channel,
      body: body.trim(),
      ...(channel === 'email' && subject ? { subject } : {}),
    });

    setBody('');
    setSubject('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Select value={channel} onValueChange={(v) => setChannel(v as 'sms' | 'email')}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>

        {channel === 'email' && (
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
          />
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          placeholder={channel === 'sms' ? 'Type a message...' : 'Type your email...'}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="resize-none"
          disabled={isSending}
        />
        <Button type="submit" size="icon" disabled={!body.trim() || isSending}>
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
