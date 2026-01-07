'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Copy, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  Download,
  Upload,
  Eye,
  Pencil,
  X,
  Trash2,
  Scissors,
  Save,
  ImagePlus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { KitSelectorModal } from './kits/KitSelectorModal';

interface ServiceDetailPageProps {
  serviceId: string | null;
  onClose: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

interface Service {
  id: string;
  stId?: string;
  code: string;
  name: string;
  displayName?: string;
  description?: string;
  warranty?: string;
  price: number;
  memberPrice?: number;
  addOnPrice?: number;
  memberAddOnPrice?: number;
  durationHours?: number;
  active: boolean;
  taxable?: boolean;
  bonus?: number;
  surchargePercent?: number;
  rateCode?: string;
  marginPercent?: number;
  laborCost?: number;
  materialCost?: number;
  account?: string;
  crossSale?: string;
  noDiscounts?: boolean;
  roundUp?: string;
  defaultImageUrl?: string | null;
  videoUrl?: string;
  categories?: CategoryTag[];
  upgrades?: string[];
  recommendations?: string[];
  materials?: MaterialLineItem[];
  equipment?: EquipmentLineItem[];
}

interface CategoryTag {
  id: string;
  path: string;
  name: string;
}

interface MaterialLineItem {
  id: string;
  materialId: string;
  code: string;
  name: string;
  description?: string;
  quantity: number;
  unitCost: number;
  vendorName?: string;
  imageUrl?: string;
}

interface EquipmentLineItem {
  id: string;
  equipmentId: string;
  code: string;
  name: string;
  description?: string;
  quantity: number;
  unitCost: number;
  vendorName?: string;
  imageUrl?: string;
}

export function ServiceDetailPage({ serviceId, onClose, onNavigate }: ServiceDetailPageProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'materials' | 'equipment'>('materials');
  const [materialSearch, setMaterialSearch] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  
  // Local form state
  const [formData, setFormData] = useState<Partial<Service>>({});
  
  // Sync state
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('synced');
  const [isSaving, setIsSaving] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const { data: service, isLoading } = useQuery({
    queryKey: ['service-detail', serviceId],
    queryFn: () => fetchService(serviceId!),
    enabled: !!serviceId,
  });

  useEffect(() => {
    if (service) {
      setFormData(service);
    }
  }, [service]);

  const updateField = (field: keyof Service, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  // SAVE handler - saves locally to CRM table
  const handleSave = async () => {
    if (!serviceId) return;
    setIsSaving(true);
    
    try {
      const response = await fetch(
        apiUrl(`/api/pricebook/services/${serviceId}`),
        {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'x-tenant-id': '3222348440',
          },
          body: JSON.stringify({
            code: formData.code,
            name: formData.name,
            displayName: formData.displayName,
            description: formData.description,
            price: formData.price,
            memberPrice: formData.memberPrice,
            addOnPrice: formData.addOnPrice,
            hours: formData.durationHours,
            active: formData.active,
            taxable: formData.taxable,
            warranty: formData.warranty,
          }),
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setSyncStatus('pending');
        toast({
          title: 'Changes saved',
          description: 'Changes saved locally. Click PUSH to sync with ServiceTitan.',
        });
      } else {
        toast({
          title: 'Save failed',
          description: result.error || 'Failed to save',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // PUSH handler - pushes to ServiceTitan
  const handlePush = async () => {
    if (!serviceId) return;
    setIsPushing(true);
    
    try {
      const response = await fetch(
        apiUrl(`/api/pricebook/db/services/${serviceId}/push`),
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-tenant-id': '3222348440',
          },
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setSyncStatus('synced');
        toast({
          title: 'Changes pushed',
          description: 'Changes pushed to ServiceTitan!',
        });
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['service-detail', serviceId] });
      } else {
        setSyncStatus('error');
        toast({
          title: 'Push failed',
          description: result.error || 'Failed to push to ServiceTitan',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Push error:', error);
      setSyncStatus('error');
      toast({
        title: 'Push failed',
        description: 'Failed to push to ServiceTitan',
        variant: 'destructive',
      });
    } finally {
      setIsPushing(false);
    }
  };

  // PULL handler - pulls latest from ServiceTitan
  const handlePull = async () => {
    if (!serviceId) return;
    
    const confirmed = window.confirm(
      'This will overwrite your local changes with the latest data from ServiceTitan. Continue?'
    );
    if (!confirmed) return;
    
    setIsPulling(true);
    
    try {
      const response = await fetch(
        apiUrl(`/api/pricebook/db/services/${serviceId}/pull`),
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-tenant-id': '3222348440',
          },
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setSyncStatus('synced');
        toast({
          title: 'Data refreshed',
          description: 'Pulled latest from ServiceTitan',
        });
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['service-detail', serviceId] });
      } else {
        toast({
          title: 'Pull failed',
          description: result.error || 'Failed to pull from ServiceTitan',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Pull error:', error);
      toast({
        title: 'Pull failed',
        description: 'Failed to pull from ServiceTitan',
        variant: 'destructive',
      });
    } finally {
      setIsPulling(false);
    }
  };

  // Handle applying a kit - adds materials from the kit to this service
  const handleApplyKit = (kitMaterials: MaterialLineItem[]) => {
    setFormData(prev => {
      const existingMaterials = prev.materials || [];

      // Merge materials - if same materialId exists, add quantities
      const materialsMap = new Map<string, MaterialLineItem>();

      // Add existing materials first
      existingMaterials.forEach(m => {
        materialsMap.set(m.materialId, { ...m });
      });

      // Add or merge kit materials
      kitMaterials.forEach(km => {
        const existing = materialsMap.get(km.materialId);
        if (existing) {
          // Material already exists - add to quantity
          existing.quantity += km.quantity;
        } else {
          // New material - add with unique ID
          materialsMap.set(km.materialId, {
            ...km,
            id: `kit-${km.materialId}-${Date.now()}`,
          });
        }
      });

      return {
        ...prev,
        materials: Array.from(materialsMap.values()),
      };
    });

    setSyncStatus('pending');
    toast({
      title: 'Kit applied',
      description: `Added ${kitMaterials.length} materials from kit`,
    });
  };

  const materialNet = formData.materials?.reduce((sum, m) => sum + (m.quantity * m.unitCost), 0) || 0;
  const materialList = materialNet * 3.15; // Example markup

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading service...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Global Header */}
      <div className="border-b bg-card">
        {/* Mobile Header - simplified */}
        <div className="flex md:hidden items-center justify-between px-3 py-2">
          <Button variant="ghost" size="sm" className="gap-1 min-h-[44px]" onClick={onClose}>
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "gap-1 min-h-[44px]",
                syncStatus === 'pending' && "bg-orange-600 hover:bg-orange-700 text-white"
              )}
              onClick={handlePush}
              disabled={isPushing || syncStatus === 'synced'}
            >
              {isPushing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {/* Desktop Header - full */}
        <div className="hidden md:flex items-center justify-between px-4 py-2">
          {/* Left Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1" onClick={onClose}>
              <ChevronLeft className="h-4 w-4" />
              Back to List
            </Button>
            <Button variant="ghost" size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              NEW
            </Button>
            <Button variant="ghost" size="sm" className="gap-1">
              <Search className="h-3.5 w-3.5" />
              SEARCH
            </Button>
            <Button variant="ghost" size="sm" className="gap-1">
              <Copy className="h-3.5 w-3.5" />
              DUPLICATE
            </Button>
            <Button variant="ghost" size="sm" className="gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              REFRESH
            </Button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1"
              onClick={handlePull}
              disabled={isPulling}
            >
              {isPulling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              PULL
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "gap-1",
                syncStatus === 'pending' && "bg-orange-600 hover:bg-orange-700 text-white"
              )}
              onClick={handlePush}
              disabled={isPushing || syncStatus === 'synced'}
            >
              {isPushing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              PUSH
              {syncStatus === 'pending' && <span className="ml-1 text-xs">(pending)</span>}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              SAVE
            </Button>
            {syncStatus === 'pending' && (
              <span className="text-xs text-orange-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Unsaved changes
              </span>
            )}
            <Button variant="ghost" size="sm" className="gap-1">
              <Eye className="h-3.5 w-3.5" />
              VIEW
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left Navigation - hidden on mobile */}
          <div className="hidden md:flex w-16 border-r flex-col items-center py-4 gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-col gap-1 h-auto py-2"
              onClick={() => onNavigate?.('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-xs">PREV</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex-col gap-1 h-auto py-2"
              onClick={() => onNavigate?.('next')}
            >
              <span className="text-xs">NEXT</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Center Content */}
          <div className="flex-1 p-3 md:p-4 min-w-0">
            {/* Service Identity Section */}
            <div className="grid grid-cols-1 md:grid-cols-[80px_1fr_auto] gap-2 mb-4">
              {/* CODE */}
              <div className="text-xs text-muted-foreground font-medium py-2">CODE</div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Input 
                  value={formData.code || ''} 
                  onChange={(e) => updateField('code', e.target.value)}
                  className="font-mono text-sm h-10 md:h-8 flex-1"
                />
              </div>
              
              {/* NAME */}
              <div className="text-xs text-muted-foreground font-medium py-2">NAME</div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Input 
                  value={formData.name || ''} 
                  onChange={(e) => updateField('name', e.target.value)}
                  className="text-sm h-10 md:h-8 flex-1"
                />
                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
                  <Pencil className="h-4 w-4 md:h-3 md:w-3" />
                </Button>
              </div>

              {/* DESC */}
              <div className="text-xs text-muted-foreground font-medium py-2">DESC</div>
              <div className="md:col-span-2">
                <Textarea 
                  value={formData.description || ''} 
                  onChange={(e) => updateField('description', e.target.value)}
                  className="text-sm min-h-[80px] md:min-h-[60px] resize-none"
                  placeholder="Service description..."
                />
              </div>

              {/* WARR */}
              <div className="text-xs text-muted-foreground font-medium py-2">WARR</div>
              <div className="md:col-span-2 flex items-center gap-2">
                <Input 
                  value={formData.warranty || ''} 
                  onChange={(e) => updateField('warranty', e.target.value)}
                  className="text-sm h-10 md:h-8 flex-1"
                  placeholder="Warranty terms..."
                />
                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
                  <Pencil className="h-4 w-4 md:h-3 md:w-3" />
                </Button>
              </div>

              {/* UPGR */}
              <div className="text-xs text-muted-foreground font-medium py-2">UPGR</div>
              <div className="md:col-span-2 flex items-center gap-2">
                <div className="flex-1 border rounded-md p-2 min-h-[44px] md:min-h-[32px] flex items-center gap-2 flex-wrap">
                  {formData.upgrades?.map((u, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {u}
                      <X className="h-3 w-3 cursor-pointer" />
                    </Badge>
                  ))}
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
                  <Plus className="h-4 w-4 md:h-3 md:w-3" />
                </Button>
              </div>

              {/* REC */}
              <div className="text-xs text-muted-foreground font-medium py-2">REC</div>
              <div className="md:col-span-2 flex items-center gap-2">
                <div className="flex-1 border rounded-md p-2 min-h-[44px] md:min-h-[32px] flex items-center gap-2 flex-wrap">
                  {formData.recommendations?.map((r, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {r}
                      <X className="h-3 w-3 cursor-pointer" />
                    </Badge>
                  ))}
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
                  <Plus className="h-4 w-4 md:h-3 md:w-3" />
                </Button>
              </div>

              {/* CAT */}
              <div className="text-xs text-muted-foreground font-medium py-2">CAT</div>
              <div className="md:col-span-2 flex items-center gap-2">
                <div className="flex-1 border rounded-md p-2 min-h-[44px] md:min-h-[32px] flex items-center gap-2 flex-wrap">
                  {formData.categories?.map((cat) => (
                    <Badge key={cat.id} variant="outline" className="gap-1 text-xs">
                      {cat.path}
                      <X className="h-3 w-3 cursor-pointer" />
                    </Badge>
                  )) || (
                    <span className="text-xs text-muted-foreground">No categories assigned</span>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0">
                  <Plus className="h-4 w-4 md:h-3 md:w-3" />
                </Button>
              </div>
            </div>

            {/* Materials / Equipment Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'materials' | 'equipment')}>
              <TabsList className="mb-2">
                <TabsTrigger value="materials" className="uppercase text-xs">Materials</TabsTrigger>
                <TabsTrigger value="equipment" className="uppercase text-xs">Equipment</TabsTrigger>
              </TabsList>

              <TabsContent value="materials" className="mt-0">
                {/* Materials Toolbar */}
                <div className="flex flex-wrap items-center gap-1 mb-2 p-2 bg-muted/30 rounded-md">
                  <Button variant="secondary" size="sm" className="text-xs h-9 md:h-7 min-h-[44px] md:min-h-0">
                    <Search className="h-3 w-3 mr-1" />
                    SEARCH
                  </Button>
                  <Button variant="secondary" size="sm" className="text-xs h-9 md:h-7 min-h-[44px] md:min-h-0 hidden sm:flex">
                    <Copy className="h-3 w-3 mr-1" />
                    COPY
                  </Button>
                  <Button variant="secondary" size="sm" className="text-xs h-9 md:h-7 min-h-[44px] md:min-h-0 hidden sm:flex">
                    PASTE
                  </Button>
                  <Button variant="secondary" size="sm" className="text-xs h-9 md:h-7 min-h-[44px] md:min-h-0 hidden md:flex">
                    <Save className="h-3 w-3 mr-1" />
                    SAVE AS...
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs h-9 md:h-7 min-h-[44px] md:min-h-0"
                    onClick={() => setIsKitModalOpen(true)}
                  >
                    LOAD KIT...
                  </Button>
                  <div className="flex-1 min-w-[100px]" />
                  <div className="relative w-full sm:w-auto mt-2 sm:mt-0">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input 
                      placeholder="Search this list" 
                      value={materialSearch}
                      onChange={(e) => setMaterialSearch(e.target.value)}
                      className="pl-7 h-10 md:h-7 text-xs w-full sm:w-48"
                    />
                  </div>
                </div>

                {/* Materials Header - hidden on mobile, shown on desktop */}
                <div className="hidden md:grid grid-cols-[auto_1fr_auto_80px_80px_auto_1fr_auto] gap-2 px-2 py-1 text-xs text-muted-foreground font-medium border-b">
                  <div className="w-10"></div>
                  <div>Item</div>
                  <div></div>
                  <div className="text-center">QTY</div>
                  <div className="text-right">Cost</div>
                  <div></div>
                  <div>Vendor</div>
                  <div></div>
                </div>

                {/* Materials List */}
                <div className="divide-y max-h-[400px] md:max-h-[300px] overflow-auto">
                  {formData.materials?.length ? (
                    formData.materials
                      .filter(m => !materialSearch || 
                        m.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
                        m.code.toLowerCase().includes(materialSearch.toLowerCase())
                      )
                      .map((material) => (
                        <MaterialRow 
                          key={material.id} 
                          material={material} 
                          onNavigate={(materialId) => {
                            window.location.href = `/dashboard/pricebook/materials/${materialId}`;
                          }}
                        />
                      ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No materials added. Click SEARCH to add materials.
                    </div>
                  )}
                </div>

                {/* Materials Footer */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2 bg-muted/30 rounded-md mt-2 text-sm">
                  <Button variant="ghost" size="sm" className="text-xs text-destructive min-h-[44px] md:min-h-0">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove All
                  </Button>
                  <label className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox />
                    Hide linked materials
                  </label>
                  <div className="flex flex-wrap items-center gap-3 md:gap-6">
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground mr-2">NET</span>
                      <span className="font-semibold">{formatCurrency(materialNet)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground mr-2">LIST</span>
                      <span className="font-semibold">{formatCurrency(materialList)}</span>
                    </div>
                    <div className="hidden md:flex items-center gap-1">
                      <Input className="w-16 h-7 text-xs text-right" placeholder="%" />
                      <span className="text-xs text-muted-foreground">override</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="equipment" className="mt-0">
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No equipment added. Click SEARCH to add equipment.
                </div>
              </TabsContent>
            </Tabs>

            {/* Video URL */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Video URL</span>
              <Input 
                value={formData.videoUrl || ''} 
                onChange={(e) => updateField('videoUrl', e.target.value)}
                className="text-sm h-8 flex-1"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Right Sidebar - Pricing & Image - below content on mobile */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l p-3 md:p-4 space-y-3 flex-shrink-0">
            {/* Status & Hours */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox 
                    checked={formData.active} 
                    onCheckedChange={(v) => updateField('active', v)}
                  />
                  ACTIVE?
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">SOLD HRS</span>
                  <Input
                    type="number"
                    value={formData.durationHours || ''}
                    onChange={(e) => updateField('durationHours', parseFloat(e.target.value))}
                    className="w-16 h-7 text-xs text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Fields */}
            <div className="space-y-2">
              <PriceField label="PRICE" value={formData.price} onChange={(v) => updateField('price', v)} />
              <PriceField label="MEMBER" value={formData.memberPrice} onChange={(v) => updateField('memberPrice', v)} />
              <PriceField label="ADD-ON" value={formData.addOnPrice} onChange={(v) => updateField('addOnPrice', v)} />
              <PriceField label="MEMBER ADD-ON" value={formData.memberAddOnPrice} onChange={(v) => updateField('memberAddOnPrice', v)} />
            </div>

            {/* Rate & Margin */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">RATE CODE</span>
                <Input 
                  value={formData.rateCode || ''} 
                  onChange={(e) => updateField('rateCode', e.target.value)}
                  className="w-20 h-7 text-xs"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">MARGIN %</span>
                <div className="flex gap-1">
                  <Input
                    placeholder="LAB"
                    value={formData.laborCost || ''}
                    onChange={(e) => updateField('laborCost', parseFloat(e.target.value))}
                    className="w-20 h-7 text-xs"
                  />
                  <Input
                    placeholder="MAT"
                    value={formData.materialCost || ''}
                    onChange={(e) => updateField('materialCost', parseFloat(e.target.value))}
                    className="w-20 h-7 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Other Fields */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">BONUS</span>
                <Input 
                  value={formData.bonus || ''} 
                  onChange={(e) => updateField('bonus', parseFloat(e.target.value))}
                  className="w-20 h-7 text-xs"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">ACCOUNT</span>
                <Input 
                  value={formData.account || ''} 
                  onChange={(e) => updateField('account', e.target.value)}
                  className="w-20 h-7 text-xs"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">SURCHARGE %</span>
                <Input 
                  value={formData.surchargePercent || ''} 
                  onChange={(e) => updateField('surchargePercent', parseFloat(e.target.value))}
                  className="w-20 h-7 text-xs"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox 
                    checked={formData.taxable} 
                    onCheckedChange={(v) => updateField('taxable', v)}
                  />
                  TAXABLE
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">X-SALE</span>
                <Input 
                  value={formData.crossSale || ''} 
                  onChange={(e) => updateField('crossSale', e.target.value)}
                  className="w-20 h-7 text-xs"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox 
                    checked={formData.noDiscounts} 
                    onCheckedChange={(v) => updateField('noDiscounts', v)}
                  />
                  NO DISCOUNTS
                </label>
              </div>
              
              {/* Round Up Dropdown */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">ROUND UP</span>
                <select 
                  value={formData.roundUp || ''}
                  onChange={(e) => updateField('roundUp', e.target.value)}
                  className="h-7 text-xs border rounded px-2 bg-background"
                >
                  <option value="">None</option>
                  <option value="1">Nearest $1</option>
                  <option value="10">Nearest $10</option>
                  <option value="100">Nearest $100</option>
                </select>
              </div>
            </div>

            {/* Image Panel */}
            <div className="border rounded-lg p-2">
              {formData.defaultImageUrl ? (
                <div className="relative">
                  <img 
                    src={formData.defaultImageUrl} 
                    alt="Service" 
                    className="w-full h-32 object-cover rounded"
                  />
                  <div className="absolute bottom-1 right-1 flex gap-1">
                    <Button variant="secondary" size="sm" className="h-6 text-xs">
                      Use as thumbnail
                    </Button>
                    <Button variant="destructive" size="icon" className="h-6 w-6">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-32 border-2 border-dashed rounded flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:bg-muted/50">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-xs">ADD AN IMAGE...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kit Selector Modal */}
      <KitSelectorModal
        isOpen={isKitModalOpen}
        onClose={() => setIsKitModalOpen(false)}
        onApply={handleApplyKit}
        existingMaterials={formData.materials}
      />
    </div>
  );
}

function PriceField({ label, value, onChange }: { label: string; value?: number; onChange: (v: number) => void }) {
  const formatPrice = (val: number | undefined) => {
    if (val === undefined || val === null) return '';
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">$</span>
        <input 
          type="text"
          inputMode="decimal"
          value={formatPrice(value)} 
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^0-9.]/g, '');
            onChange(parseFloat(cleaned) || 0);
          }}
          className="w-24 h-8 text-sm text-right border rounded px-2 font-medium bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}

function MaterialRow({ material, onNavigate }: { material: MaterialLineItem; onNavigate?: (materialId: string) => void }) {
  const handleClick = () => {
    if (material.materialId && onNavigate) {
      onNavigate(material.materialId);
    }
  };

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden flex items-start gap-3 px-2 py-3 hover:bg-muted/30">
        {/* Image */}
        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden shrink-0">
          {material.imageUrl ? (
            <img src={material.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{material.code}</div>
          <div className="text-xs text-muted-foreground truncate">{material.name}</div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Qty:</span>
              <Input 
                type="number"
                value={material.quantity} 
                className="h-8 w-16 text-xs text-center"
              />
            </div>
            <div className="text-sm text-green-600 font-medium">
              ${material.unitCost.toFixed(2)}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-1">
          <button 
            onClick={handleClick}
            className="p-2 rounded hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="View material details"
          >
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
          <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive min-h-[44px] min-w-[44px]">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden md:grid grid-cols-[auto_1fr_auto_80px_80px_auto_1fr_auto] gap-2 px-2 py-2 items-center hover:bg-muted/30">
        {/* Image */}
        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center overflow-hidden">
          {material.imageUrl ? (
            <img src={material.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        
        {/* Item Info */}
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{material.code}</div>
          <div className="text-xs text-muted-foreground truncate">{material.name}</div>
          <div className="text-xs text-muted-foreground truncate">{material.description}</div>
        </div>

        {/* Edit Icon */}
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Scissors className="h-3 w-3 text-yellow-500" />
        </Button>

        {/* Quantity */}
        <Input 
          type="number"
          value={material.quantity} 
          className="h-7 text-xs text-center"
        />

        {/* Cost */}
        <div className="text-right text-sm text-green-600">
          ${material.unitCost.toFixed(2)}
        </div>

        {/* Arrow - Clickable to navigate to material detail */}
        <button 
          onClick={handleClick}
          className="p-1 rounded hover:bg-muted cursor-pointer"
          title="View material details"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>

        {/* Vendor */}
        <div className="text-xs text-muted-foreground truncate">
          {material.vendorName || 'Default Replenishment Vendor'}
        </div>

        {/* Delete */}
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </>
  );
}

async function fetchService(id: string): Promise<Service> {
  // Use consolidated /api/pricebook/services endpoint for full service details
  const res = await fetch(apiUrl(`/api/pricebook/services/${id}`), {
    headers: {
      'x-tenant-id': '3222348440',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch service');
  return res.json();
}
