'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw, CheckCircle2, AlertTriangle,
  FolderOpen, Image as ImageIcon, DollarSign, FileText, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePricebookHealth } from '@/hooks/usePricebookOrganization';

interface Props {
  onFilterClick?: (issueType: string) => void;
  onViewAll?: () => void;
  className?: string;
}

export function PricebookHealthDashboard({ onFilterClick, onViewAll, className }: Props) {
  const { data: health, isLoading, refetch } = usePricebookHealth();

  if (isLoading || !health) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'A': 'text-green-600 bg-green-100',
      'B': 'text-blue-600 bg-blue-100',
      'C': 'text-yellow-600 bg-yellow-100',
      'D': 'text-orange-600 bg-orange-100',
      'F': 'text-red-600 bg-red-100',
    };
    return colors[grade] || colors['F'];
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-blue-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pricebook Health</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-muted-foreground">Overall Score</span>
              <span className="text-2xl font-bold">{health.overallScore}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full transition-all', getProgressColor(health.overallScore))}
                style={{ width: `${health.overallScore}%` }}
              />
            </div>
          </div>
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold', getGradeColor(health.grade))}>
            {health.grade}
          </div>
        </div>

        {/* Entity Scores */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Materials</span>
              <span className="font-medium">{health.scores.materials}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full', getProgressColor(health.scores.materials))}
                style={{ width: `${health.scores.materials}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Services</span>
              <span className="font-medium">{health.scores.services}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full', getProgressColor(health.scores.services))}
                style={{ width: `${health.scores.services}%` }}
              />
            </div>
          </div>
        </div>

        {/* Issues Grid */}
        <div className="grid grid-cols-2 gap-2">
          <IssueCard
            icon={<FolderOpen className="h-4 w-4" />}
            label="Uncategorized"
            count={(health.stats.materials?.uncategorized || 0) + (health.stats.services?.uncategorized || 0)}
            onClick={() => onFilterClick?.('uncategorized')}
          />
          <IssueCard
            icon={<ImageIcon className="h-4 w-4" />}
            label="No Image"
            count={(health.stats.materials?.no_image || 0) + (health.stats.services?.no_image || 0)}
            onClick={() => onFilterClick?.('no_image')}
          />
          <IssueCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Zero Price"
            count={(health.stats.materials?.zero_price || 0) + (health.stats.services?.zero_price || 0)}
            onClick={() => onFilterClick?.('zero_price')}
          />
          <IssueCard
            icon={<FileText className="h-4 w-4" />}
            label="No Description"
            count={(health.stats.materials?.no_description || 0) + (health.stats.services?.no_description || 0)}
            onClick={() => onFilterClick?.('no_description')}
          />
        </div>

        {/* View All Button */}
        {health.totalIssues > 0 && onViewAll && (
          <Button className="w-full" variant="outline" onClick={onViewAll}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            View {health.totalIssues.toLocaleString()} Items Needing Attention
            <ChevronRight className="h-4 w-4 ml-auto" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function IssueCard({
  icon,
  label,
  count,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick?: () => void;
}) {
  if (count === 0) {
    return (
      <div className="flex items-center gap-2 p-2 rounded border bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs">{label}</span>
        <span className="ml-auto text-xs">All Good</span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-2 rounded border bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 w-full text-left transition-colors dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-400 dark:hover:bg-yellow-900"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="text-xs truncate">{label}</span>
      <span className="ml-auto text-sm font-bold">{count.toLocaleString()}</span>
    </button>
  );
}
