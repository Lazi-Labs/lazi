'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Download, List, ChevronRight, Filter, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { MaterialDetailPage } from './material-detail-page';

interface Material {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description: string;
  cost: number;
  price: number;
  memberPrice: number;
  active: boolean;
  defaultImageUrl: string | null;
  primaryVendor: any;
}

interface MaterialsPanelProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

interface FilterState {
  category: string;
  costMin: string;
  costMax: string;
  priceMin: string;
  priceMax: string;
  status: 'active' | 'inactive' | 'all';
  images: 'any' | 'has' | 'none';
  vendor: string;
}

const defaultFilters: FilterState = {
  category: '',
  costMin: '',
  costMax: '',
  priceMin: '',
  priceMax: '',
  status: 'all',
  images: 'any',
  vendor: '',
};

export function MaterialsPanel({ selectedCategory, onCategorySelect }: MaterialsPanelProps) {
  const searchParams = useSearchParams();
  const currentSection = searchParams.get('section');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [showDetailPage, setShowDetailPage] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close detail page when navigating to a different section
  useEffect(() => {
    if (currentSection && currentSection !== 'materials') {
      setShowDetailPage(false);
      setSelectedMaterialId(null);
    }
  }, [currentSection]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch MATERIALS categories for filter dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['pricebook-categories', 'materials'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/categories?type=materials'));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    },
  });

  // Flatten categories for dropdown (handle nested children)
  const flattenCategories = (cats: any[], prefix = ''): { id: string; name: string }[] => {
    const result: { id: string; name: string }[] = [];
    for (const cat of cats) {
      const displayName = prefix ? `${prefix} > ${cat.name}` : cat.name;
      result.push({ id: String(cat.id || cat.stId), name: displayName });
      const children = cat.subcategories || cat.children || [];
      if (children.length > 0) {
        result.push(...flattenCategories(children, displayName));
      }
    }
    return result;
  };
  const categories = flattenCategories(categoriesData || []);

  const { data: materialsData, isLoading } = useQuery({
    queryKey: ['pricebook-materials', selectedCategory, searchQuery, appliedFilters, pageSize, currentPage],
    queryFn: () => fetchMaterials(selectedCategory, searchQuery, appliedFilters, pageSize, currentPage),
  });

  const materials = materialsData?.data || [];
  const totalCount = materialsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!materials || !selectedMaterialId) return;
    const currentIndex = materials.findIndex((m: Material) => m.id === selectedMaterialId);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedMaterialId(materials[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < materials.length - 1) {
      setSelectedMaterialId(materials[currentIndex + 1].id);
    }
  };

  // Show full detail page when a material is selected (like services panel)
  if (showDetailPage) {
    return (
      <MaterialDetailPage 
        materialId={selectedMaterialId || undefined}
        onClose={() => { setShowDetailPage(false); setSelectedMaterialId(null); }}
        onSave={() => { setShowDetailPage(false); setSelectedMaterialId(null); }}
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Action Bar */}
      <div className="p-3 border-b flex items-center gap-2">
        <Button size="sm" onClick={() => { setSelectedMaterialId(null); setShowDetailPage(true); }}>
          <Plus className="h-4 w-4 mr-1" />
          NEW
        </Button>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Code, Name, Description"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-8 h-8"
          />
        </div>
        
        {/* Filter Button with Dropdown */}
        <div className="relative" ref={filterRef}>
          {(() => {
            // Count active filters
            const activeFilterCount = [
              appliedFilters.category,
              appliedFilters.costMin,
              appliedFilters.costMax,
              appliedFilters.priceMin,
              appliedFilters.priceMax,
              appliedFilters.vendor,
              appliedFilters.status !== 'all' ? appliedFilters.status : '',
              appliedFilters.images !== 'any' ? appliedFilters.images : '',
            ].filter(Boolean).length;
            
            return (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(showFilters && "bg-muted", activeFilterCount > 0 && "border-primary")}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            );
          })()}
          
          {showFilters && (
            <div className="absolute top-full left-0 mt-1 w-[450px] bg-background border rounded-lg shadow-xl z-[100] p-4" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              <h3 className="font-semibold mb-4">Filters</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Category</label>
                    <select 
                      value={filters.category}
                      onChange={(e) => setFilters({...filters, category: e.target.value})}
                      className="w-full h-9 border rounded px-2 text-sm bg-background"
                    >
                      <option value="">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Cost</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <Input 
                          placeholder="Min" 
                          value={filters.costMin}
                          onChange={(e) => setFilters({...filters, costMin: e.target.value})}
                          className="h-8 pl-5"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">to</span>
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <Input 
                          placeholder="Max" 
                          value={filters.costMax}
                          onChange={(e) => setFilters({...filters, costMax: e.target.value})}
                          className="h-8 pl-5"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Price</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <Input 
                          placeholder="Min" 
                          value={filters.priceMin}
                          onChange={(e) => setFilters({...filters, priceMin: e.target.value})}
                          className="h-8 pl-5"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">to</span>
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <Input 
                          placeholder="Max" 
                          value={filters.priceMax}
                          onChange={(e) => setFilters({...filters, priceMax: e.target.value})}
                          className="h-8 pl-5"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Vendor</label>
                    <Input 
                      placeholder="Search vendor..." 
                      value={filters.vendor}
                      onChange={(e) => setFilters({...filters, vendor: e.target.value})}
                      className="h-8"
                    />
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Status</label>
                    <div className="flex border rounded overflow-hidden">
                      <button 
                        onClick={() => setFilters({...filters, status: 'active'})}
                        className={cn("flex-1 py-1.5 text-sm", filters.status === 'active' ? "bg-primary text-primary-foreground" : "bg-background")}
                      >Active</button>
                      <button 
                        onClick={() => setFilters({...filters, status: 'inactive'})}
                        className={cn("flex-1 py-1.5 text-sm border-l", filters.status === 'inactive' ? "bg-primary text-primary-foreground" : "bg-background")}
                      >Inactive</button>
                      <button 
                        onClick={() => setFilters({...filters, status: 'all'})}
                        className={cn("flex-1 py-1.5 text-sm border-l", filters.status === 'all' ? "bg-primary text-primary-foreground" : "bg-background")}
                      >All</button>
                    </div>
                  </div>
                  
                  <TriStateFilter label="Images" value={filters.images} onChange={(v) => setFilters({...filters, images: v})} />
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setFilters(defaultFilters); }}
                >
                  Reset All
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowFilters(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => { setAppliedFilters(filters); setCurrentPage(1); setShowFilters(false); }}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          IMPORT
        </Button>
        <Button variant="outline" size="sm">
          <List className="h-4 w-4 mr-1" />
          ALL
        </Button>
      </div>

      {/* Materials List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading materials...</div>
        ) : !materials?.length ? (
          <div className="p-8 text-center text-muted-foreground">No materials found</div>
        ) : (
          <div className="divide-y">
            {materials.map((material: Material) => (
              <div
                key={material.id}
                className={cn(
                  "flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                  selectedMaterialId === material.id && "bg-primary/5"
                )}
                onClick={() => { setSelectedMaterialId(material.id); setShowDetailPage(true); }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {material.defaultImageUrl && (
                    <img 
                      src={material.defaultImageUrl} 
                      alt="" 
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {material.displayName || material.name}
                    </div>
                    {material.primaryVendor?.vendorName && (
                      <div className="text-xs text-muted-foreground">
                        {material.primaryVendor.vendorName}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(material.price || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Cost: {formatCurrency(material.cost || 0)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Pagination Controls */}
      <div className="p-3 border-t flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            Showing {materials.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Rows:</span>
            <select 
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
              className="h-8 border rounded px-2 text-sm bg-background"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Page:</span>
            <select 
              value={currentPage}
              onChange={(e) => setCurrentPage(parseInt(e.target.value))}
              className="h-8 border rounded px-2 text-sm bg-background"
            >
              {Array.from({ length: totalPages || 1 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// TriState Filter Component
function TriStateFilter({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: 'any' | 'has' | 'none'; 
  onChange: (v: 'any' | 'has' | 'none') => void;
}) {
  return (
    <div>
      <label className="text-sm text-muted-foreground mb-1 block">{label}</label>
      <div className="flex border rounded overflow-hidden">
        <button 
          onClick={() => onChange('any')}
          className={cn("flex-1 py-1.5 text-sm", value === 'any' ? "bg-primary text-primary-foreground" : "bg-background")}
        >Any</button>
        <button 
          onClick={() => onChange('has')}
          className={cn("flex-1 py-1.5 text-sm border-l", value === 'has' ? "bg-primary text-primary-foreground" : "bg-background")}
        >Has</button>
        <button 
          onClick={() => onChange('none')}
          className={cn("flex-1 py-1.5 text-sm border-l", value === 'none' ? "bg-primary text-primary-foreground" : "bg-background")}
        >None</button>
      </div>
    </div>
  );
}

interface MaterialsResponse {
  data: Material[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

async function fetchMaterials(
  categoryId: string | null, 
  search: string,
  filters: FilterState,
  pageSize: number,
  page: number
): Promise<MaterialsResponse> {
  const params = new URLSearchParams();
  // Use filter category if set, otherwise use selectedCategory from sidebar
  const effectiveCategory = filters.category || categoryId;
  if (effectiveCategory) params.set('category', effectiveCategory);
  if (search) params.set('search', search);
  params.set('pageSize', pageSize.toString());
  params.set('page', page.toString());
  
  // Apply filters
  if (filters.status !== 'all') {
    params.set('active', filters.status === 'active' ? 'true' : 'false');
  }
  if (filters.costMin) params.set('costMin', filters.costMin);
  if (filters.costMax) params.set('costMax', filters.costMax);
  if (filters.priceMin) params.set('priceMin', filters.priceMin);
  if (filters.priceMax) params.set('priceMax', filters.priceMax);
  if (filters.images !== 'any') params.set('hasImages', filters.images === 'has' ? 'true' : 'false');
  if (filters.vendor) params.set('vendor', filters.vendor);
  
  const res = await fetch(apiUrl(`/api/pricebook/materials?${params}`));
  if (!res.ok) return { data: [], totalCount: 0, page: 1, pageSize: 25, hasMore: false };
  return res.json();
}
