'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { 
  Wrench, 
  Package, 
  Truck, 
  Users, 
  FolderTree,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';

type PricebookSection = 'services' | 'materials' | 'equipment' | 'vendors' | 'categories';

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  subcategoryCount: number;
  itemCount?: number;
  children?: Category[];
}

interface PricebookCategorySidebarProps {
  activeSection: PricebookSection;
  onSectionChange: (section: PricebookSection) => void;
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export function PricebookCategorySidebar({ 
  activeSection, 
  onSectionChange,
  selectedCategory,
  onCategorySelect,
}: PricebookCategorySidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: categories } = useQuery({
    queryKey: ['pricebook-categories-sidebar', activeSection],
    queryFn: () => fetchCategories(activeSection),
    enabled: ['services', 'materials', 'equipment'].includes(activeSection),
  });

  const toggleCategory = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'services': return 'Services';
      case 'materials': return 'Materials';
      case 'equipment': return 'Equipment';
      case 'vendors': return 'Vendors';
      case 'categories': return 'Categories';
      default: return 'Pricebook';
    }
  };

  const getSectionIcon = () => {
    switch (activeSection) {
      case 'services': return Wrench;
      case 'materials': return Package;
      case 'equipment': return Truck;
      case 'vendors': return Users;
      case 'categories': return FolderTree;
      default: return Wrench;
    }
  };

  const Icon = getSectionIcon();

  const renderCategory = (category: Category, depth = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const isSelected = selectedCategory === category.id;

    return (
      <div key={category.id}>
        <div
          className={cn(
            "flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/30",
            isSelected && "bg-primary/10 text-primary"
          )}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => onCategorySelect(category.id)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren && (
              <button
                className="p-0.5 hover:bg-muted rounded"
                onClick={(e) => toggleCategory(category.id, e)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
            {!hasChildren && <span className="w-5" />}
            <span className="truncate text-sm font-medium">{category.name}</span>
          </div>
          <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
            {category.subcategoryCount > 0 ? `${category.subcategoryCount} subs` : (category.itemCount ? `${category.itemCount}` : '')}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children!.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-56 border-r bg-card flex flex-col h-full">
      {/* Section Header */}
      <div className="p-3 border-b flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <span className="font-semibold">{getSectionTitle()}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Section Tabs */}
      <div className="border-b">
        <button
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors",
            activeSection === 'services' && "bg-primary/10 text-primary border-l-2 border-l-primary"
          )}
          onClick={() => { onSectionChange('services'); onCategorySelect(null); }}
        >
          <Wrench className="h-4 w-4" />
          Services
        </button>
        <button
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors",
            activeSection === 'materials' && "bg-primary/10 text-primary border-l-2 border-l-primary"
          )}
          onClick={() => { onSectionChange('materials'); onCategorySelect(null); }}
        >
          <Package className="h-4 w-4" />
          Materials
        </button>
        <button
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors",
            activeSection === 'equipment' && "bg-primary/10 text-primary border-l-2 border-l-primary"
          )}
          onClick={() => { onSectionChange('equipment'); onCategorySelect(null); }}
        >
          <Truck className="h-4 w-4" />
          Equipment
        </button>
      </div>

      {/* Category List */}
      <div className="flex-1 overflow-auto">
        {categories?.map((category: Category) => renderCategory(category))}
        
        {!categories?.length && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No categories found
          </div>
        )}
      </div>
    </div>
  );
}

async function fetchCategories(section: string): Promise<Category[]> {
  const type = section === 'services' ? 'service' : section === 'materials' ? 'material' : 'equipment';
  const res = await fetch(apiUrl(`/api/pricebook/categories?type=${type}&flat=true`));
  if (!res.ok) {
    // Return mock data for development
    return [
      { id: '1', name: 'Electrical Service New', parentId: null, subcategoryCount: 15, children: [] },
      { id: '2', name: 'Electrical Service', parentId: null, subcategoryCount: 22, children: [] },
      { id: '3', name: 'Pool', parentId: null, subcategoryCount: 1, children: [] },
      { id: '4', name: 'Admin', parentId: null, subcategoryCount: 6, children: [] },
      { id: '5', name: 'Pool Builder', parentId: null, subcategoryCount: 8, children: [] },
      { id: '6', name: 'Gas', parentId: null, subcategoryCount: 5, children: [] },
      { id: '7', name: 'Equipment', parentId: null, subcategoryCount: 1, children: [] },
      { id: '8', name: 'Perfect Catch', parentId: null, subcategoryCount: 0, children: [] },
      { id: '9', name: 'Electrical Service New', parentId: null, subcategoryCount: 0, children: [] },
      { id: '10', name: 'Electrical Materials', parentId: null, subcategoryCount: 0, children: [] },
      { id: '11', name: 'Old Storage', parentId: null, subcategoryCount: 0, children: [] },
    ];
  }
  const data = await res.json();
  
  // Add subcategory counts
  const addCounts = (cats: Category[]): Category[] => {
    return cats.map(cat => ({
      ...cat,
      subcategoryCount: cat.children?.length || 0,
      children: cat.children ? addCounts(cat.children) : undefined,
    }));
  };
  
  return addCounts(data);
}
