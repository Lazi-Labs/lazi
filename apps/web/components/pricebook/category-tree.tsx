'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Category {
  id: string;
  stId: string;
  name: string;
  parentId: string | null;
  children: Category[];
  itemCount: number;
}

interface CategoryTreeProps {
  type?: 'service' | 'material' | 'equipment' | 'all';
  selectedId?: string | null;
  onSelect: (category: Category | null) => void;
}

export function CategoryTree({ type = 'all', selectedId, onSelect }: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [parentForNew, setParentForNew] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['pricebook-categories', type],
    queryFn: () => fetchCategories(type),
  });

  const queryClient = useQueryClient();

  const createCategory = useMutation({
    mutationFn: (data: { name: string; parentId: string | null; type: string }) =>
      fetch(apiUrl('/api/pricebook/categories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook-categories'] });
      setAddDialogOpen(false);
      setNewCategoryName('');
    },
  });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderCategory = (category: Category, depth = 0) => {
    const isExpanded = expandedIds.has(category.id);
    const hasChildren = category.children && category.children.length > 0;
    const isSelected = selectedId === category.id;

    return (
      <div key={category.id}>
        <div
          className={cn(
            "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted group",
            isSelected && "bg-primary/10 text-primary"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onSelect(category)}
        >
          <button
            className="p-0.5 hover:bg-muted-foreground/10 rounded"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(category.id);
            }}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="w-4" />
            )}
          </button>

          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-amber-500" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500" />
          )}

          <span className="flex-1 truncate text-sm">{category.name}</span>

          {category.itemCount > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {category.itemCount}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setParentForNew(category.id);
                setAddDialogOpen(true);
              }}>
                Add Subcategory
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {category.children.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading categories...</div>;
  }

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground"
        onClick={() => onSelect(null)}
      >
        All Items
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        onClick={() => {
          setParentForNew(null);
          setAddDialogOpen(true);
        }}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Category
      </Button>

      <div className="space-y-0.5">
        {categories?.map((category: Category) => renderCategory(category))}
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {parentForNew ? 'Add Subcategory' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Electrical Materials"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createCategory.mutate({
                name: newCategoryName,
                parentId: parentForNew,
                type: type === 'all' ? 'service' : type,
              })}
              disabled={!newCategoryName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function fetchCategories(type: string): Promise<Category[]> {
  const res = await fetch(apiUrl(`/api/pricebook/categories?type=${type}`));
  if (!res.ok) return [];
  return res.json();
}
