'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronRight, ChevronDown, Eye, EyeOff, ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

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

interface SortableCategoryProps {
  category: Category;
  isActive: boolean;
  onClick?: () => void;
}

export function SortableCategory({ category, isActive, onClick }: SortableCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.st_id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white border rounded-lg p-3 cursor-pointer hover:bg-gray-50',
        isDragging && 'shadow-lg ring-2 ring-blue-500',
        isActive && 'ring-2 ring-blue-300',
        !category.is_active && 'opacity-60'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </button>

        {/* Expand/Collapse */}
        {category.subcategory_count > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Image */}
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={category.name}
            className="w-10 h-10 object-cover rounded"
          />
        ) : (
          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-gray-400" />
          </div>
        )}

        {/* Name & Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {category.display_name || category.name}
          </div>
          <div className="text-sm text-gray-500">
            {category.subcategory_count} subcategories
            {category.item_count !== undefined && ` • ${category.item_count} items`}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          {category.is_visible_crm ? (
            <Eye className="w-4 h-4 text-green-500" />
          ) : (
            <EyeOff className="w-4 h-4 text-gray-400" />
          )}

          {!category.is_active && (
            <span className="text-xs bg-gray-200 px-2 py-1 rounded">Inactive</span>
          )}
        </div>
      </div>
    </div>
  );
}
