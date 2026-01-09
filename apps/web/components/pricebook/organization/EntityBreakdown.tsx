'use client';

import React from 'react';
import { Package, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePricebookHealth } from '@/hooks/usePricebookOrganization';

interface EntityBreakdownProps {
  className?: string;
  onEntityClick?: (entityType: 'materials' | 'services') => void;
}

export function EntityBreakdown({ className, onEntityClick }: EntityBreakdownProps) {
  const { data: health, isLoading } = usePricebookHealth();

  if (isLoading || !health) {
    return (
      <div className={cn('bg-white rounded-xl border shadow-sm p-4 dark:bg-gray-900 dark:border-gray-800', className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  const entities = [
    {
      type: 'materials' as const,
      icon: Package,
      stats: health.stats.materials,
      score: health.scores.materials,
    },
    {
      type: 'services' as const,
      icon: Wrench,
      stats: health.stats.services,
      score: health.scores.services,
    },
  ];

  return (
    <div className={cn('bg-white rounded-xl border shadow-sm p-4 space-y-3 dark:bg-gray-900 dark:border-gray-800', className)}>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">By Type</h3>

      {entities.map(({ type, icon: Icon, stats, score }) => {
        const reviewedPct = stats.active > 0 ? Math.round((stats.reviewed / stats.active) * 100) : 0;

        return (
          <button
            key={type}
            onClick={() => onEntityClick?.(type)}
            className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg border dark:border-gray-700 text-left transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="font-medium capitalize dark:text-gray-200">{type}</span>
              </div>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-bold',
                  score >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400' :
                  score >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400'
                )}
              >
                {score}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{stats.reviewed.toLocaleString()}/{stats.active.toLocaleString()} reviewed</span>
              <span>{reviewedPct}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${reviewedPct}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
