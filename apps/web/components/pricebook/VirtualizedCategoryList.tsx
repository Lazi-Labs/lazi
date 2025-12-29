'use client';

import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CategoryImage } from './CategoryImage';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  MoreVertical,
  Eye,
  EyeOff,
  Pencil,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  stId?: string;
  name: string;
  imageUrl?: string | null;
  sortOrder?: number;
  subcategoryCount: number;
  depth?: number;
  visible?: boolean;
  children?: Category[];
  parentId: string | null;
  businessUnit?: string;
  businessUnitIds?: number[];
  skuInvoices?: string;
  order?: number;
  categoryType?: string;
  active?: boolean;
}

interface VirtualizedCategoryListProps {
  categories: Category[];
  expandedCategories: Set<string>;
  toggleExpanded: (id: string) => void;
  onDragStart: (e: React.DragEvent, category: Category) => void;
  onDragOver: (e: React.DragEvent, categoryId: string, element: HTMLElement) => void;
  onDragLeave: () => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, category: Category) => void;
  onToggleVisibility: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onEditImage: (category: Category) => void;
  onMoveToTop: (category: Category) => void;
  onMoveToBottom: (category: Category) => void;
  onChooseCategory: (category: Category) => void;
  dragOverCategory: string | null;
  draggedCategory: Category | null;
  dropPosition: 'before' | 'after' | 'inside' | null;
}

// Flatten tree for virtualization
function flattenCategories(
  categories: Category[],
  expandedCategories: Set<string>,
  depth = 0
): (Category & { depth: number })[] {
  const result: (Category & { depth: number })[] = [];

  for (const category of categories) {
    result.push({ ...category, depth });

    if (expandedCategories.has(category.id) && category.children && category.children.length > 0) {
      result.push(...flattenCategories(category.children, expandedCategories, depth + 1));
    }
  }

  return result;
}

export function VirtualizedCategoryList({
  categories,
  expandedCategories,
  toggleExpanded,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  onToggleVisibility,
  onEditCategory,
  onEditImage,
  onMoveToTop,
  onMoveToBottom,
  onChooseCategory,
  dragOverCategory,
  draggedCategory,
  dropPosition,
}: VirtualizedCategoryListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Flatten the tree for virtualization
  const flattenedCategories = flattenCategories(categories, expandedCategories);

  const virtualizer = useVirtualizer({
    count: flattenedCategories.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Estimated row height
    overscan: 15, // Render extra items above/below viewport for smooth scrolling
  });

  const handleDragOver = useCallback((e: React.DragEvent, category: Category) => {
    e.preventDefault();
    onDragOver(e, category.id, e.currentTarget as HTMLElement);
  }, [onDragOver]);

  if (flattenedCategories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No categories found
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="h-[calc(100vh-350px)] overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const category = flattenedCategories[virtualRow.index];
          const isExpanded = expandedCategories.has(category.id);
          const hasChildren = category.children && category.children.length > 0;
          const subcategoryCount = category.subcategoryCount || (category.children?.length || 0);
          const isDropTarget = dragOverCategory === category.id;
          const isDragging = draggedCategory?.id === category.id;

          return (
            <div
              key={category.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                draggable
                onDragStart={(e) => onDragStart(e, category)}
                onDragOver={(e) => handleDragOver(e, category)}
                onDragLeave={onDragLeave}
                onDragEnd={onDragEnd}
                onDrop={(e) => onDrop(e, category)}
                className={cn(
                  "grid grid-cols-12 gap-4 px-4 py-3 border-b hover:bg-muted/30 transition-colors cursor-grab active:cursor-grabbing relative group",
                  category.depth > 0 && "bg-muted/10",
                  isDropTarget && dropPosition === 'inside' && "bg-blue-100 border-blue-400 border-2",
                  isDragging && "opacity-50"
                )}
                style={{ paddingLeft: `${category.depth * 24 + 16}px` }}
              >
                {/* Drop indicator lines */}
                {isDropTarget && dropPosition === 'before' && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
                {isDropTarget && dropPosition === 'after' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}

                {/* Category Name */}
                <div className="col-span-6 flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab" />
                  
                  {hasChildren ? (
                    <button
                      onClick={() => toggleExpanded(category.id)}
                      className="p-0.5 hover:bg-muted rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <div className="w-5" />
                  )}

                  <span className="font-medium text-sm truncate">{category.name}</span>
                  <Pencil 
                    className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-foreground flex-shrink-0" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditCategory(category);
                    }}
                  />
                  
                  {subcategoryCount > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                      {subcategoryCount} sc
                    </span>
                  )}
                </div>

                {/* Business Unit placeholder */}
                <div className="col-span-2 flex items-center justify-center text-sm text-muted-foreground">
                  —
                </div>

                {/* SKU Invoices placeholder */}
                <div className="col-span-2 flex items-center justify-center text-sm text-muted-foreground">
                  —
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {/* Category Image with edit overlay */}
                  <div 
                    className="relative cursor-pointer group/image"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditImage(category);
                    }}
                  >
                    <CategoryImage src={category.imageUrl} alt={category.name} size={40} />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center rounded">
                      <Pencil className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  {/* Visibility toggle */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => onToggleVisibility(category)}
                    title={category.visible !== false ? 'Hide from CRM' : 'Show in CRM'}
                  >
                    {category.visible !== false ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>

                  {/* More actions dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onMoveToTop(category)}>
                        Move to Top
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMoveToBottom(category)}>
                        Move to Bottom
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChooseCategory(category)}>
                        Move to Category...
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
