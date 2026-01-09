'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Download, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { QuickFilters, EQUIPMENT_FILTERS } from './organization/QuickFilters';
import { ReviewedBadge } from './organization/ReviewedToggle';
import { PendingSyncBadge } from './organization/PendingSyncBadge';
import { PendingSyncPanel } from './organization/PendingSyncPanel';
import { useQuickFilters, usePendingSyncCounts, FilterType } from '@/hooks/usePricebookOrganization';

interface Equipment {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description: string;
  manufacturer: string;
  modelNumber: string;
  cost: number;
  price: number;
  memberPrice: number;
  active: boolean;
  defaultImageUrl: string | null;
}

interface EquipmentPanelProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export function EquipmentPanel({ selectedCategory, onCategorySelect }: EquipmentPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentSection = searchParams.get('section');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);

  // Quick filters hooks
  const { activeFilters, toggleFilter, clearFilters } = useQuickFilters();
  const { data: syncCounts } = usePendingSyncCounts();

  // Reset selection when navigating to a different section
  useEffect(() => {
    if (currentSection && currentSection !== 'equipment') {
      setSelectedEquipmentId(null);
    }
  }, [currentSection]);

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['pricebook-equipment', selectedCategory, searchQuery, activeFilters],
    queryFn: () => fetchEquipment(selectedCategory, searchQuery, activeFilters),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="flex h-full">
      {/* Equipment List */}
      <div className="flex-1 flex flex-col">
        {/* Action Bar */}
        <div className="p-3 border-b flex items-center gap-2">
          <Button size="sm" onClick={() => { router.push('/pricebook/equipment/new'); }}>
            <Plus className="h-4 w-4 mr-1" />
            NEW
          </Button>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
          <PendingSyncBadge onClick={() => setSyncPanelOpen(true)} />
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            IMPORT
          </Button>
        </div>

        {/* Quick Filters */}
        <div className="px-3 py-2 border-b bg-background">
          <QuickFilters
            activeFilters={activeFilters}
            onFilterToggle={toggleFilter}
            onClearAll={clearFilters}
            filterTypes={EQUIPMENT_FILTERS}
            counts={{
              pending_sync: syncCounts?.totalPending,
            }}
          />
        </div>

        {/* Equipment List */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading equipment...</div>
          ) : !equipment?.length ? (
            <div className="p-8 text-center text-muted-foreground">No equipment found</div>
          ) : (
            <div className="divide-y">
              {equipment.map((item: Equipment) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                    selectedEquipmentId === item.id && "bg-primary/5"
                  )}
                  onClick={() => { router.push(`/pricebook/equipment/${(item as any).stId || item.id}`); }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.defaultImageUrl && (
                      <img
                        src={item.defaultImageUrl}
                        alt=""
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {item.displayName || item.name}
                        <ReviewedBadge isReviewed={(item as any).is_reviewed} />
                        {(item as any).has_local_changes && (
                          <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" title="Pending sync" />
                        )}
                      </div>
                      {item.manufacturer && (
                        <div className="text-xs text-muted-foreground">
                          {item.manufacturer} {item.modelNumber && `- ${item.modelNumber}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(item.price || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cost: {formatCurrency(item.cost || 0)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Sync Panel - Equipment uses material type for now */}
      <PendingSyncPanel
        open={syncPanelOpen}
        onClose={() => setSyncPanelOpen(false)}
        entityType="material"
      />
    </div>
  );
}

async function fetchEquipment(
  categoryId: string | null,
  search: string,
  quickFilters: FilterType[] = []
): Promise<Equipment[]> {
  const params = new URLSearchParams();
  if (categoryId) params.set('category', categoryId);
  if (search) params.set('search', search);

  // Apply quick filters
  if (quickFilters.includes('no_image')) params.set('hasImages', 'false');
  if (quickFilters.includes('uncategorized')) params.set('uncategorized', 'true');
  if (quickFilters.includes('no_vendor')) params.set('noVendor', 'true');
  if (quickFilters.includes('reviewed')) params.set('reviewed', 'true');
  if (quickFilters.includes('unreviewed') || quickFilters.includes('needs_review')) params.set('reviewed', 'false');
  if (quickFilters.includes('pending_sync')) params.set('pendingSync', 'true');

  const res = await fetch(apiUrl(`/api/pricebook/equipment?${params}`));
  if (!res.ok) return [];
  const response = await res.json();
  // API returns { data: [...], totalCount: ... } format
  return response.data || response || [];
}
