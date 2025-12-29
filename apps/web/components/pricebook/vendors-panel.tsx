'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vendor {
  id: string;
  name: string;
  isFavorite?: boolean;
}

export function VendorsPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['pricebook-vendors', searchQuery],
    queryFn: () => fetchVendors(searchQuery),
  });

  const filteredVendors = vendors?.filter((v: Vendor) => 
    activeTab === 'all' || v.isFavorite
  ) || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header Actions */}
      <div className="border-b">
        <div className="p-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer">
          <span className="font-medium">MANAGE VENDORS (SERVICE TITAN)</span>
          <ChevronRight className="h-4 w-4" />
        </div>
        <div className="p-3 flex items-center justify-between hover:bg-muted/50 cursor-pointer border-t">
          <span className="font-medium">PULL VENDORS</span>
          <Download className="h-4 w-4" />
        </div>
        <div className="p-3 border-t">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="SEARCH VENDORS"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 uppercase text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="p-3 border-b">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'favorites')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">ALL</TabsTrigger>
            <TabsTrigger value="favorites">FAVORITES</TabsTrigger>
          </TabsList>
        </Tabs>
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
                className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <span className="font-medium">{vendor.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function fetchVendors(search: string): Promise<Vendor[]> {
  // For now, return mock data - would integrate with ST Automation
  const mockVendors = [
    { id: '1', name: 'ACE HARDWARE', isFavorite: true },
    { id: '2', name: 'Amazon', isFavorite: false },
    { id: '3', name: 'AMP', isFavorite: false },
    { id: '4', name: 'Best Buy', isFavorite: false },
    { id: '5', name: 'Big Horn Supply', isFavorite: true },
    { id: '6', name: 'BlueTorrent Pool Products', isFavorite: false },
    { id: '7', name: 'Boat Lift Warehouse', isFavorite: false },
    { id: '8', name: 'CED', isFavorite: false },
    { id: '9', name: 'City Electric', isFavorite: true },
    { id: '10', name: 'City of St.Petersburg', isFavorite: false },
    { id: '11', name: 'Cooper Supplies', isFavorite: false },
    { id: '12', name: 'Default Replenishment Vendor', isFavorite: false },
    { id: '13', name: 'Dock Builders', isFavorite: false },
    { id: '14', name: 'Dock Solutions Inc', isFavorite: false },
    { id: '15', name: 'Duromax', isFavorite: false },
    { id: '16', name: 'Elliott Electric Supply', isFavorite: false },
    { id: '17', name: 'ESSENTIAL ELECTRIC', isFavorite: false },
    { id: '18', name: 'Ferguson', isFavorite: true },
    { id: '19', name: 'Generac', isFavorite: false },
    { id: '20', name: 'Gordon Electric Supply, Inc', isFavorite: false },
  ];

  if (search) {
    return mockVendors.filter(v => 
      v.name.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  return mockVendors;
}
