'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Search,
  Download,
  List,
  ChevronRight,
  Filter,
  ChevronLeft,
  LayoutGrid,
  HelpCircle,
  ImageIcon,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { ServiceDetailPage } from './service-detail-page';
import { EditColumnsDrawer } from './EditColumnsDrawer';
import { CategoryTreeFilter, getAllDescendantIds } from './category-tree-filter';
import {
  ColumnConfig,
  DEFAULT_COLUMNS,
  ADDITIONAL_COLUMNS,
  getDefaultVisibleColumns,
  COLUMNS_STORAGE_KEY,
} from '@/types/pricebook';

interface Service {
  id: string;
  stId?: string;
  code: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  memberPrice: number;
  active: boolean;
  defaultImageUrl?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  hours?: number;
  category?: string;
  categoryName?: string;
  materialsCost?: number;
  dynamicPrice?: number | null;
  priceRule?: string | null;
  businessUnit?: string;
  taxable?: boolean;
  upgrades?: string[];
  recommendations?: string[];
  linkedMaterials?: string[];
  linkedEquipment?: string[];
}

interface ServicesPanelProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

interface FilterState {
  category: string;
  hoursMin: string;
  hoursMax: string;
  priceMin: string;
  priceMax: string;
  incomeAccount: string;
  expenseAccount: string;
  businessUnit: string;
  status: 'active' | 'inactive' | 'all';
  images: 'any' | 'has' | 'none';
  video: 'any' | 'has' | 'none';
  upgrades: 'any' | 'has' | 'none';
  recommendations: 'any' | 'has' | 'none';
  linkedMaterials: 'any' | 'has' | 'none';
  linkedEquipment: 'any' | 'has' | 'none';
  description: string;
  conversionTags: string;
}

const defaultFilters: FilterState = {
  category: '',
  hoursMin: '',
  hoursMax: '',
  priceMin: '',
  priceMax: '',
  incomeAccount: '',
  expenseAccount: '',
  businessUnit: '',
  status: 'all',
  images: 'any',
  video: 'any',
  upgrades: 'any',
  recommendations: 'any',
  linkedMaterials: 'any',
  linkedEquipment: 'any',
  description: '',
  conversionTags: '',
};

// Column header labels
const columnLabels: Record<string, string> = {
  media: 'Media',
  name: 'Name',
  code: 'Code',
  category: 'Category',
  description: 'Description',
  hours: 'Hours',
  staticPrice: 'Static Price',
  staticMemberPrice: 'Member Price',
  materialsCost: 'Materials Cost',
  dynamicPrice: 'Dynamic Price',
  priceRule: 'Price Rule',
  incomeAccount: 'Income Account',
  warrantyDescription: 'Warranty',
  businessUnit: 'Business Unit',
  taxable: 'Taxable',
  staticAddOnPrice: 'Add-on Price',
  staticAddOnMemberPrice: 'Add-on Member Price',
  crossSaleGroup: 'Cross Sale',
  upgrades: 'Upgrades',
  recommendations: 'Recommendations',
  bonusDollar: '$ Bonus',
  bonusPercent: '% Bonus',
  conversionTags: 'Tags',
  techSpecificBonus: 'Tech Bonus',
  paysCommission: 'Commission',
  linkedMaterials: 'Materials',
  linkedEquipment: 'Equipment',
  useStaticPrice: 'Use Static',
};

