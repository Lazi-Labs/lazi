'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Package,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';

interface Service {
  id: string;
  stId: string;
  code: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  memberPrice: number;
  active: boolean;
  defaultImageUrl: string | null;
}

interface Category {
  id: string;
  stId: string;
  name: string;
  parentId: string | null;
  children?: Category[];
  itemCount?: number;
  subcategoryCount?: number;
}

interface ServiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  selectedServices: string[]; // Array of service IDs
  onServicesChange: (services: string[]) => void;
  excludeServiceId?: string; // Exclude current service from selection
}

async function fetchServices(categoryId: string | null, search: string): Promise<Service[]> {
  const params = new URLSearchParams();
  if (categoryId) params.set('category', categoryId);
  if (search) params.set('search', search);
  params.set('pageSize', '100');

  const res = await fetch(apiUrl(`/api/pricebook/services?${params}`));
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(apiUrl('/api/pricebook/categories?type=service'));
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || data || [];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function ServiceSelectorModal({
  isOpen,
  onClose,
  title,
  selectedServices,
  onServicesChange,
  excludeServiceId,
}: ServiceSelectorModalProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [localSelected, setLocalSelected] = useState<string[]>(selectedServices);
  const [showFilters, setShowFilters] = useState(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Sync local state when selectedServices changes
  useEffect(() => {
    setLocalSelected(selectedServices);
  }, [selectedServices]);

  const { data: services = [], isLoading: isLoadingServices } = useQuery({
    queryKey: ['services-selector', selectedCategoryId, debouncedSearch],
    queryFn: () => fetchServices(selectedCategoryId, debouncedSearch),
    enabled: isOpen,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories-selector'],
    queryFn: fetchCategories,
    enabled: isOpen,
  });

  // Filter out excluded service
  const filteredServices = useMemo(() => {
    if (!excludeServiceId) return services;
    return services.filter(s => s.id !== excludeServiceId && s.stId !== excludeServiceId);
  }, [services, excludeServiceId]);

  const toggleCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleService = (serviceId: string) => {
    if (localSelected.includes(serviceId)) {
      setLocalSelected(prev => prev.filter(id => id !== serviceId));
    } else {
      setLocalSelected(prev => [...prev, serviceId]);
    }
  };

  const handleApply = () => {
    onServicesChange(localSelected);
    onClose();
  };

  const renderCategory = (category: Category, depth = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const isSelected = selectedCategoryId === category.id || selectedCategoryId === category.stId;
    const count = category.itemCount || category.subcategoryCount || 0;

    return (
      <div key={category.id}>
        <div
          className={cn(
            "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted text-sm",
            isSelected && "bg-primary/10 text-primary font-medium"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setSelectedCategoryId(isSelected ? null : (category.stId || category.id))}
        >
          {hasChildren ? (
            <button
              className="p-0.5 hover:bg-muted-foreground/10 rounded shrink-0"
              onClick={(e) => toggleCategory(category.id, e)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {isExpanded ? (
            <FolderOpen className="h-3 w-3 text-amber-500 shrink-0" />
          ) : (
            <Folder className="h-3 w-3 text-amber-500 shrink-0" />
          )}

          <span className="flex-1 truncate">{category.name}</span>

          {count > 0 && (
            <span className="text-xs text-muted-foreground">
              {count}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children!.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border rounded-xl shadow-2xl w-[900px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{title}</h2>
            {localSelected.length > 0 && (
              <Badge variant="secondary">{localSelected.length} selected</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-muted")}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services by name, code, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Category Sidebar */}
          {showFilters && (
            <div className="w-56 border-r overflow-y-auto p-2 shrink-0">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">CATEGORIES</div>

              <button
                className={cn(
                  "w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-sm hover:bg-muted",
                  !selectedCategoryId && "bg-primary/10 text-primary font-medium"
                )}
                onClick={() => setSelectedCategoryId(null)}
              >
                <Package className="h-3 w-3" />
                All Services
              </button>

              {isLoadingCategories ? (
                <div className="p-4 text-xs text-muted-foreground">Loading...</div>
              ) : (
                <div className="mt-2 space-y-0.5">
                  {categories.map((cat) => renderCategory(cat))}
                </div>
              )}
            </div>
          )}

          {/* Services List */}
          <div className="flex-1 overflow-y-auto">
            {isLoadingServices ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading services...
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No services found</p>
                <p className="text-sm">Try adjusting your search or category filter</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredServices.map((service) => {
                  const isSelected = localSelected.includes(service.id) || localSelected.includes(service.stId);
                  return (
                    <div
                      key={service.id}
                      className={cn(
                        "flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                        isSelected && "bg-primary/5 border-l-2 border-l-primary"
                      )}
                      onClick={() => toggleService(service.stId || service.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleService(service.stId || service.id)}
                      />

                      {service.defaultImageUrl && (
                        <img
                          src={service.defaultImageUrl}
                          alt={service.name}
                          className="w-10 h-10 rounded object-cover shrink-0"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {service.code}
                          </span>
                          {!service.active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        <h4 className="font-medium truncate">{service.displayName || service.name}</h4>
                        {service.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {service.description}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-semibold text-green-600">
                          {formatCurrency(service.price || 0)}
                        </div>
                        {service.memberPrice && service.memberPrice !== service.price && (
                          <div className="text-xs text-muted-foreground">
                            Member: {formatCurrency(service.memberPrice)}
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <Check className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {localSelected.length} service{localSelected.length === 1 ? '' : 's'} selected
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setLocalSelected([])}>
              Clear All
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Selection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
