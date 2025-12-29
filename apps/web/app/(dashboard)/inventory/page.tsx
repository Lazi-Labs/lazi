'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus,
  MoreHorizontal,
  Warehouse,
  Truck,
  FileText,
  ClipboardList,
  BarChart3,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Warehouses Tab Component
function WarehousesTab() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => fetchWarehouses(),
  });

  return (
    <div className="flex gap-6">
      {/* Left Content */}
      <div className="flex-1 space-y-4">
        {/* Search and Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Warehouses"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <select className="h-9 border rounded px-3 text-sm bg-background">
            <option>Default</option>
          </select>
        </div>

        {/* Warehouses Grid */}
        <div className="flex flex-wrap gap-4">
          {isLoading ? (
            <div className="text-muted-foreground">Loading warehouses...</div>
          ) : (
            <>
              {warehouses?.map((warehouse: any) => (
                <div
                  key={warehouse.id}
                  onClick={() => router.push(`/inventory/warehouse/${warehouse.id}`)}
                  className="w-44 border rounded-lg p-3 bg-white hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-600 font-medium">{warehouse.itemCount || 0} ITEMS</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                  <h3 className="font-medium text-sm">{warehouse.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{warehouse.address}</p>
                  <div className="mt-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                      Active
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Last update: {warehouse.lastUpdate || 'N/A'}</p>
                </div>
              ))}

              {/* Add Warehouse Card */}
              <div className="w-44 border-2 border-dashed rounded-lg p-3 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors min-h-[140px]">
                <Plus className="h-6 w-6 mb-2" />
                <span className="text-sm">Add Warehouse</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar Stats */}
      <div className="w-48 flex-shrink-0 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Popular warehouse</span>
            <select className="text-xs border rounded px-2 py-1 bg-background">
              <option>Week</option>
              <option>Month</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-green-500 text-white text-xs">0 Added</Badge>
            <Badge variant="outline" className="text-xs">0 Moved</Badge>
          </div>
        </div>
        
        <div>
          <span className="text-sm font-medium">Top Materials</span>
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
            <span>✓</span>
            <span>Stocks are great, good job!</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fleet Tab Component
function FleetTab() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: trucks, isLoading } = useQuery({
    queryKey: ['trucks'],
    queryFn: () => fetchTrucks(),
  });

  return (
    <div className="flex gap-6">
      {/* Left Content */}
      <div className="flex-1 space-y-4">
        {/* Search and Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Fleet"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <select className="h-9 border rounded px-3 text-sm bg-background">
            <option>Default</option>
          </select>
        </div>

        {/* Fleet Grid */}
        <div className="flex flex-wrap gap-4">
          {isLoading ? (
            <div className="text-muted-foreground">Loading fleet...</div>
          ) : (
            <>
              {trucks?.map((truck: any) => (
                <div
                  key={truck.id}
                  className="w-44 border rounded-lg p-3 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-600 font-medium">{truck.itemCount || 0} ITEMS</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                  <h3 className="font-medium text-sm">{truck.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{truck.description}</p>
                  <div className="mt-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                      Active
                    </Badge>
                  </div>
                </div>
              ))}

              {/* Add Truck Card */}
              <div className="w-44 border-2 border-dashed rounded-lg p-3 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors min-h-[120px]">
                <Plus className="h-6 w-6 mb-2" />
                <span className="text-sm">Add Truck</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar Stats */}
      <div className="w-48 flex-shrink-0 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Popular truck</span>
            <select className="text-xs border rounded px-2 py-1 bg-background">
              <option>Week</option>
              <option>Month</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-green-500 text-white text-xs">0 Added</Badge>
            <Badge variant="outline" className="text-xs">0 Moved</Badge>
          </div>
        </div>
        
        <div>
          <span className="text-sm font-medium">Top Materials</span>
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
            <span>✓</span>
            <span>Stocks are great, good job!</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Templates Tab Component
function TemplatesTab() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => fetchTemplates(),
  });

  return (
    <div className="space-y-4">
      {/* Templates Grid */}
      <div className="flex gap-4">
        {isLoading ? (
          <div className="text-muted-foreground">Loading templates...</div>
        ) : (
          <>
            {templates?.map((template: any) => (
              <div
                key={template.id}
                className="w-48 border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                <h3 className="font-medium text-sm">{template.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">Materials: {template.materialCount || 0}</p>
                <p className="text-xs text-muted-foreground">Updated {template.lastUpdate || 'N/A'}</p>
              </div>
            ))}

            {/* Add Template Card */}
            <div className="w-48 border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors min-h-[120px]">
              <Plus className="h-8 w-8 mb-2" />
              <span className="text-sm">Add Template</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Pick Lists Tab Component
function PickListsTab() {
  const columns = [
    { id: 'needs-refill', label: 'Needs refill', count: 0 },
    { id: 'ready-to-assemble', label: 'Ready to be assembled', count: 1 },
    { id: 'waiting-pickup', label: 'Waiting for pickup', count: 0 },
    { id: 'completed', label: 'Completed', count: 1 },
    { id: 'archived', label: 'Archived', count: 0 },
  ];

  const { data: pickLists, isLoading } = useQuery({
    queryKey: ['pickLists'],
    queryFn: () => fetchPickLists(),
  });

  return (
    <div className="space-y-4">
      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.id} className="min-w-[220px] flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium">{column.label}</span>
              <Badge variant="secondary" className="text-xs">{column.count}</Badge>
            </div>
            
            <div className="space-y-3">
              {/* Add Pick List Card for first column */}
              {column.id === 'needs-refill' && (
                <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors min-h-[100px]">
                  <Plus className="h-6 w-6 mb-1" />
                  <span className="text-xs">Add Pick List</span>
                </div>
              )}

              {/* Pick List Cards */}
              {pickLists?.filter((pl: any) => pl.status === column.id).map((pickList: any) => (
                <div
                  key={pickList.id}
                  className="border rounded-lg p-3 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{pickList.name}</h4>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 text-xs mb-2">
                    {pickList.itemCount || 0} Items
                  </Badge>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-green-600">●</span>
                      <span>From: {pickList.fromLocation}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-blue-600">●</span>
                      <span>To: {pickList.toLocation}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <div>CRT: {pickList.createdDate}</div>
                    <div>UPD: {pickList.updatedDate}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Inventory Count Tab Component
function InventoryCountTab() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <div className="text-center">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Inventory Count feature coming soon</p>
      </div>
    </div>
  );
}

// Activity Tab Component
function ActivityTab() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <div className="text-center">
        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Activity log coming soon</p>
      </div>
    </div>
  );
}

// Main Stock Page
export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('warehouses');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-semibold">Stock</h1>
      </div>

      {/* Tabs */}
      <div className="flex-1 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 mb-4">
            <TabsTrigger 
              value="warehouses" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Warehouses <Badge variant="secondary" className="ml-1 text-xs">1</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="fleet"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Fleet <Badge variant="secondary" className="ml-1 text-xs">1</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="templates"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Templates <Badge variant="secondary" className="ml-1 text-xs">1</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="pick-lists"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Pick Lists <Badge variant="secondary" className="ml-1 text-xs">1</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="inventory-count"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Inventory Count
            </TabsTrigger>
            <TabsTrigger 
              value="activity"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="warehouses" className="mt-0">
            <WarehousesTab />
          </TabsContent>
          <TabsContent value="fleet" className="mt-0">
            <FleetTab />
          </TabsContent>
          <TabsContent value="templates" className="mt-0">
            <TemplatesTab />
          </TabsContent>
          <TabsContent value="pick-lists" className="mt-0">
            <PickListsTab />
          </TabsContent>
          <TabsContent value="inventory-count" className="mt-0">
            <InventoryCountTab />
          </TabsContent>
          <TabsContent value="activity" className="mt-0">
            <ActivityTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// API Fetch Functions
async function fetchWarehouses() {
  try {
    const res = await fetch('/api/inventory/warehouses');
    if (!res.ok) return [{ id: '1', name: 'Office', address: '13502 Washington Rd, Largo, FL 33774', itemCount: 572, lastUpdate: 'about 2 months ago' }];
    return res.json();
  } catch {
    return [{ id: '1', name: 'Office', address: '13502 Washington Rd, Largo, FL 33774', itemCount: 572, lastUpdate: 'about 2 months ago' }];
  }
}

async function fetchTrucks() {
  try {
    const res = await fetch('/api/inventory/trucks');
    if (!res.ok) return [{ id: '1', name: '2023 F250 Lariat - Ford - F250', description: '33727', itemCount: 7 }];
    return res.json();
  } catch {
    return [{ id: '1', name: '2023 F250 Lariat - Ford - F250', description: '33727', itemCount: 7 }];
  }
}

async function fetchTemplates() {
  try {
    const res = await fetch('/api/inventory/templates');
    if (!res.ok) return [{ id: '1', name: 'Pool Electrical', materialCount: 4, lastUpdate: 'about 2 months ago' }];
    return res.json();
  } catch {
    return [{ id: '1', name: 'Pool Electrical', materialCount: 4, lastUpdate: 'about 2 months ago' }];
  }
}

async function fetchPickLists() {
  try {
    const res = await fetch('/api/inventory/pick-lists');
    if (!res.ok) return [
      { id: '1', name: 'Sock', status: 'ready-to-assemble', itemCount: 3, fromLocation: 'Office', toLocation: '2023 F250 Lariat', createdDate: '11.04.2025', updatedDate: '11.05.2025' },
      { id: '2', name: 'yanni', status: 'completed', itemCount: 1, fromLocation: 'Office', toLocation: '2023 F250 Lariat', createdDate: '11.01.2025', updatedDate: '11.01.2025' },
    ];
    return res.json();
  } catch {
    return [
      { id: '1', name: 'Sock', status: 'ready-to-assemble', itemCount: 3, fromLocation: 'Office', toLocation: '2023 F250 Lariat', createdDate: '11.04.2025', updatedDate: '11.05.2025' },
      { id: '2', name: 'yanni', status: 'completed', itemCount: 1, fromLocation: 'Office', toLocation: '2023 F250 Lariat', createdDate: '11.01.2025', updatedDate: '11.01.2025' },
    ];
  }
}
