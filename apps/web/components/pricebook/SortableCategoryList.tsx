'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { SortableCategory } from './SortableCategory';

interface Category {
  st_id: number;
  name: string;
  display_name?: string;
  parent_st_id: number | null;
  subcategory_count: number;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
  is_visible_crm: boolean;
  category_type: string;
  item_count?: number;
}

interface SortableCategoryListProps {
  categories: Category[];
  tenantId: string;
  onCategoryClick?: (category: Category) => void;
}

export function SortableCategoryList({ categories, tenantId, onCategoryClick }: SortableCategoryListProps) {
  const [items, setItems] = useState<Category[]>(categories);
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Sync with prop changes
  useEffect(() => {
    setItems(categories);
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const reorderMutation = useMutation({
    mutationFn: async ({ stId, newPosition }: { stId: number; newPosition: number }) => {
      const response = await fetch(
        `/api/pricebook/categories/${stId}/reorder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId,
          },
          body: JSON.stringify({ newPosition }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reorder');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Reordered', description: 'Category position updated' });
      queryClient.invalidateQueries({ queryKey: ['pricebook-categories'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to reorder category', variant: 'destructive' });
      setItems(categories);
    },
  });

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.st_id.toString() === active.id);
    const newIndex = items.findIndex((item) => item.st_id.toString() === over.id);

    // Optimistic UI update
    const newItems = arrayMove(items, oldIndex, newIndex);
    setItems(newItems);

    // Call API
    const movedItem = items[oldIndex];
    reorderMutation.mutate({
      stId: movedItem.st_id,
      newPosition: newIndex,
    });
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeItem = activeId
    ? items.find((item) => item.st_id.toString() === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={items.map((item) => item.st_id.toString())}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {items.map((category) => (
            <SortableCategory
              key={category.st_id}
              category={category}
              isActive={activeId === category.st_id.toString()}
              onClick={() => onCategoryClick?.(category)}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <div className="bg-white shadow-lg rounded-lg p-3 opacity-90 border-2 border-blue-500">
            <span className="font-medium">{activeItem.display_name || activeItem.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
