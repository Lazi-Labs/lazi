'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { Package, ChevronRight } from 'lucide-react';

interface Equipment {
  id: string;
  stId: string;
  code: string;
  name: string;
  displayName: string;
  description: string;
  manufacturer: string;
  modelNumber: string;
  cost: number;
  price: number;
  memberPrice: number;
  active: boolean;
  defaultImageUrl: string | null;
}

interface EquipmentListProps {
  categoryId: string | null;
  searchQuery: string;
  selectedId?: string;
  onSelect: (equipment: Equipment) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function EquipmentList({ categoryId, searchQuery, selectedId, onSelect }: EquipmentListProps) {
  const { data: equipment, isLoading } = useQuery({
    queryKey: ['pricebook-equipment', categoryId, searchQuery],
    queryFn: () => fetchEquipment(categoryId, searchQuery),
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading equipment...
      </div>
    );
  }

  if (!equipment?.length) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No equipment found</p>
        <p className="text-sm">Try adjusting your search or category filter</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {equipment.map((item: Equipment) => (
        <div
          key={item.id}
          className={cn(
            "flex items-center gap-4 p-3 hover:bg-muted/50 cursor-pointer transition-colors",
            selectedId === item.id && "bg-primary/5 border-l-2 border-l-primary"
          )}
          onClick={() => onSelect(item)}
        >
          <Checkbox onClick={(e) => e.stopPropagation()} />

          {item.defaultImageUrl && (
            <img 
              src={item.defaultImageUrl} 
              alt={item.name}
              className="w-10 h-10 rounded object-cover"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                {item.code}
              </span>
              {!item.active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <h4 className="font-medium truncate">{item.displayName || item.name}</h4>
            {item.manufacturer && (
              <p className="text-sm text-muted-foreground">
                {item.manufacturer} {item.modelNumber && `- ${item.modelNumber}`}
              </p>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm text-muted-foreground">
              Cost: {formatCurrency(item.cost || 0)}
            </div>
            <div className="font-semibold text-green-600">
              {formatCurrency(item.price || 0)}
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      ))}
    </div>
  );
}

async function fetchEquipment(categoryId: string | null, search: string): Promise<Equipment[]> {
  const params = new URLSearchParams();
  if (categoryId) params.set('category', categoryId);
  if (search) params.set('search', search);
  
  const res = await fetch(apiUrl(`/api/pricebook/equipment?${params}`));
  if (!res.ok) return [];
  return res.json();
}
