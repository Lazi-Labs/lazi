'use client';

/**
 * PricebookHealthDashboard
 * 
 * Displays overall pricebook health with scores and issue counts.
 * Integrates with existing shadcn/ui patterns.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FolderOpen,
  Image as ImageIcon,
  DollarSign,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePricebookHealth, useRecalculateHealth, type HealthData } from '@/hooks/usePricebookOrganization';

interface PricebookHealthDashboardProps {
  onFilterClick?: (issueType: string, entityType?: string) => void;
  onViewAll?: () => void;
  className?: string;
  compact?: boolean;
}

export function PricebookHealthDashboard({
  onFilterClick,
  onViewAll,
  className,
  compact = false,
}: PricebookHealthDashboardProps) {
  const { data: health, isLoading, error, refetch } = usePricebookHealth();
  const recalculateMutation = useRecalculateHealth();

  const handleRefresh = async () => {
    await recalculateMutation.mutateAsync();
    refetch();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !health) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">Failed to load health data</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-blue-600 bg-blue-100';
      case 'C': return 'text-yellow-600 bg-yellow-100';
      case 'D': return 'text-orange-600 bg-orange-100';
      default: return 'text-red-600 bg-red-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold',
                getGradeColor(health.grade)
              )}>
                {health.grade}
              </div>
              <div>
                <p className="text-sm font-medium">Pricebook Health</p>
                <p className="text-xs text-muted-foreground">
                  {health.totalIssues} issues to fix
                </p>
              </div>
            </div>
            {onViewAll && (
              <Button variant="ghost" size="sm" onClick={onViewAll}>
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Pricebook Health</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={recalculateMutation.isPending}
          >
            <RefreshCw className={cn('h-4 w-4', recalculateMutation.isPending && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Overall Score</span>
              <span className={cn('text-2xl font-bold', health.overallScore >= 70 ? 'text-green-600' : health.overallScore >= 50 ? 'text-yellow-600' : 'text-red-600')}>
                {health.overallScore}%
              </span>
            </div>
            <Progress 
              value={health.overallScore} 
              className="h-3"
            />
          </div>
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold',
            getGradeColor(health.grade)
          )}>
            {health.grade}
          </div>
        </div>

        {/* Issues Grid */}
        <div className="grid grid-cols-2 gap-2">
          <IssueCard
            icon={<FolderOpen className="h-4 w-4" />}
            label="Uncategorized"
            count={(health.stats.materials?.uncategorized || 0) + (health.stats.services?.uncategorized || 0)}
            variant="warning"
            onClick={() => onFilterClick?.('uncategorized')}
          />
          <IssueCard
            icon={<ImageIcon className="h-4 w-4" />}
            label="No Image"
            count={(health.stats.materials?.no_image || 0) + (health.stats.services?.no_image || 0)}
            variant="warning"
            onClick={() => onFilterClick?.('no_image')}
          />
          <IssueCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Zero Price"
            count={(health.stats.materials?.zero_price || 0) + (health.stats.services?.zero_price || 0)}
            variant="error"
            onClick={() => onFilterClick?.('zero_price')}
          />
          <IssueCard
            icon={<FileText className="h-4 w-4" />}
            label="No Description"
            count={(health.stats.materials?.no_description || 0) + (health.stats.services?.no_description || 0)}
            variant="info"
            onClick={() => onFilterClick?.('no_description')}
          />
        </div>

        {/* Entity Breakdown */}
        <div className="space-y-2 pt-2 border-t">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            By Type
          </span>
          {(['materials', 'services'] as const).map((type) => {
            const stats = health.stats[type];
            if (!stats) return null;

            return (
              <div 
                key={type}
                className="flex items-center justify-between text-sm hover:bg-muted/50 px-2 py-1.5 rounded cursor-pointer transition-colors"
                onClick={() => onFilterClick?.('all', type)}
              >
                <span className="capitalize font-medium">{type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {stats.reviewed || 0}/{stats.active || 0} reviewed
                  </span>
                  <Badge 
                    variant={health.scores[type] >= 80 ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {health.scores[type]}%
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Action */}
        {health.totalIssues > 0 && onViewAll && (
          <Button 
            className="w-full" 
            variant="outline"
            onClick={onViewAll}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            View {health.totalIssues} Items Needing Attention
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface IssueCardProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  variant: 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
}

function IssueCard({ icon, label, count, variant, onClick }: IssueCardProps) {
  const colors = {
    success: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
    error: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    info: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  };

  if (count === 0) {
    return (
      <div className="flex items-center gap-2 p-2 rounded border bg-green-50 border-green-200 text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs">{label}</span>
        <span className="ml-auto text-xs font-medium">✓</span>
      </div>
    );
  }

  return (
    <button
      className={cn(
        'flex items-center gap-2 p-2 rounded border text-left transition-colors w-full',
        colors[variant]
      )}
      onClick={onClick}
    >
      <AlertTriangle className="h-4 w-4" />
      <span className="text-xs">{label}</span>
      <span className="ml-auto text-sm font-bold">{count}</span>
    </button>
  );
}

// ============================================================================
// QUICK FILTERS COMPONENT
// ============================================================================

export type FilterType = 
  | 'uncategorized' 
  | 'no_image' 
  | 'zero_price' 
  | 'no_description'
  | 'unreviewed'
  | 'reviewed'
  | 'inactive';

interface QuickFilter {
  id: FilterType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const QUICK_FILTERS: QuickFilter[] = [
  { id: 'uncategorized', label: 'Uncategorized', icon: <FolderOpen className="h-3 w-3" />, color: 'text-yellow-600' },
  { id: 'no_image', label: 'No Image', icon: <ImageIcon className="h-3 w-3" />, color: 'text-orange-600' },
  { id: 'zero_price', label: 'Zero Price', icon: <DollarSign className="h-3 w-3" />, color: 'text-red-600' },
  { id: 'no_description', label: 'No Description', icon: <FileText className="h-3 w-3" />, color: 'text-blue-600' },
  { id: 'unreviewed', label: 'Needs Review', icon: <XCircle className="h-3 w-3" />, color: 'text-gray-600' },
  { id: 'reviewed', label: 'Reviewed', icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-green-600' },
];

interface QuickFiltersProps {
  activeFilters: FilterType[];
  onFilterToggle: (filter: FilterType) => void;
  onClearAll: () => void;
  counts?: Partial<Record<FilterType, number>>;
  className?: string;
}

export function QuickFilters({
  activeFilters,
  onFilterToggle,
  onClearAll,
  counts = {},
  className,
}: QuickFiltersProps) {
  const activeCount = activeFilters.length;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quick Filters
        </span>
        {activeCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearAll}
            className="h-6 px-2 text-xs"
          >
            Clear ({activeCount})
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_FILTERS.map((filter) => {
          const isActive = activeFilters.includes(filter.id);
          const count = counts[filter.id];
          
          return (
            <Button
              key={filter.id}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-7 px-2 text-xs',
                !isActive && filter.color
              )}
              onClick={() => onFilterToggle(filter.id)}
            >
              {filter.icon}
              <span className="ml-1">{filter.label}</span>
              {count !== undefined && count > 0 && (
                <Badge 
                  variant={isActive ? 'secondary' : 'outline'} 
                  className="ml-1 h-4 px-1 text-[10px]"
                >
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// REVIEWED TOGGLE COMPONENT
// ============================================================================

interface ReviewedToggleProps {
  isReviewed: boolean;
  onToggle: (reviewed: boolean) => void;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function ReviewedToggle({
  isReviewed,
  onToggle,
  size = 'md',
  disabled = false,
  className,
}: ReviewedToggleProps) {
  const sizeClasses = {
    sm: 'h-6 px-2 text-xs',
    md: 'h-7 px-3 text-xs',
    lg: 'h-8 px-4 text-sm',
  };

  return (
    <Button
      variant={isReviewed ? 'default' : 'outline'}
      size="sm"
      className={cn(
        sizeClasses[size],
        'transition-all',
        isReviewed 
          ? 'bg-green-600 hover:bg-green-700 text-white' 
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
      onClick={() => !disabled && onToggle(!isReviewed)}
      disabled={disabled}
    >
      {isReviewed ? (
        <>
          <CheckCircle2 className={cn(
            'mr-1',
            size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'
          )} />
          FIELD READY
        </>
      ) : (
        <>
          <XCircle className={cn(
            'mr-1',
            size === 'sm' ? 'h-2.5 w-2.5' : size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'
          )} />
          Mark Reviewed
        </>
      )}
    </Button>
  );
}

// Inline badge for list views
export function ReviewedBadge({ 
  isReviewed,
  className,
}: { 
  isReviewed: boolean; 
  className?: string;
}) {
  if (!isReviewed) return null;
  
  return (
    <Badge 
      className={cn(
        'bg-green-100 text-green-700 border-green-300 text-[10px] px-1 py-0',
        className
      )}
    >
      ✓
    </Badge>
  );
}

// ============================================================================
// HOOK: useQuickFilters
// ============================================================================

export function useQuickFilters(initialFilters: FilterType[] = []) {
  const [activeFilters, setActiveFilters] = React.useState<FilterType[]>(initialFilters);

  const toggleFilter = React.useCallback((filter: FilterType) => {
    setActiveFilters(prev => 
      prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  }, []);

  const clearFilters = React.useCallback(() => {
    setActiveFilters([]);
  }, []);

  const setFilters = React.useCallback((filters: FilterType[]) => {
    setActiveFilters(filters);
  }, []);

  return {
    activeFilters,
    toggleFilter,
    clearFilters,
    setFilters,
    hasActiveFilters: activeFilters.length > 0,
  };
}
