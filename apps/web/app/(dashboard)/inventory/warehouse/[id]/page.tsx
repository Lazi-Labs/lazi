'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft,
  Search, 
  Plus,
  MoreHorizontal,
  Grid3X3,
  List,
  Filter,
  ChevronDown,
  Warehouse,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Materials Tab
function MaterialsTab({ warehouseId }: { warehouseId: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const { data: materials, isLoading } = useQuery({
    queryKey: ['warehouse-materials', warehouseId],
    queryFn: () => fetchWarehouseMaterials(warehouseId),
  });

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search material"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <select className="h-9 border rounded px-3 text-sm bg-background">
            <option>Newest First</option>
            <option>Oldest First</option>
            <option>Name A-Z</option>
          </select>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
          <div className="flex border rounded">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-1" />
            Add material
          </Button>
          <Button variant="outline" size="sm">
            Bulk Edit Mode
          </Button>
        </div>
      </div>

      {/* Materials Count */}
      <div className="text-sm text-muted-foreground">
        {materials?.length || 0} materials
      </div>

      {/* Materials Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 p-3"><Checkbox /></th>
              <th className="text-left p-3 font-medium">NAME</th>
              <th className="text-left p-3 font-medium">CATEGORY</th>
              <th className="text-left p-3 font-medium">$ CLIENT / BUSINESS</th>
              <th className="text-left p-3 font-medium">LAST UPDATE</th>
              <th className="text-left p-3 font-medium">POSITION</th>
              <th className="text-left p-3 font-medium">QTY</th>
              <th className="w-10 p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : materials?.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No materials found</td></tr>
            ) : (
              materials?.map((material: any) => (
                <tr key={material.id} className="border-t hover:bg-muted/30">
                  <td className="p-3"><Checkbox /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <a href="#" className="text-blue-600 hover:underline font-medium">{material.name}</a>
                        <div className="text-xs text-muted-foreground">{material.code}</div>
                        <Badge variant="secondary" className="text-xs mt-1">Single</Badge>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {material.categories?.map((cat: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{cat}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">${material.clientPrice?.toFixed(2)} / ${material.businessPrice?.toFixed(2)}</td>
                  <td className="p-3">
                    <span className="text-blue-600">{material.lastUpdate}</span>
                  </td>
                  <td className="p-3">{material.position || '-'}</td>
                  <td className="p-3">
                    {material.qty === 0 ? (
                      <span className="flex items-center gap-1 text-red-500">
                        0 <AlertTriangle className="h-4 w-4" />
                      </span>
                    ) : (
                      material.qty
                    )}
                  </td>
                  <td className="p-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Consumables Tab
function ConsumablesTab({ warehouseId }: { warehouseId: string }) {
  const { data: consumables, isLoading } = useQuery({
    queryKey: ['warehouse-consumables', warehouseId],
    queryFn: () => fetchWarehouseConsumables(warehouseId),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by item" className="pl-8 h-9" />
        </div>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-1" />
          Add Consumable
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">{consumables?.length || 0} consumable</div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 p-3"><Checkbox /></th>
              <th className="text-left p-3 font-medium">NAME</th>
              <th className="text-left p-3 font-medium">QTY</th>
              <th className="text-left p-3 font-medium">TRUCKS</th>
              <th className="text-left p-3 font-medium">COST FOR BUSINESS</th>
              <th className="w-10 p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : consumables?.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No consumables found</td></tr>
            ) : (
              consumables?.map((item: any) => (
                <tr key={item.id} className="border-t hover:bg-muted/30">
                  <td className="p-3"><Checkbox /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="text-blue-600 hover:underline">{item.name}</span>
                    </div>
                  </td>
                  <td className="p-3">{item.qty} ea</td>
                  <td className="p-3">{item.trucks}</td>
                  <td className="p-3">${item.cost?.toFixed(2)}</td>
                  <td className="p-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-4 text-sm">
        <span>Rows: <select className="border rounded px-2 py-1"><option>10</option></select></span>
        <span>Page: <select className="border rounded px-2 py-1"><option>1</option></select></span>
      </div>
    </div>
  );
}

// Tools Tab
function ToolsTab({ warehouseId }: { warehouseId: string }) {
  const { data: tools, isLoading } = useQuery({
    queryKey: ['warehouse-tools', warehouseId],
    queryFn: () => fetchWarehouseTools(warehouseId),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tools" className="pl-8 h-9" />
        </div>
        <div className="flex items-center gap-2">
          <select className="h-9 border rounded px-3 text-sm bg-background">
            <option>Newest First</option>
          </select>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
          <div className="flex border rounded">
            <Button variant="ghost" size="icon" className="h-9 w-9"><Grid3X3 className="h-4 w-4" /></Button>
            <Button variant="secondary" size="icon" className="h-9 w-9"><List className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">{tools?.length || 0} tool</div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 p-3"><Checkbox /></th>
              <th className="text-left p-3 font-medium">NAME</th>
              <th className="text-left p-3 font-medium">ASSIGNED TO</th>
              <th className="text-left p-3 font-medium">JOBS</th>
              <th className="text-left p-3 font-medium">STATUS</th>
              <th className="text-left p-3 font-medium">POSITION</th>
              <th className="text-left p-3 font-medium">LAST UPDATE</th>
              <th className="w-10 p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : tools?.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No tools found</td></tr>
            ) : (
              tools?.map((tool: any) => (
                <tr key={tool.id} className="border-t hover:bg-muted/30">
                  <td className="p-3"><Checkbox /></td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <a href="#" className="text-blue-600 hover:underline font-medium">{tool.name}</a>
                        <div className="text-xs text-muted-foreground">{tool.type}</div>
                        <div className="text-xs text-muted-foreground">{tool.serialNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{tool.assignedTo || '-'}</td>
                  <td className="p-3">
                    {tool.hasJobs && <span className="w-3 h-3 bg-green-500 rounded-full inline-block"></span>}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">{tool.status}</Badge>
                  </td>
                  <td className="p-3">{tool.position || '-'}</td>
                  <td className="p-3 text-blue-600">{tool.lastUpdate}</td>
                  <td className="p-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Kits Tab
function KitsTab({ warehouseId }: { warehouseId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search kits" className="pl-8 h-9" />
        </div>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
          <Plus className="h-4 w-4 mr-1" />
          Add Kit
        </Button>
      </div>

      <div className="text-sm text-muted-foreground">0 kits</div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 p-3"><Checkbox /></th>
              <th className="text-left p-3 font-medium">NAME</th>
              <th className="text-left p-3 font-medium">LAST UPDATE</th>
              <th className="text-left p-3 font-medium">QTY MATERIALS</th>
              <th className="text-left p-3 font-medium">PRICE</th>
              <th className="text-left p-3 font-medium">AVAILABILITY</th>
              <th className="text-left p-3 font-medium">POSITION</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="p-12 text-center text-muted-foreground">
                You have not created any <a href="#" className="text-blue-600 underline">kits</a> yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Replenishment List Tab
function ReplenishmentListTab({ warehouseId }: { warehouseId: string }) {
  const [subTab, setSubTab] = useState('materials');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 border-b">
        <button 
          onClick={() => setSubTab('materials')}
          className={cn("pb-2 text-sm", subTab === 'materials' ? "border-b-2 border-primary font-medium" : "text-muted-foreground")}
        >
          Materials
        </button>
        <button 
          onClick={() => setSubTab('consumables')}
          className={cn("pb-2 text-sm", subTab === 'consumables' ? "border-b-2 border-primary font-medium" : "text-muted-foreground")}
        >
          Consumables
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select className="h-9 border rounded px-3 text-sm bg-background">
            <option>Newest First</option>
          </select>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search material" className="pl-8 h-9" />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">0 Materials</div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 p-3"><Checkbox /></th>
              <th className="text-left p-3 font-medium">NAME</th>
              <th className="text-left p-3 font-medium">CATEGORY</th>
              <th className="text-left p-3 font-medium">$ CLIENT / BUSINESS</th>
              <th className="text-left p-3 font-medium">LAST UPDATE</th>
              <th className="text-left p-3 font-medium">POSITION</th>
              <th className="text-left p-3 font-medium">QTY</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="p-12 text-center text-muted-foreground">
                Everything is good, your materials are in place
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Inventory Counts Tab
function InventoryCountsTab({ warehouseId }: { warehouseId: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
        <Package className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground mb-4">You don't have any planned inventory counts.</p>
      <Button className="bg-teal-600 hover:bg-teal-700">
        <Plus className="h-4 w-4 mr-1" />
        Create Inventory Count
      </Button>
    </div>
  );
}

// Analytics Tab
function AnalyticsTab({ warehouseId }: { warehouseId: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Total Location Value</h3>
          <p className="text-2xl font-bold">$1,744.90</p>
        </div>
        <select className="h-9 border rounded px-3 text-sm bg-background">
          <option>Week</option>
          <option>Month</option>
          <option>Year</option>
        </select>
      </div>

      <div>
        <h3 className="font-medium mb-2">Movement Statistics</h3>
        <div className="flex items-center gap-4 text-sm mb-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> Added materials (0)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> Used materials (0)</span>
        </div>
        <div className="h-48 border rounded-lg flex items-center justify-center text-muted-foreground">
          Chart placeholder
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-4">Trending Statistics</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">MATERIAL NAME</th>
                <th className="text-left p-3 font-medium">ITEM #</th>
                <th className="text-left p-3 font-medium">MANUFACTURER</th>
                <th className="text-left p-3 font-medium">CATEGORIES</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">No statistic</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Activity Tab
function ActivityTab({ warehouseId }: { warehouseId: string }) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['warehouse-activity', warehouseId],
    queryFn: () => fetchWarehouseActivity(warehouseId),
  });

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Nov 06, 2025</h3>
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-muted-foreground">Loading activity...</div>
        ) : activities?.length === 0 ? (
          <div className="text-muted-foreground">No activity found</div>
        ) : (
          activities?.map((activity: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                  activity.type === 'add' ? "bg-green-100 text-green-600" : 
                  activity.type === 'change' ? "bg-yellow-100 text-yellow-600" :
                  activity.type === 'transfer' ? "bg-blue-100 text-blue-600" : "bg-gray-100"
                )}>
                  {activity.type === 'add' ? '+' : activity.type === 'change' ? '●' : '↔'}
                </span>
                <span className="text-sm">{activity.description}</span>
              </div>
              <span className="text-sm text-muted-foreground">{activity.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Receipts Tab
function ReceiptsTab({ warehouseId }: { warehouseId: string }) {
  const [subTab, setSubTab] = useState('pending');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 border-b">
        <button 
          onClick={() => setSubTab('pending')}
          className={cn("pb-2 text-sm", subTab === 'pending' ? "border-b-2 border-primary font-medium" : "text-muted-foreground")}
        >
          Pending
        </button>
        <button 
          onClick={() => setSubTab('approved')}
          className={cn("pb-2 text-sm", subTab === 'approved' ? "border-b-2 border-primary font-medium" : "text-muted-foreground")}
        >
          Approved
        </button>
        <button 
          onClick={() => setSubTab('rejected')}
          className={cn("pb-2 text-sm", subTab === 'rejected' ? "border-b-2 border-primary font-medium" : "text-muted-foreground")}
        >
          Rejected
        </button>
      </div>

      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">
          You have not created any <a href="#" className="text-blue-600 underline">Receipts</a> yet
        </p>
      </div>
    </div>
  );
}

// Main Warehouse Detail Page
export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const warehouseId = params.id as string;
  const [activeTab, setActiveTab] = useState('materials');

  const { data: warehouse } = useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: () => fetchWarehouse(warehouseId),
  });

  return (
    <div className="h-full flex flex-col">
      {/* Back Link */}
      <div className="p-4 border-b">
        <button 
          onClick={() => router.push('/inventory')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Stock
        </button>
      </div>

      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
            <Warehouse className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">{warehouse?.name || 'Office'}</h1>
            <p className="text-sm text-muted-foreground">{warehouse?.address || '13932 Washington Rd, Largo, FL 33774'}</p>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white border rounded-lg p-4 w-64">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xs">📅</span>
            </span>
            <div>
              <div className="text-sm font-medium">11/06/2025</div>
              <div className="text-xs text-muted-foreground">Stock UPD: about 2 months ago</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-muted-foreground">Location Value</div>
              <div className="font-semibold">$1,744.90</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Material Count: <strong>371</strong>
            </span>
            <span className="flex items-center gap-1 text-red-500">
              ✕ Total Tools: <strong>1</strong>
            </span>
          </div>
        </div>
      </div>

      {/* User Avatars */}
      <div className="px-4 pb-4 flex gap-2">
        <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white text-xs font-medium">YR</div>
        <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs">👤</div>
      </div>

      {/* Tabs */}
      <div className="flex-1 px-4 pb-4 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 w-full justify-start rounded-lg h-auto p-1 mb-4">
            <TabsTrigger value="materials" className="rounded px-4 py-2 data-[state=active]:bg-white">Materials</TabsTrigger>
            <TabsTrigger value="consumables" className="rounded px-4 py-2 data-[state=active]:bg-white">Consumables</TabsTrigger>
            <TabsTrigger value="tools" className="rounded px-4 py-2 data-[state=active]:bg-white">Tools</TabsTrigger>
            <TabsTrigger value="kits" className="rounded px-4 py-2 data-[state=active]:bg-white">Kits</TabsTrigger>
            <TabsTrigger value="replenishment" className="rounded px-4 py-2 data-[state=active]:bg-white">Replenishment List</TabsTrigger>
            <TabsTrigger value="inventory-counts" className="rounded px-4 py-2 data-[state=active]:bg-white">Inventory Counts</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded px-4 py-2 data-[state=active]:bg-white">Analytics</TabsTrigger>
            <TabsTrigger value="activity" className="rounded px-4 py-2 data-[state=active]:bg-white">Activity</TabsTrigger>
            <TabsTrigger value="receipts" className="rounded px-4 py-2 data-[state=active]:bg-white">Receipts</TabsTrigger>
          </TabsList>

          <TabsContent value="materials"><MaterialsTab warehouseId={warehouseId} /></TabsContent>
          <TabsContent value="consumables"><ConsumablesTab warehouseId={warehouseId} /></TabsContent>
          <TabsContent value="tools"><ToolsTab warehouseId={warehouseId} /></TabsContent>
          <TabsContent value="kits"><KitsTab warehouseId={warehouseId} /></TabsContent>
          <TabsContent value="replenishment"><ReplenishmentListTab warehouseId={warehouseId} /></TabsContent>
          <TabsContent value="inventory-counts"><InventoryCountsTab warehouseId={warehouseId} /></TabsContent>
          <TabsContent value="analytics"><AnalyticsTab warehouseId={warehouseId} /></TabsContent>
          <TabsContent value="activity"><ActivityTab warehouseId={warehouseId} /></TabsContent>
          <TabsContent value="receipts"><ReceiptsTab warehouseId={warehouseId} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// API Fetch Functions
async function fetchWarehouse(id: string) {
  return { id, name: 'Office', address: '13932 Washington Rd, Largo, FL 33774' };
}

async function fetchWarehouseMaterials(warehouseId: string) {
  return [
    { id: '1', name: 'Junction Box 3 Hole Intermatic', code: '7-B5175-1', categories: ['Junction', 'Junction Box'], clientPrice: 41.00, businessPrice: 20.08, lastUpdate: '11/06/2025', position: '', qty: 15 },
    { id: '2', name: 'Junction Box 5 Hole Intermatic', code: '7-B2475-1', categories: ['Junction Box'], clientPrice: 66.00, businessPrice: 35.92, lastUpdate: '11/06/2025', position: '', qty: 15 },
    { id: '3', name: 'Split Box RAMPS', code: '5-26', categories: ['Road Connectors'], clientPrice: 4.76, businessPrice: 2.38, lastUpdate: '11/06/2025', position: '', qty: 100 },
    { id: '4', name: 'Junction Box Bracket Intermatic', code: '9-A114', categories: ['Junction', 'Junction Box'], clientPrice: 13.90, businessPrice: 6.25, lastUpdate: '11/06/2025', position: '', qty: 10 },
    { id: '5', name: 'MISC PARTS $$', code: 'MISC', categories: ['Misc'], clientPrice: 10.00, businessPrice: 5.00, lastUpdate: '11/06/2025', position: '', qty: 0 },
    { id: '6', name: 'Direct Burial Ground Clamp 1/2" - 1"', code: 'D-JD', categories: ['Road Connectors'], clientPrice: 0.00, businessPrice: 4.22, lastUpdate: '11/06/2025', position: '', qty: 0 },
  ];
}

async function fetchWarehouseConsumables(warehouseId: string) {
  return [
    { id: '1', name: 'Duct Seal', qty: 20, trucks: 0, cost: 15.25 },
  ];
}

async function fetchWarehouseTools(warehouseId: string) {
  return [
    { id: '1', name: 'Milwaukee Hammer Drill', type: 'Drill', serialNumber: '1855447', assignedTo: '', hasJobs: true, status: 'Available', position: '-', lastUpdate: '11/06/2025' },
  ];
}

async function fetchWarehouseActivity(warehouseId: string) {
  return [
    { type: 'add', description: 'Yanni Ramos added 1 material to "Office"', time: '8:42 PM' },
    { type: 'change', description: 'Yanni Ramos changed min/max for 1 material from "Office"', time: '8:42 PM' },
    { type: 'add', description: 'Yanni Ramos added 1 material to "Office"', time: '8:42 PM' },
    { type: 'change', description: 'Yanni Ramos changed min/max for 1 material from "Office"', time: '8:42 PM' },
    { type: 'add', description: 'Yanni Ramos added 1 material to "Office"', time: '8:41 PM' },
    { type: 'change', description: 'Yanni Ramos changed min/max for 1 material from "Office"', time: '8:41 PM' },
    { type: 'transfer', description: 'Yanni Ramos transferred 1 material from "Office" to "2023 F250 Lariat"', time: '8:41 PM' },
    { type: 'add', description: 'Yanni Ramos added 1 material to "Office"', time: '8:41 PM' },
    { type: 'change', description: 'Yanni Ramos changed min/max for 1 material from "Office"', time: '8:40 PM' },
    { type: 'transfer', description: 'Service Titan transferred 4 materials from "Office" to "Job 61669523 | Largo 110 Live Oak Lane FL | Kelly Pools"', time: '8:37 PM' },
  ];
}
