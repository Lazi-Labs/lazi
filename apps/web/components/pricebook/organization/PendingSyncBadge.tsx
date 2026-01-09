'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePendingSyncCounts } from '@/hooks/usePricebookOrganization';

interface Props {
  onClick?: () => void;
  className?: string;
}

export function PendingSyncBadge({ onClick, className }: Props) {
  const { data } = usePendingSyncCounts();

  const pending = data?.totalPending || 0;
  const errors = data?.totalErrors || 0;
  const total = pending + errors;

  if (total === 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        'h-8 px-2 relative gap-1',
        errors > 0 ? 'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950' : 
                     'border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950',
        className
      )}
      onClick={onClick}
    >
      <Upload className={cn('h-4 w-4', pending > 0 && 'animate-pulse')} />
      <span className="font-medium">{total}</span>
      {errors > 0 && (
        <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px] gap-0.5">
          <AlertCircle className="h-2.5 w-2.5" />
          {errors}
        </Badge>
      )}
    </Button>
  );
}

export function PendingSyncIndicator({ hasPendingChanges, syncError }: { hasPendingChanges?: boolean; syncError?: string }) {
  if (!hasPendingChanges && !syncError) return null;

  if (syncError) {
    return (
      <Badge variant="destructive" className="text-[10px] px-1 py-0 gap-0.5">
        <AlertCircle className="h-2.5 w-2.5" />
        Sync Error
      </Badge>
    );
  }

  return (
    <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-[10px] px-1 py-0 gap-0.5 dark:bg-orange-900 dark:text-orange-400 dark:border-orange-700">
      <Upload className="h-2.5 w-2.5 animate-pulse" />
      Pending
    </Badge>
  );
}
