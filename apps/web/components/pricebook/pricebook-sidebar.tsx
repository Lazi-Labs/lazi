'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import {
  Wrench,
  Package,
  Truck,
  Users,
  FolderTree,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

type PricebookSection = 'services' | 'materials' | 'equipment' | 'vendors' | 'categories';

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  subcategoryCount: number;
  children?: Category[];
}

interface PricebookSidebarProps {
  activeSection: PricebookSection;
  onSectionChange: (section: PricebookSection) => void;
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

const sectionConfig = [
  { id: 'services' as const, label: 'Services', icon: Wrench },
  { id: 'materials' as const, label: 'Materials', icon: Package },
  { id: 'equipment' as const, label: 'Equipment', icon: Truck },
  { id: 'vendors' as const, label: 'Vendors', icon: Users },
  { id: 'categories' as const, label: 'Categories', icon: FolderTree },
];

export function PricebookSidebar({ 
  activeSection, 
  onSectionChange,
  selectedCategory,
  onCategorySelect,
}: PricebookSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: categories } = useQuery({
    queryKey: ['pricebook-categories-sidebar', activeSection],
    queryFn: () => fetchCategories(activeSection),
    enabled: ['services', 'materials', 'equipment'].includes(activeSection),
  });

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategory = (category: Category, depth = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const isSelected = selectedCategory === category.id;

    return (
      <div key={category.id}>
        <div
          className={cn(
            "flex items-center justify-between py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors",
            isSelected && "bg-primary/10 text-primary font-medium"
          )}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={() => onCategorySelect(category.id)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren ? (
              <button
                className="p-0.5 hover:bg-muted rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(category.id);
                }}
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
            <span className="truncate text-sm">{category.name}</span>
          </div>
          {category.subcategoryCount > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              {category.subcategoryCount} subs
            </span>
          )}
          {!hasChildren && category.subcategoryCount === 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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

  return (
    <div className="w-64 border-r bg-card flex flex-col h-full">
      {/* Section Navigation */}
      <div className="border-b">
        {sectionConfig.map((section) => (
          <button
            key={section.id}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50",
              activeSection === section.id && "bg-primary/10 text-primary border-l-2 border-l-primary"
            )}
            onClick={() => {
              onSectionChange(section.id);
              onCategorySelect(null);
            }}
          >
            <section.icon className="h-4 w-4" />
            {section.label}
          </button>
        ))}
      </div>

      {/* Category Hierarchy (for services, materials, equipment) */}
      {['services', 'materials', 'equipment'].includes(activeSection) && (
        <div className="flex-1 overflow-auto">
          <div className="p-3 border-b">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Category Hierarchy
            </h3>
          </div>
          
          <div
            className={cn(
              "py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors text-sm",
              selectedCategory === null && "bg-primary/10 text-primary font-medium"
            )}
            onClick={() => onCategorySelect(null)}
          >
            All Items
          </div>

          <div className="divide-y divide-border/50">
            {categories?.map((category: Category) => renderCategory(category))}
          </div>
        </div>
      )}
    </div>
  );
}

async function fetchCategories(section: string): Promise<Category[]> {
  const type = section === 'services' ? 'service' : section === 'materials' ? 'material' : 'equipment';
  const res = await fetch(apiUrl(`/api/pricebook/categories?type=${type}`));
  if (!res.ok) return [];
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
