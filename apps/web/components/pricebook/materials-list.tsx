'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { Package, ChevronRight } from 'lucide-react';

interface Material {
  id: string;
  st_id: string;
  code: string;
  name: string;
  display_name: string;
  description: string;
  cost: number;
  price: number;
  member_price: number;
  active: boolean;
  image_url: string | null;
  primary_vendor: {
    vendorName?: string;
    cost?: number;
  } | null;
  is_new?: boolean;
  push_error?: string | null;
}

interface MaterialsListProps {
  categoryId: string | null;
  searchQuery: string;
  selectedId?: string;
  onSelect: (material: Material) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function MaterialsList({ categoryId, searchQuery, selectedId, onSelect }: MaterialsListProps) {
  const { data: materials, isLoading } = useQuery({
    queryKey: ['pricebook-materials', categoryId, searchQuery],
    queryFn: () => fetchMaterials(categoryId, searchQuery),
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading materials...
      </div>
    );
  }

  if (!materials?.length) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No materials found</p>
        <p className="text-sm">Try adjusting your search or category filter</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {materials.map((material: Material) => (
        <div
          key={material.id}
          className={cn(
            "flex items-center gap-4 p-3 hover:bg-muted/50 cursor-pointer transition-colors",
            selectedId === material.id && "bg-primary/5 border-l-2 border-l-primary"
          )}
          onClick={() => onSelect(material)}
        >
          <Checkbox onClick={(e) => e.stopPropagation()} />

          {material.image_url && (
            <img
              src={material.image_url}
              alt={material.name}
              className="w-10 h-10 rounded object-cover"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                {material.code}
              </span>
              {material.is_new && (
                <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs">New</Badge>
              )}
              {!material.active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {material.push_error && (
                <Badge variant="destructive" className="text-xs">Push Error</Badge>
              )}
            </div>
            <h4 className="font-medium truncate">{material.display_name || material.name}</h4>
            {material.primary_vendor?.vendorName && (
              <p className="text-sm text-muted-foreground">
                Vendor: {material.primary_vendor.vendorName}
              </p>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm text-muted-foreground">
              Cost: {formatCurrency(material.cost || 0)}
            </div>
            <div className="font-semibold text-green-600">
              {formatCurrency(material.price || 0)}
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      ))}
    </div>
  );
}

async function fetchMaterials(categoryId: string | null, search: string): Promise<Material[]> {
  const params = new URLSearchParams();
  if (categoryId) params.set('category_id', categoryId);
  if (search) params.set('search', search);

  const res = await fetch(apiUrl(`/api/pricebook/materials?${params}`));
  if (!res.ok) return [];
  const json = await res.json();
  // API returns { data: [...], total, page, ... }
  return json.data || [];
}
