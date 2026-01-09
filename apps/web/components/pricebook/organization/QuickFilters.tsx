'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Image, DollarSign, FileText, XCircle, CheckCircle2, Upload, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FilterType = 'uncategorized' | 'no_image' | 'zero_price' | 'no_description' | 'unreviewed' | 'needs_review' | 'reviewed' | 'pending_sync' | 'no_vendor';

const ALL_FILTERS: { id: FilterType; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'uncategorized', label: 'Uncategorized', icon: <FolderOpen className="h-3 w-3" />, color: 'text-yellow-600' },
  { id: 'no_image', label: 'No Image', icon: <Image className="h-3 w-3" />, color: 'text-orange-600' },
  { id: 'no_vendor', label: 'No Vendor', icon: <Store className="h-3 w-3" />, color: 'text-purple-600' },
  { id: 'zero_price', label: 'Zero Price', icon: <DollarSign className="h-3 w-3" />, color: 'text-red-600' },
  { id: 'no_description', label: 'No Description', icon: <FileText className="h-3 w-3" />, color: 'text-blue-600' },
  { id: 'unreviewed', label: 'Needs Review', icon: <XCircle className="h-3 w-3" />, color: 'text-gray-600' },
  { id: 'reviewed', label: 'Reviewed', icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-green-600' },
  { id: 'pending_sync', label: 'Pending Sync', icon: <Upload className="h-3 w-3" />, color: 'text-orange-600' },
];

// Default filters for services (original behavior)
const DEFAULT_SERVICE_FILTERS: FilterType[] = ['uncategorized', 'no_image', 'zero_price', 'no_description', 'unreviewed', 'reviewed', 'pending_sync'];

// Filters for materials
export const MATERIAL_FILTERS: FilterType[] = ['no_image', 'uncategorized', 'no_vendor', 'unreviewed', 'reviewed', 'pending_sync'];

// Filters for equipment
export const EQUIPMENT_FILTERS: FilterType[] = ['no_image', 'uncategorized', 'no_vendor', 'unreviewed', 'reviewed', 'pending_sync'];

interface Props {
  activeFilters: FilterType[];
  onFilterToggle: (filter: FilterType) => void;
  onClearAll: () => void;
  counts?: Partial<Record<FilterType, number>>;
  className?: string;
  filterTypes?: FilterType[]; // Optional: specify which filters to show
}

export function QuickFilters({ activeFilters, onFilterToggle, onClearAll, counts = {}, className, filterTypes }: Props) {
  // Filter to only show specified filter types, or default to service filters
  const visibleFilters = filterTypes
    ? ALL_FILTERS.filter(f => filterTypes.includes(f.id))
    : ALL_FILTERS.filter(f => DEFAULT_SERVICE_FILTERS.includes(f.id));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Filters</span>
        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 px-2 text-xs">
            Clear ({activeFilters.length})
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {visibleFilters.map((filter) => {
          const isActive = activeFilters.includes(filter.id);
          const count = counts[filter.id];
          return (
            <Button
              key={filter.id}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={cn('h-7 px-2 text-xs gap-1', !isActive && filter.color)}
              onClick={() => onFilterToggle(filter.id)}
            >
              {filter.icon}
              <span>{filter.label}</span>
              {count !== undefined && count > 0 && (
                <Badge variant={isActive ? 'secondary' : 'outline'} className="ml-1 h-4 px-1 text-[10px]">
                  {count.toLocaleString()}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function useQuickFilters(initial: FilterType[] = []) {
  const [activeFilters, setActiveFilters] = useState<FilterType[]>(initial);

  const toggleFilter = useCallback((filter: FilterType) => {
    setActiveFilters(prev => {
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter);
      }
      // reviewed and unreviewed/needs_review are mutually exclusive
      if (filter === 'reviewed') {
        return [...prev.filter(f => f !== 'unreviewed' && f !== 'needs_review'), filter];
      }
      if (filter === 'unreviewed' || filter === 'needs_review') {
        return [...prev.filter(f => f !== 'reviewed' && f !== 'unreviewed' && f !== 'needs_review'), filter];
      }
      return [...prev, filter];
    });
  }, []);

  const clearFilters = useCallback(() => setActiveFilters([]), []);

  return { activeFilters, toggleFilter, clearFilters, setFilters: setActiveFilters };
}
