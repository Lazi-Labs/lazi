'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  stId?: string;
  name: string;
  children?: Category[];
  subcategories?: Category[];
}

interface CategoryTreeFilterProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
  onClose?: () => void;
}

// Helper function to get all descendant category IDs (exported for use in panels)
export function getAllDescendantIds(categories: Category[], categoryId: string): string[] {
  const result: string[] = [];
  
  const findAndCollect = (cats: Category[], targetId: string, collecting: boolean): boolean => {
    for (const cat of cats) {
      const id = String(cat.id || cat.stId);
      const children = cat.children || cat.subcategories || [];
      
      if (id === targetId || collecting) {
        result.push(id);
        // Collect all children recursively
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

interface TreeNodeProps {
  category: Category;
  level: number;
  selectedId: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  searchQuery: string;
}

function TreeNode({ category, level, selectedId, expandedIds, onToggle, onSelect, searchQuery }: TreeNodeProps) {
  const id = String(category.id || category.stId);
  const children = category.children || category.subcategories || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(id);
  const isSelected = selectedId === id;

  // Check if this node or any descendant matches search
  const matchesSearch = (cat: Category, query: string): boolean => {
    if (!query) return true;
    const lowerQuery = query.toLowerCase();
    if (cat.name.toLowerCase().includes(lowerQuery)) return true;
    const kids = cat.children || cat.subcategories || [];
    return kids.some(child => matchesSearch(child, query));
  };

  const isVisible = matchesSearch(category, searchQuery);
  if (!isVisible) return null;

  const isDirectMatch = searchQuery && category.name.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer hover:bg-muted/50 transition-colors",
          isSelected && "bg-primary/10 text-primary font-medium",
          isDirectMatch && searchQuery && "bg-yellow-100 dark:bg-yellow-900/30"
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
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryTreeFilter({ categories, selectedCategoryId, onSelect, onClose }: CategoryTreeFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Auto-expand categories that match search
  const expandedForSearch = useMemo(() => {
    if (!searchQuery) return new Set<string>();
    
    const toExpand = new Set<string>();
    const findMatches = (cats: Category[], parentIds: string[] = []) => {
      for (const cat of cats) {
        const id = String(cat.id || cat.stId);
        const children = cat.children || cat.subcategories || [];
        
        if (cat.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          // Expand all parents
          parentIds.forEach(pid => toExpand.add(pid));
        }
        
        if (children.length > 0) {
          findMatches(children, [...parentIds, id]);
        }
      }
    };
    findMatches(categories);
    return toExpand;
  }, [categories, searchQuery]);

  const effectiveExpanded = useMemo(() => {
    const combined = new Set(expandedIds);
    expandedForSearch.forEach(id => combined.add(id));
    return combined;
  }, [expandedIds, expandedForSearch]);

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

  const handleExpandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (cats: Category[]) => {
      for (const cat of cats) {
        const id = String(cat.id || cat.stId);
        const children = cat.children || cat.subcategories || [];
        if (children.length > 0) {
          allIds.add(id);
          collectIds(children);
        }
      }
    };
    collectIds(categories);
    setExpandedIds(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
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
    <div className="flex flex-col h-full max-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b mb-2">
        <span className="text-sm font-medium">Select Category</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleExpandAll}>
            Expand All
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleCollapseAll}>
            Collapse
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 pl-8 pr-8 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Selected indicator */}
      {selectedCategory && (
        <div className="flex items-center justify-between py-1.5 px-2 mb-2 bg-primary/10 rounded text-sm">
          <span className="truncate font-medium">{selectedCategory.name}</span>
          <button
            onClick={() => onSelect('')}
            className="p-0.5 hover:bg-muted rounded ml-2"
            title="Clear selection"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* All Categories option */}
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded cursor-pointer hover:bg-muted/50 transition-colors mb-1",
          !selectedCategoryId && "bg-primary/10 text-primary font-medium"
        )}
        onClick={() => onSelect('')}
      >
        <span className="w-5" />
        <span className="text-sm">All Categories</span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto">
        {categories.map((category) => (
          <TreeNode
            key={String(category.id || category.stId)}
            category={category}
            level={0}
            selectedId={selectedCategoryId}
            expandedIds={effectiveExpanded}
            onToggle={handleToggle}
            onSelect={onSelect}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  );
}
