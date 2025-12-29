'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus,
  X,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VendorDetailPanel } from './vendor-detail-panel';

interface Vendor {
  id: string;
  stId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  active: boolean;
  isFavorite?: boolean;
}

export default function VendorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { data: vendors, isLoading, refetch } = useQuery({
    queryKey: ['vendors', searchQuery, showInactive],
    queryFn: () => fetchVendors(searchQuery, showInactive),
  });

  const filteredVendors = vendors?.filter((v: Vendor) => 
    showInactive || v.active
  ) || [];

  const selectedVendor = vendors?.find((v: Vendor) => v.id === selectedVendorId);

  return (
    <div className="flex h-full">
      {/* Left Panel - Vendor List */}
      <div className="w-[400px] border-r flex flex-col bg-background">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold">Vendors</h1>
              <p className="text-sm text-muted-foreground">Manage vendors</p>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-1" />
              Add Vendor
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Type a vendor or status to search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          
          {/* Show Inactive Toggle */}
          <div className="flex items-center gap-2 mt-3">
            <Switch 
              checked={showInactive} 
              onCheckedChange={setShowInactive}
              id="show-inactive"
            />
            <label htmlFor="show-inactive" className="text-sm text-muted-foreground">
              Show Inactive Vendors
            </label>
          </div>
        </div>

        {/* Active Vendors Count */}
        <div className="px-4 py-2 border-b bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground uppercase">
            {filteredVendors.filter((v: Vendor) => v.active).length} Active Vendors
          </span>
        </div>

        {/* Vendors List */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading vendors...</div>
          ) : !filteredVendors.length ? (
            <div className="p-8 text-center text-muted-foreground">No vendors found</div>
          ) : (
            <div className="divide-y">
              {filteredVendors.map((vendor: Vendor) => (
                <div
                  key={vendor.id}
                  onClick={() => {
                    setSelectedVendorId(vendor.id);
                    setIsEditing(false);
                  }}
                  className={cn(
                    "p-3 cursor-pointer transition-colors hover:bg-muted/50",
                    selectedVendorId === vendor.id && "bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{vendor.name}</div>
                      {vendor.email && (
                        <div className="text-xs text-muted-foreground">{vendor.email}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {vendor.active ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs">
                          Inactive
                        </Badge>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVendorId(vendor.id);
                          setIsEditing(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Vendor Detail */}
      <div className="flex-1 overflow-auto bg-muted/20">
        {selectedVendorId ? (
          <VendorDetailPanel 
            vendorId={selectedVendorId}
            isEditing={isEditing}
            onEdit={() => setIsEditing(true)}
            onClose={() => {
              setSelectedVendorId(null);
              setIsEditing(false);
            }}
            onSave={() => {
              setIsEditing(false);
              refetch();
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Select a vendor to view details
          </div>
        )}
      </div>
    </div>
  );
}

async function fetchVendors(search: string, showInactive: boolean): Promise<Vendor[]> {
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (showInactive) params.set('showInactive', 'true');
    
    const res = await fetch(`/api/purchasing/vendors?${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}
