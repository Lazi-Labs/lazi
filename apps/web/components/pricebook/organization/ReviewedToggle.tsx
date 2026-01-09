'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  isReviewed: boolean;
  onToggle: (reviewed: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function ReviewedToggle({ isReviewed, onToggle, size = 'md', disabled, className }: Props) {
  const sizes = { sm: 'h-6 px-2 text-xs', md: 'h-7 px-3 text-xs', lg: 'h-8 px-4 text-sm' };
  const iconSizes = { sm: 'h-2.5 w-2.5', md: 'h-3 w-3', lg: 'h-4 w-4' };

  return (
    <Button
      variant={isReviewed ? 'default' : 'outline'}
      size="sm"
      className={cn(sizes[size], isReviewed ? 'bg-green-600 hover:bg-green-700' : 'text-muted-foreground', className)}
      onClick={() => !disabled && onToggle(!isReviewed)}
      disabled={disabled}
    >
      {isReviewed ? (
        <><CheckCircle2 className={cn('mr-1', iconSizes[size])} />FIELD READY</>
      ) : (
        <><XCircle className={cn('mr-1', iconSizes[size])} />Mark Reviewed</>
      )}
    </Button>
  );
}

export function ReviewedBadge({ isReviewed }: { isReviewed: boolean }) {
  if (!isReviewed) return null;
  return (
    <Badge className="bg-green-100 text-green-700 border-green-300 text-[10px] px-1 py-0 dark:bg-green-900 dark:text-green-400 dark:border-green-700">
      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
      Reviewed
    </Badge>
  );
}

// Yellow dot indicator for pending changes
export function PendingChangeDot({ title = 'Pending sync to ServiceTitan' }: { title?: string }) {
  return (
    <span
      className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"
      title={title}
    />
  );
}
