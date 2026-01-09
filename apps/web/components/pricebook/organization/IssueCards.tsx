'use client';

import React from 'react';
import { FolderOpen, Image, DollarSign, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePricebookHealth } from '@/hooks/usePricebookOrganization';

interface IssueCardsGridProps {
  onIssueClick?: (issueType: string) => void;
  className?: string;
}

export function IssueCardsGrid({ onIssueClick, className }: IssueCardsGridProps) {
  const { data: health, isLoading } = usePricebookHealth();

  if (isLoading || !health) {
    return (
      <div className={cn('grid grid-cols-2 gap-4', className)}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const issues = [
    {
      id: 'uncategorized',
      title: 'Uncategorized',
      icon: FolderOpen,
      count: (health.stats.materials?.uncategorized || 0) + (health.stats.services?.uncategorized || 0),
      breakdown: [
        { label: 'Materials', count: health.stats.materials?.uncategorized || 0 },
        { label: 'Services', count: health.stats.services?.uncategorized || 0 },
      ],
      color: 'yellow',
    },
    {
      id: 'no_image',
      title: 'Missing Images',
      icon: Image,
      count: (health.stats.materials?.no_image || 0) + (health.stats.services?.no_image || 0),
      breakdown: [
        { label: 'Materials', count: health.stats.materials?.no_image || 0 },
        { label: 'Services', count: health.stats.services?.no_image || 0 },
      ],
      color: 'orange',
    },
    {
      id: 'zero_price',
      title: 'Zero/Negative Price',
      icon: DollarSign,
      count: (health.stats.materials?.zero_price || 0) + (health.stats.services?.zero_price || 0),
      breakdown: [
        { label: 'Materials', count: health.stats.materials?.zero_price || 0 },
        { label: 'Services', count: health.stats.services?.zero_price || 0 },
      ],
      color: 'red',
    },
    {
      id: 'margin_issues',
      title: 'Margin Issues',
      icon: TrendingDown,
      count: ((health.stats.materials as any)?.negative_margin || 0) + ((health.stats.materials as any)?.high_margin || 0),
      breakdown: [
        { label: 'Negative margin', count: (health.stats.materials as any)?.negative_margin || 0 },
        { label: 'High margin (>85%)', count: (health.stats.materials as any)?.high_margin || 0 },
      ],
      color: 'purple',
    },
  ];

  const colorClasses = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-400',
    orange: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-400',
    red: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-400',
    purple: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-400',
  };

  return (
    <div className={cn('grid grid-cols-2 gap-4', className)}>
      {issues.map(issue => (
        <button
          key={issue.id}
          onClick={() => onIssueClick?.(issue.id)}
          className={cn(
            'p-4 rounded-lg border text-left transition-colors hover:opacity-80',
            colorClasses[issue.color as keyof typeof colorClasses]
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <issue.icon className="h-5 w-5" />
              <span className="font-medium">{issue.title}</span>
            </div>
            <span className="text-xl font-bold">{issue.count.toLocaleString()}</span>
          </div>
          <div className="space-y-1">
            {issue.breakdown.map(item => (
              <div key={item.label} className="flex justify-between text-sm opacity-75">
                <span>{item.label}</span>
                <span>{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}
