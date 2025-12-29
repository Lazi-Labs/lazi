'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiUrl } from '@/lib/api';

interface PendingChangesBarProps {
  tenantId: string;
  onPush: () => void;
  isPushing: boolean;
}

export function PendingChangesBar({ tenantId, onPush, isPushing }: PendingChangesBarProps) {
  const { data } = useQuery({
    queryKey: ['pending-overrides', tenantId],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/categories/pending'), {
        headers: { 'x-tenant-id': tenantId },
      });
      return res.json();
    },
    refetchInterval: 5000,
  });

  const pendingCount = data?.count || 0;

  if (pendingCount === 0) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-amber-800">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">
          {pendingCount} unsaved change{pendingCount !== 1 ? 's' : ''} pending
          {data?.categories > 0 && ` (${data.categories} categories`}
          {data?.subcategories > 0 && `, ${data.subcategories} subcategories`}
          {(data?.categories > 0 || data?.subcategories > 0) && ')'}
        </span>
      </div>

      <Button
        onClick={onPush}
        disabled={isPushing}
        size="sm"
        className="bg-amber-600 hover:bg-amber-700 text-white"
      >
        {isPushing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Pushing...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Push to ServiceTitan
          </>
        )}
      </Button>
    </div>
  );
}
