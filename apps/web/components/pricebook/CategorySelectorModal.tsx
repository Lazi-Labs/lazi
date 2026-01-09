'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Folder, FolderOpen, X, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';

interface Category {
  id: string;
  stId: string;
  name: string;
  parentId: string | null;
  children?: Category[];
  itemCount?: number;
  subcategoryCount?: number;
  path?: string;
}

interface CategoryTag {
  id: string;
  name: string;
  path: string;
}

interface CategorySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategories: CategoryTag[];
  onCategoriesChange: (categories: CategoryTag[]) => void;
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(apiUrl('/api/pricebook/categories?type=service'));
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || data || [];
}

// Build path for a category by traversing the tree
function buildCategoryPath(category: Category, allCategories: Category[], parentPath: string = ''): string {
  const currentPath = parentPath ? `${parentPath} > ${category.name}` : category.name;
  return currentPath;
}

// Flatten categories with paths for search
function flattenCategories(categories: Category[], parentPath: string = ''): Array<Category & { fullPath: string }> {
  const result: Array<Category & { fullPath: string }> = [];

  for (const cat of categories) {
    const fullPath = parentPath ? `${parentPath} > ${cat.name}` : cat.name;
    result.push({ ...cat, fullPath });

    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, fullPath));
    }
  }

  return result;
}

export function CategorySelectorModal({
  isOpen,
  onClose,
  selectedCategories,
  onCategoriesChange,
}: CategorySelectorModalProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [localSelected, setLocalSelected] = useState<CategoryTag[]>(selectedCategories);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['pricebook-categories-service'],
    queryFn: fetchCategories,
    enabled: isOpen,
  });

  // Sync local state when selectedCategories changes
  useEffect(() => {
    setLocalSelected(selectedCategories);
  }, [selectedCategories]);

  // Flatten for search
  const flatCategories = flattenCategories(categories);
  const filteredCategories = search
    ? flatCategories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.fullPath.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const isSelected = (categoryId: string) => {
    return localSelected.some(c => c.id === categoryId);
  };

  const toggleCategory = (category: Category, path: string) => {
    if (isSelected(category.id)) {
      // Remove category
      setLocalSelected(prev => prev.filter(c => c.id !== category.id));
    } else {
      // Add category
      setLocalSelected(prev => [...prev, {
        id: category.stId || category.id,
        name: category.name,
        path: path,
      }]);
    }
  };

  const handleApply = () => {
    onCategoriesChange(localSelected);
    onClose();
  };

  const renderCategory = (category: Category, depth = 0, parentPath = '') => {
    const isExpanded = expandedIds.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const selected = isSelected(category.id) || isSelected(category.stId);
    const currentPath = parentPath ? `${parentPath} > ${category.name}` : category.name;
    const count = category.itemCount || category.subcategoryCount || 0;

    return (
      <div key={category.id}>
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer hover:bg-muted transition-colors",
            selected && "bg-primary/10 border-l-2 border-primary"
          )}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => toggleCategory(category, currentPath)}
        >
          {hasChildren ? (
            <button
              className="p-0.5 hover:bg-muted-foreground/10 rounded shrink-0"
              onClick={(e) => toggleExpand(category.id, e)}
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

          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
          )}

          <span className="flex-1 text-sm truncate">{category.name}</span>

          {count > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
              {count}
            </span>
          )}

          {selected && (
            <Check className="h-4 w-4 text-primary shrink-0" />
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children!.map((child) => renderCategory(child, depth + 1, currentPath))}
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
      <div className="relative bg-card border rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Select Categories</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Selected Categories */}
        {localSelected.length > 0 && (
          <div className="p-3 border-b bg-muted/30">
            <div className="text-xs text-muted-foreground mb-2">Selected ({localSelected.length})</div>
            <div className="flex flex-wrap gap-2">
              {localSelected.map((cat) => (
                <Badge key={cat.id} variant="secondary" className="gap-1 pr-1">
                  <span className="truncate max-w-[200px]">{cat.path || cat.name}</span>
                  <button
                    onClick={() => setLocalSelected(prev => prev.filter(c => c.id !== cat.id))}
                    className="ml-1 p-0.5 hover:bg-muted-foreground/20 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading categories...</div>
          ) : search && filteredCategories ? (
            // Search results (flat list)
            filteredCategories.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No categories found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredCategories.map((cat) => {
                  const selected = isSelected(cat.id) || isSelected(cat.stId);
                  return (
                    <div
                      key={cat.id}
                      className={cn(
                        "flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer hover:bg-muted transition-colors",
                        selected && "bg-primary/10 border-l-2 border-primary"
                      )}
                      onClick={() => toggleCategory(cat, cat.fullPath)}
                    >
                      <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{cat.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{cat.fullPath}</div>
                      </div>
                      {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Folder className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No categories found</p>
            </div>
          ) : (
            // Tree view
            <div className="space-y-0.5">
              {categories.map((category) => renderCategory(category))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {localSelected.length} categor{localSelected.length === 1 ? 'y' : 'ies'} selected
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
