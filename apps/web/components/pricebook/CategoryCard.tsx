'use client';

import { useState } from 'react';
import { ImageIcon, Edit, Eye, EyeOff, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Category } from '@/hooks/usePricebookCategories';

interface CategoryCardProps {
  category: Category;
  depth?: number;
  onEdit?: (category: Category) => void;
  onToggleVisibility?: (category: Category) => void;
  showSubcategories?: boolean;
}

export function CategoryCard({ 
  category, 
  depth = 0,
  onEdit, 
  onToggleVisibility,
  showSubcategories = true 
}: CategoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubcategories = category.subcategories && category.subcategories.length > 0;

  const imageUrl = category.image_url 
    ? (category.image_url.startsWith('http') 
        ? category.image_url 
        : `${process.env.NEXT_PUBLIC_API_URL}/api/pricebook/images/categories/${category.st_id}`)
    : null;

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-6")}>
      <div
        className={cn(
          "rounded-lg border p-4 transition-all hover:shadow-md",
          category.has_pending_changes && "border-yellow-500 bg-yellow-50/50",
          !category.active && "opacity-60"
        )}
      >
        {/* Header with expand button for subcategories */}
        <div className="flex items-start gap-3">
          {/* Expand/Collapse Button */}
          {hasSubcategories && showSubcategories && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded mt-2"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}

          {/* Image */}
          <div className="relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt={category.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={cn(
              "w-full h-full flex items-center justify-center text-gray-400",
              imageUrl && "hidden"
            )}>
              <ImageIcon className="w-8 h-8" />
            </div>
            
            {category.has_pending_changes && (
              <div className="absolute top-1 right-1">
                <Badge variant="default" className="bg-yellow-500 text-white text-xs">
                  Pending
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Name & Type */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {category.display_name || category.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {category.category_type}
                  </Badge>
                  {depth > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Level {depth}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-2">
                {category.is_visible_crm ? (
                  <div title="Visible in CRM">
                    <Eye className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <div title="Hidden in CRM">
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                {!category.active && (
                  <Badge variant="secondary" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {category.description && category.description !== 'Null' && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {category.description}
              </p>
            )}

            {/* Business Units */}
            {category.business_units && category.business_units.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {category.business_units.map(bu => (
                  <Badge 
                    key={bu.st_id}
                    variant="secondary"
                    className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200"
                  >
                    {bu.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              {hasSubcategories && (
                <span>{category.subcategories.length} subcategories</span>
              )}
              <span>Position: {category.sort_order}</span>
              {category.last_synced_at && (
                <span className="text-xs">
                  Synced: {new Date(category.last_synced_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                onClick={() => onEdit?.(category)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button 
                onClick={() => onToggleVisibility?.(category)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {category.active ? (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 mr-1" />
                    Show
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Nested Subcategories */}
      {hasSubcategories && showSubcategories && isExpanded && (
        <div className="space-y-2 ml-4 border-l-2 border-gray-200 pl-4">
          {category.subcategories.map((subcat) => (
            <CategoryCard
              key={subcat.st_id}
              category={subcat}
              depth={depth + 1}
              onEdit={onEdit}
              onToggleVisibility={onToggleVisibility}
              showSubcategories={showSubcategories}
            />
          ))}
        </div>
      )}
    </div>
  );
}
