'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiUrl } from '@/lib/api';

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
        className={`
          flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-zinc-300 hover:bg-zinc-800'}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(id);
            }}
            className="p-0.5 hover:bg-zinc-700 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <span className="text-sm truncate">{category.name}</span>
        {hasChildren && (
          <span className="text-xs text-zinc-500 ml-auto">({children.length})</span>
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

  // Fetch categories with subcategories
  const { data: categoriesData } = useQuery({
    queryKey: ['pricebook-categories-tree', 'materials'],
    queryFn: async () => {
      // First get root categories
      const res = await fetch(apiUrl('/api/pricebook/categories?type=materials&active=true'));
      if (!res.ok) return [];
      const data = await res.json();
      const allCategories = Array.isArray(data) ? data : (data.data || []);

      // Filter to only Materials type root categories
      const rootMaterialsCategories = allCategories.filter(
        (c: any) => c.category_type === 'Materials' && !c.parent_st_id
      );

      // Fetch subcategories for each root category
      const categoriesWithChildren: Category[] = [];
      for (const rootCat of rootMaterialsCategories) {
        try {
          const subRes = await fetch(apiUrl(`/api/pricebook/categories/${rootCat.st_id}/subcategories/tree`));
          if (subRes.ok) {
            const subcategories = await subRes.json();
            categoriesWithChildren.push({
              id: String(rootCat.st_id),
              stId: rootCat.st_id,
              name: rootCat.name,
              children: (subcategories || []).map((sub: any) => mapSubcategory(sub)),
            });
          } else {
            categoriesWithChildren.push({
              id: String(rootCat.st_id),
              stId: rootCat.st_id,
              name: rootCat.name,
              children: [],
            });
          }
        } catch {
          categoriesWithChildren.push({
            id: String(rootCat.st_id),
            stId: rootCat.st_id,
            name: rootCat.name,
            children: [],
          });
        }
      }

      return categoriesWithChildren;
    },
  });

  // Helper to recursively map subcategories
  function mapSubcategory(sub: any): Category {
    return {
      id: String(sub.st_id || sub.id),
      stId: sub.st_id,
      name: sub.name,
      children: (sub.children || []).map((child: any) => mapSubcategory(child)),
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
      <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
        <Search size={16} className="text-zinc-500" />
        <input
          type="text"
          placeholder="Search materials by code, name, or description..."
          className="bg-transparent flex-1 outline-none text-sm text-white placeholder-zinc-500"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {(search || selectedCategoryId) && (
          <button
            onClick={() => { setSearch(''); setSelectedCategoryId(''); }}
            className="text-zinc-500 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Two-panel layout: Categories on left, Materials on right */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex divide-x divide-zinc-800" style={{ height: '320px' }}>
          {/* Categories Panel */}
          <div className="w-1/3 flex flex-col">
            <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Categories</span>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategoryId('')}
                  className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
                >
                  <X size={10} /> Clear
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {/* All Categories option */}
              <div
                className={`
                  flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer transition-colors mb-1
                  ${!selectedCategoryId ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-zinc-300 hover:bg-zinc-800'}
                `}
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
            <div className="px-3 py-2 bg-zinc-800/50 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                {selectedCategory ? selectedCategory.name : 'All Materials'}
                {materialsData?.total !== undefined && (
                  <span className="ml-2 text-zinc-500">({materialsData.total})</span>
                )}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-zinc-500 text-sm">Loading materials...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <div className="text-sm">No materials found</div>
                  {selectedCategoryId && (
                    <button
                      onClick={() => setSelectedCategoryId('')}
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                    >
                      Clear category filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {filtered.map((m: Material) => (
                    <button
                      key={m.id}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-800 flex items-center gap-3 text-sm transition-colors"
                      onClick={() => onSelect(m)}
                    >
                      <span className="font-mono text-blue-400 w-24 truncate">{m.code}</span>
                      <span className="text-zinc-300 flex-1 truncate">{m.name}</span>
                      <span className="text-zinc-500 w-20 text-right">${m.cost?.toFixed(2) || '0.00'}</span>
                      <Plus size={14} className="text-green-400 flex-shrink-0" />
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
