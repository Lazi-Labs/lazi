'use client';

import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Package, ChevronRight } from 'lucide-react';

interface Service {
  id: string;
  stId: string;
  code: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  memberPrice: number;
  margin: number;
  categoryIds: string[];
  active: boolean;
  defaultImageUrl: string | null;
}

interface ServicesListProps {
  categoryId: string | null;
  searchQuery: string;
  selectedId?: string;
  onSelect: (service: Service) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function ServicesList({ categoryId, searchQuery, selectedId, onSelect }: ServicesListProps) {
  const { data: services, isLoading } = useQuery({
    queryKey: ['pricebook-services', categoryId, searchQuery],
    queryFn: () => fetchServices(categoryId, searchQuery),
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading services...
      </div>
    );
  }

  if (!services?.length) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No services found</p>
        <p className="text-sm">Try adjusting your search or category filter</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {services.map((service: Service) => (
        <div
          key={service.id}
          className={cn(
            "flex items-center gap-4 p-3 hover:bg-muted/50 cursor-pointer transition-colors",
            selectedId === service.id && "bg-primary/5 border-l-2 border-l-primary"
          )}
          onClick={() => onSelect(service)}
        >
          <Checkbox onClick={(e) => e.stopPropagation()} />

          {service.defaultImageUrl && (
            <img 
              src={service.defaultImageUrl} 
              alt={service.name}
              className="w-10 h-10 rounded object-cover"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                {service.code}
              </span>
              {!service.active && (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <h4 className="font-medium truncate">{service.displayName || service.name}</h4>
            {service.description && (
              <p className="text-sm text-muted-foreground truncate">
                {service.description}
              </p>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="font-semibold text-green-600">
              {formatCurrency(service.price || 0)}
            </div>
            {service.memberPrice && service.memberPrice !== service.price && (
              <div className="text-xs text-muted-foreground">
                Member: {formatCurrency(service.memberPrice)}
              </div>
            )}
          </div>

          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      ))}
    </div>
  );
}

async function fetchServices(categoryId: string | null, search: string): Promise<Service[]> {
  const params = new URLSearchParams();
  if (categoryId) params.set('category', categoryId);
  if (search) params.set('search', search);
  
  const res = await fetch(`https://api.lazilabs.com/pricebook/db/services?${params}`);
  if (!res.ok) return [];
  return res.json();
}
