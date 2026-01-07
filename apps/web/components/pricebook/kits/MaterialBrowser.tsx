'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiUrl } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Material {
  id: string;
  stId?: string;
  code: string;
  name: string;
  description?: string;
  cost: number;
  price: number;
  unit?: string;
  categoryIds?: number[];
}

interface Category {
  id: string;
  stId?: string;
  name: string;
  children?: Category[];
  subcategories?: Category[];
}

interface MaterialBrowserProps {
  onSelect: (material: Material) => void;
  excludeIds?: string[];
}

// Helper function to build a tree structure from flat categories
function buildCategoryTree(flatCategories: any[]): Category[] {
  // Filter only Materials type categories
  const materialsCategories = flatCategories.filter(c => c.category_type === 'Materials');

  // Create a map of all categories by their st_id
  const categoryMap = new Map<string, Category>();
  materialsCategories.forEach(cat => {
    const id = String(cat.st_id || cat.id);
    categoryMap.set(id, {
      id,
      stId: cat.st_id,
      name: cat.name,
      children: [],
    });
  });

  // Build the tree by linking children to parents
  const rootCategories: Category[] = [];
  materialsCategories.forEach(cat => {
    const id = String(cat.st_id || cat.id);
    const node = categoryMap.get(id);
    if (!node) return;

    if (cat.parent_st_id) {
      const parentId = String(cat.parent_st_id);
      const parent = categoryMap.get(parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        // Parent not found in materials, treat as root
        rootCategories.push(node);
      }
    } else {
      rootCategories.push(node);
    }
  });

  return rootCategories;
}

// Helper function to get all descendant category IDs
function getAllDescendantIds(categories: Category[], categoryId: string): string[] {
  const result: string[] = [];

  const findAndCollect = (cats: Category[], targetId: string, collecting: boolean): boolean => {
    for (const cat of cats) {
      const id = String(cat.id || cat.stId);
      const children = cat.children || cat.subcategories || [];

      if (id === targetId || collecting) {
        result.push(id);
        if (children.length > 0) {
          findAndCollect(children, '', true);
        }
        if (id === targetId) return true;
      } else if (children.length > 0) {
        if (findAndCollect(children, targetId, false)) return true;
      }
    }
    return false;
  };

  findAndCollect(categories, categoryId, false);
  return result;
}

// Tree Node Component
interface TreeNodeProps {
  category: Category;
  level: number;
  selectedId: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function TreeNode({ category, level, selectedId, expandedIds, onToggle, onSelect }: TreeNodeProps) {
  const id = String(category.id || category.stId);
  const children = category.children || category.subcategories || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(id);
  const isSelected = selectedId === id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer transition-colors",
          isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(id);
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <span className="text-sm truncate">{category.name}</span>
        {hasChildren && (
          <span className="text-xs text-muted-foreground ml-auto">({children.length})</span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={String(child.id || child.stId)}
              category={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MaterialBrowser({ onSelect, excludeIds = [] }: MaterialBrowserProps) {
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch categories - API already returns nested children
  const { data: categoriesData } = useQuery({
    queryKey: ['pricebook-categories-tree', 'materials'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/categories?type=materials&active=true'));
      if (!res.ok) return [];
      const data = await res.json();
      const allCategories = Array.isArray(data) ? data : (data.data || []);

      // Filter to only Materials type root categories and map to our format
      const rootMaterialsCategories = allCategories.filter(
        (c: any) => c.categoryType === 'Materials' && !c.parentId
      );

      return rootMaterialsCategories.map((cat: any) => mapCategory(cat));
    },
  });

  // Helper to recursively map categories with their children
  function mapCategory(cat: any): Category {
    return {
      id: String(cat.stId || cat.id),
      stId: cat.stId,
      name: cat.name,
      children: (cat.children || []).map((child: any) => mapCategory(child)),
    };
  }

  const categories = categoriesData || [];

  // Fetch materials with category and search filtering
  const { data: materialsData, isLoading } = useQuery({
    queryKey: ['materials-browser', debouncedSearch, selectedCategoryId, categories],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('active', 'true');
      params.set('pageSize', '50');

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      if (selectedCategoryId && categories.length > 0) {
        const allCategoryIds = getAllDescendantIds(categories, selectedCategoryId);
        if (allCategoryIds.length > 0) {
          params.set('category_id', allCategoryIds.join(','));
        } else {
          params.set('category_id', selectedCategoryId);
        }
      }

      const res = await fetch(apiUrl(`/api/pricebook/materials?${params}`));
      if (!res.ok) throw new Error('Failed to fetch materials');
      return res.json();
    },
  });

  const materials = materialsData?.data || [];

  const filtered = useMemo(() => {
    return materials.filter((m: Material) => !excludeIds.includes(m.id));
  }, [materials, excludeIds]);

  const handleToggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategoryId(id === selectedCategoryId ? '' : id);
  };

  const selectedCategory = useMemo(() => {
    const findCategory = (cats: Category[], id: string): Category | null => {
      for (const cat of cats) {
        const catId = String(cat.id || cat.stId);
        if (catId === id) return cat;
        const children = cat.children || cat.subcategories || [];
        const found = findCategory(children, id);
        if (found) return found;
      }
      return null;
    };
    return selectedCategoryId ? findCategory(categories, selectedCategoryId) : null;
  }, [categories, selectedCategoryId]);

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search materials by code, name, or description..."
          className="pl-8 pr-8 h-8"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {(search || selectedCategoryId) && (
          <button
            onClick={() => { setSearch(''); setSelectedCategoryId(''); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Two-panel layout: Categories on left, Materials on right */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="flex divide-x" style={{ height: '320px' }}>
          {/* Categories Panel */}
          <div className="w-1/3 flex flex-col">
            <div className="px-3 py-2 bg-muted/30 border-b flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Categories</span>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategoryId('')}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X size={10} /> Clear
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {/* All Categories option */}
              <div
                className={cn(
                  "flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer transition-colors mb-1",
                  !selectedCategoryId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                )}
                onClick={() => setSelectedCategoryId('')}
              >
                <span className="w-5" />
                <span className="text-sm">All Materials</span>
              </div>

              {categories.map((category: Category) => (
                <TreeNode
                  key={String(category.id || category.stId)}
                  category={category}
                  level={0}
                  selectedId={selectedCategoryId}
                  expandedIds={expandedIds}
                  onToggle={handleToggle}
                  onSelect={handleCategorySelect}
                />
              ))}
            </div>
          </div>

          {/* Materials Panel */}
          <div className="w-2/3 flex flex-col">
            <div className="px-3 py-2 bg-muted/30 border-b flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {selectedCategory ? selectedCategory.name : 'All Materials'}
                {materialsData?.total !== undefined && (
                  <span className="ml-2">({materialsData.total})</span>
                )}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Loading materials...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="text-sm">No materials found</div>
                  {selectedCategoryId && (
                    <button
                      onClick={() => setSelectedCategoryId('')}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      Clear category filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((m: Material) => (
                    <button
                      key={m.id}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-3 text-sm transition-colors"
                      onClick={() => onSelect(m)}
                    >
                      <span className="font-mono text-primary w-24 truncate">{m.code}</span>
                      <span className="flex-1 truncate">{m.name}</span>
                      <span className="text-muted-foreground w-20 text-right">${m.cost?.toFixed(2) || '0.00'}</span>
                      <Plus size={14} className="text-green-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