export function ServicesPanel({ selectedCategory, onCategorySelect }: ServicesPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentSection = searchParams.get('section');

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters);
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [showColumnsDrawer, setShowColumnsDrawer] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [editedServices, setEditedServices] = useState<Record<string, Partial<Service>>>({});
  const [savingServices, setSavingServices] = useState<Set<string>>(new Set());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Load column preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (saved) {
      try {
        setVisibleColumns(JSON.parse(saved));
      } catch {
        setVisibleColumns(getDefaultVisibleColumns());
      }
    } else {
      setVisibleColumns(getDefaultVisibleColumns());
    }
  }, []);

  // Save column preferences to localStorage
  const handleColumnsChange = (columns: string[]) => {
    setVisibleColumns(columns);
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
  };

  // Handle column resize
  const handleColumnResize = (columnId: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnId]: Math.max(50, width), // Minimum width of 50px
    }));
  };

  // Start column resize
  const startResize = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    setResizingColumn(columnId);
    const startX = e.pageX;
    const startWidth = columnWidths[columnId] || 150;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.pageX - startX;
      handleColumnResize(columnId, startWidth + diff);
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };


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

  // Fetch SERVICE categories for filter dropdown (only active)
  const { data: categoriesData } = useQuery({
    queryKey: ['pricebook-categories', 'services', 'active'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/categories?type=services&active=true'));
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

  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['pricebook-services', selectedCategory, searchQuery, appliedFilters, pageSize, currentPage, categoriesData],
    queryFn: () => fetchServices(selectedCategory, searchQuery, appliedFilters, pageSize, currentPage, categoriesData || []),
  });

  const services = servicesData?.data || [];
  const totalCount = servicesData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleServiceClick = (serviceId: string) => {
    if (!editMode) {
      router.push(`/pricebook/services/${serviceId}`);
    }
  };

  // Update edited service value
  const updateServiceField = (serviceId: string, field: string, value: any) => {
    setEditedServices(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]: value,
      },
    }));
  };

  // Save edited service
  const saveService = async (serviceId: string) => {
    const edits = editedServices[serviceId];
    if (!edits || Object.keys(edits).length === 0) return;

    setSavingServices(prev => new Set(prev).add(serviceId));
    try {
      const res = await fetch(apiUrl(`/api/pricebook/services/${serviceId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits),
      });
      
      if (res.ok) {
        // Clear edits for this service
        setEditedServices(prev => {
          const next = { ...prev };
          delete next[serviceId];
          return next;
        });
        // Refetch to get updated data
        // queryClient.invalidateQueries(['pricebook-services']);
      }
    } catch (error) {
      console.error('Failed to save service:', error);
    } finally {
      setSavingServices(prev => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
    }
  };

  // Cancel edits for a service
  const cancelServiceEdits = (serviceId: string) => {
    setEditedServices(prev => {
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
  };

  // Get current value (edited or original)
  const getCurrentValue = (service: Service, field: string) => {
    const edited = editedServices[service.id];
    return edited && field in edited ? edited[field as keyof Service] : service[field as keyof Service];
  };

  // Get cell value for a column
  const getCellValue = (service: Service, columnId: string, isEditable: boolean = false): React.ReactNode => {
    switch (columnId) {
      case 'media':
        const imageUrl = service.defaultImageUrl || service.imageUrl || service.image_url;
        return imageUrl ? (
          <img
            src={imageUrl}
            alt={service.name}
            className="w-10 h-10 object-cover rounded border"
            onError={(e) => {
              // Hide broken images and show placeholder
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<div class="w-10 h-10 bg-muted rounded border flex items-center justify-center"><svg class="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>';
            }}
          />
        ) : (
          <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        );
      case 'name':
        if (isEditable) {
          return (
            <Input
              value={String(getCurrentValue(service, 'displayName') || getCurrentValue(service, 'name') || '')}
              onChange={(e) => updateServiceField(service.id, 'displayName', e.target.value)}
              className="h-8 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return <span className="font-medium">{service.displayName || service.name}</span>;
      case 'code':
        return <span className="font-mono text-muted-foreground text-xs">{service.code}</span>;
      case 'category':
        return service.categoryName ? (
          <Badge variant="secondary">{service.categoryName}</Badge>
        ) : service.category ? (
          <Badge variant="secondary">{service.category}</Badge>
        ) : '--';
      case 'description':
        if (isEditable) {
          return (
            <Input
              value={String(getCurrentValue(service, 'description') || '')}
              onChange={(e) => updateServiceField(service.id, 'description', e.target.value)}
              className="h-8 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return (
          <span className="text-muted-foreground max-w-xs truncate block text-sm">
            {service.description || '--'}
          </span>
        );
      case 'hours':
        if (isEditable) {
          return (
            <Input
              type="number"
              step="0.1"
              value={String(getCurrentValue(service, 'hours') ?? '')}
              onChange={(e) => updateServiceField(service.id, 'hours', parseFloat(e.target.value) || 0)}
              className="h-8 text-sm w-20"
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return service.hours ?? '--';
      case 'staticPrice':
        if (isEditable) {
          return (
            <Input
              type="number"
              step="0.01"
              value={String(getCurrentValue(service, 'price') ?? '')}
              onChange={(e) => updateServiceField(service.id, 'price', parseFloat(e.target.value) || 0)}
              className="h-8 text-sm w-24"
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return formatCurrency(service.price);
      case 'staticMemberPrice':
        return formatCurrency(service.memberPrice);
      case 'materialsCost':
        return formatCurrency(service.materialsCost);
      case 'dynamicPrice':
        return service.dynamicPrice !== null && service.dynamicPrice !== undefined
          ? formatCurrency(service.dynamicPrice)
          : '--';
      case 'priceRule':
        return service.priceRule || '--';
      case 'businessUnit':
        return service.businessUnit || '--';
      case 'taxable':
        return service.taxable ? 'Yes' : 'No';
      case 'upgrades':
        return service.upgrades?.length ? (
          <Badge variant="outline">{service.upgrades.length}</Badge>
        ) : '--';
      case 'recommendations':
        return service.recommendations?.length ? (
          <Badge variant="outline">{service.recommendations.length}</Badge>
        ) : '--';
      case 'linkedMaterials':
        return service.linkedMaterials?.length ? (
          <Badge variant="outline">{service.linkedMaterials.length}</Badge>
        ) : '--';
      case 'linkedEquipment':
        return service.linkedEquipment?.length ? (
          <Badge variant="outline">{service.linkedEquipment.length}</Badge>
        ) : '--';
      default:
        return '--';
    }
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b flex items-center justify-between bg-muted/30">
        {/* Left side: Search and filters */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <Button size="sm" onClick={() => router.push('/pricebook/services/new')}>
            <Plus className="h-4 w-4 mr-1" />
            NEW
          </Button>
          <div className="relative flex-1">
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
              const activeFilterCount = [
                appliedFilters.category,
                appliedFilters.hoursMin,
                appliedFilters.hoursMax,
                appliedFilters.priceMin,
                appliedFilters.priceMax,
                appliedFilters.description,
                appliedFilters.status !== 'all' ? appliedFilters.status : '',
                appliedFilters.images !== 'any' ? appliedFilters.images : '',
                appliedFilters.linkedMaterials !== 'any' ? appliedFilters.linkedMaterials : '',
                appliedFilters.linkedEquipment !== 'any' ? appliedFilters.linkedEquipment : '',
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
              <div className="absolute top-full left-0 mt-1 w-[600px] bg-background border rounded-lg shadow-xl z-[100] p-4" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                <h3 className="font-semibold mb-4">Filters</h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Category</label>
                      <div className="border rounded p-2 bg-background">
                        <CategoryTreeFilter
                          categories={categoriesData || []}
                          selectedCategoryId={filters.category}
                          onSelect={(id) => setFilters({...filters, category: id})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Hours</label>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Min"
                          value={filters.hoursMin}
                          onChange={(e) => setFilters({...filters, hoursMin: e.target.value})}
                          className="h-8"
                        />
                        <span className="text-sm text-muted-foreground">to</span>
                        <Input
                          placeholder="Max"
                          value={filters.hoursMax}
                          onChange={(e) => setFilters({...filters, hoursMax: e.target.value})}
                          className="h-8"
                        />
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
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <TriStateFilter label="Images" value={filters.images} onChange={(v) => setFilters({...filters, images: v})} />
                    <TriStateFilter label="Upgrades" value={filters.upgrades} onChange={(v) => setFilters({...filters, upgrades: v})} />
                    <TriStateFilter label="Linked Materials" value={filters.linkedMaterials} onChange={(v) => setFilters({...filters, linkedMaterials: v})} />
                    <TriStateFilter label="Linked Equipment" value={filters.linkedEquipment} onChange={(v) => setFilters({...filters, linkedEquipment: v})} />

                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Description</label>
                      <Input
                        placeholder="Search by keyword"
                        value={filters.description}
                        onChange={(e) => setFilters({...filters, description: e.target.value})}
                        className="h-8"
                      />
                    </div>
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
        </div>

        {/* Right side: Edit Columns and Edit Mode */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setShowColumnsDrawer(true)}>
            <LayoutGrid className="h-4 w-4 mr-2" />
            Edit Columns
          </Button>

          <div className="flex items-center gap-2">
            <Label htmlFor="edit-mode" className="text-sm font-medium">
              Edit Mode
            </Label>
            <Switch
              id="edit-mode"
              checked={editMode}
              onCheckedChange={setEditMode}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enable Edit Mode to make inline changes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Import
          </Button>
        </div>
      </div>

      {/* Services Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading services...</div>
        ) : !services?.length ? (
          <div className="p-8 text-center text-muted-foreground">No services found</div>
        ) : (
          <Table ref={tableRef}>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {visibleColumns.map((columnId) => (
                  <TableHead
                    key={columnId}
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wider whitespace-nowrap relative group',
                      columnId === 'media' && 'w-16'
                    )}
                    style={{
                      width: columnWidths[columnId] ? `${columnWidths[columnId]}px` : undefined,
                      minWidth: columnId === 'media' ? '64px' : '100px',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {columnId === 'media' ? (
                          <ImageIcon className="h-4 w-4" />
                        ) : (
                          columnLabels[columnId] || columnId
                        )}
                      </span>
                      {/* Resize handle */}
                      <div
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-primary transition-opacity"
                        onMouseDown={(e) => startResize(e, columnId)}
                        style={{
                          backgroundColor: resizingColumn === columnId ? 'var(--primary)' : undefined,
                        }}
                      />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service: Service) => (
                <TableRow
                  key={service.id}
                  className={cn(
                    !editMode && "cursor-pointer",
                    editedServices[service.id] && "bg-yellow-50 dark:bg-yellow-900/10"
                  )}
                  onClick={() => handleServiceClick(service.stId || service.id)}
                >
                  {visibleColumns.map((columnId) => (
                    <TableCell 
                      key={columnId} 
                      className="text-sm"
                      style={{
                        width: columnWidths[columnId] ? `${columnWidths[columnId]}px` : undefined,
                        maxWidth: columnWidths[columnId] ? `${columnWidths[columnId]}px` : undefined,
                      }}
                    >
                      {getCellValue(service, columnId, editMode)}
                    </TableCell>
                  ))}
                  {editMode && editedServices[service.id] && (
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveService(service.id);
                          }}
                          disabled={savingServices.has(service.id)}
                        >
                          {savingServices.has(service.id) ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelServiceEdits(service.id);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="p-3 border-t flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2 text-sm border rounded-md bg-background"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1 mx-2">
            {Array.from({ length: Math.min(10, totalPages) }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8 text-sm"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            {totalPages > 10 && (
              <span className="px-2 text-muted-foreground">...</span>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {services.length > 0 ? `${startItem} - ${endItem} of ${totalCount.toLocaleString()} items` : '0 items'}
        </div>
      </div>

      {/* Edit Columns Drawer */}
      <EditColumnsDrawer
        open={showColumnsDrawer}
        onOpenChange={setShowColumnsDrawer}
        visibleColumns={visibleColumns}
        onColumnsChange={handleColumnsChange}
      />
    </div>
  );
}

// TriState Filter Component (Any / Has / None)
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

interface ServicesResponse {
  data: Service[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

async function fetchServices(
  categoryId: string | null,
  search: string,
  filters: FilterState,
  pageSize: number,
  page: number,
  categoriesData: any[]
): Promise<ServicesResponse> {
  const params = new URLSearchParams();
  const effectiveCategory = filters.category || categoryId;
  if (effectiveCategory) {
    // Get all descendant category IDs for hierarchical filtering
    const allCategoryIds = getAllDescendantIds(categoriesData, effectiveCategory);
    if (allCategoryIds.length > 0) {
      params.set('category', allCategoryIds.join(','));
    } else {
      params.set('category', effectiveCategory);
    }
  }
  if (search) params.set('search', search);
  params.set('pageSize', pageSize.toString());
  params.set('page', page.toString());

  if (filters.status !== 'all') {
    params.set('active', filters.status === 'active' ? 'true' : 'false');
  }
  if (filters.priceMin) params.set('priceMin', filters.priceMin);
  if (filters.priceMax) params.set('priceMax', filters.priceMax);
  if (filters.hoursMin) params.set('hoursMin', filters.hoursMin);
  if (filters.hoursMax) params.set('hoursMax', filters.hoursMax);
  if (filters.description) params.set('description', filters.description);
  if (filters.images !== 'any') params.set('hasImages', filters.images === 'has' ? 'true' : 'false');
  if (filters.linkedMaterials !== 'any') params.set('hasMaterials', filters.linkedMaterials === 'has' ? 'true' : 'false');
  if (filters.linkedEquipment !== 'any') params.set('hasEquipment', filters.linkedEquipment === 'has' ? 'true' : 'false');

  const url = apiUrl(`/api/pricebook/services?${params}`);

  const res = await fetch(url, {
    headers: {
      'x-tenant-id': '3222348440',
    },
  });

  if (!res.ok) {
    return { data: [], totalCount: 0, page: 1, pageSize: 25, hasMore: false };
  }

  const response = await res.json();
  
  // Map API response to expected format
  return {
    data: response.data || [],
    totalCount: response.totalCount || 0,
    page: response.page || 1,
    pageSize: response.pageSize || pageSize,
    hasMore: response.hasMore || false,
  };
}
