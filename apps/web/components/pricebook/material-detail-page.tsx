'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search, 
  Copy, 
  Layers,
  RefreshCw,
  Download,
  Upload,
  Settings,
  X,
  Trash2,
  MoreHorizontal,
  Check,
  ImagePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';

interface Vendor {
  id: string;
  vendorName: string;
  vendorId?: number;
  cost: number;
  vendorPart?: string;
  upcCode?: string;
  preferred?: boolean;
  active?: boolean;
}

interface Material {
  id: string;
  stId?: string;
  code: string;
  name: string;
  displayName?: string;
  description?: string;
  cost: number;
  price: number;
  memberPrice?: number;
  margin?: number;
  taxPercent?: number;
  skuPercent?: number;
  active: boolean;
  taxable?: boolean;
  chargeableByDefault?: boolean;
  trackStock?: boolean;
  roundUp?: string;
  defaultImageUrl?: string | null;
  category?: string;
  categoryPath?: string;
  contact?: string;
  phone?: string;
  email?: string;
  primaryVendor?: Vendor | null;
  vendors?: Vendor[];
}

interface MaterialDetailPageProps {
  materialId?: string;
  onClose?: () => void;
  onSave?: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function MaterialDetailPage({ 
  materialId, 
  onClose, 
  onSave,
  onNavigate 
}: MaterialDetailPageProps) {
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showAddVendor, setShowAddVendor] = useState(false);

  const { data: material, isLoading } = useQuery({
    queryKey: ['material', materialId],
    queryFn: async () => {
      if (!materialId) return null;
      const res = await fetch(apiUrl(`/api/pricebook/materials/${materialId}`));
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!materialId,
  });

  const form = useForm<Material>({
    defaultValues: {
      code: '',
      name: '',
      description: '',
      cost: 0,
      price: 0,
      margin: 70,
      taxPercent: 0,
      skuPercent: 0,
      active: true,
      taxable: true,
      chargeableByDefault: true,
      trackStock: false,
      category: '',
      categoryPath: '',
      contact: '',
      phone: '',
      email: '',
    },
  });

  useEffect(() => {
    if (material) {
      form.reset({
        code: material.code || '',
        name: material.name || '',
        description: material.description || '',
        cost: material.cost || 0,
        price: material.price || 0,
        margin: material.margin || 70,
        taxPercent: material.taxPercent || 0,
        skuPercent: material.skuPercent || 0,
        active: material.active ?? true,
        taxable: material.taxable ?? true,
        chargeableByDefault: material.chargeableByDefault ?? true,
        trackStock: material.trackStock ?? false,
        category: material.category || '',
        categoryPath: material.categoryPath || '',
        contact: material.contact || '',
        phone: material.phone || '',
        email: material.email || '',
      });
      setImagePreview(material.defaultImageUrl || null);
    }
  }, [material, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Material>) => {
      const url = materialId 
        ? `/api/pricebook/materials/${materialId}` 
        : '/api/pricebook/materials';
      
      const res = await fetch(url, {
        method: materialId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook-materials'] });
      queryClient.invalidateQueries({ queryKey: ['material', materialId] });
      onSave?.();
    },
  });

  const cost = form.watch('cost');
  const margin = form.watch('margin');
  const calculatedPrice = cost && margin ? cost / (1 - margin / 100) : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const vendors = material?.vendors || [];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Header Bar - Titanium Style */}
      <div className="bg-[#2d2d2d] text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs" onClick={onClose}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to List
          </Button>
          <span className="font-semibold text-lg mx-4">Materials</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            NEW
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs">
            <Search className="h-3 w-3 mr-1" />
            SEARCH
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs">
            <Copy className="h-3 w-3 mr-1" />
            DUPLICATE
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs">
            <Layers className="h-3 w-3 mr-1" />
            SUB ITEM
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            REFRESH
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs">
            PULL
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs">
            PUSH
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs">
            <Settings className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs">
            MSN
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation */}
        <div className="w-16 border-r flex flex-col items-center py-4 gap-2 bg-muted/30">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1 text-xs"
            onClick={() => onNavigate?.('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
            PREV
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-1 text-xs"
            onClick={() => onNavigate?.('next')}
          >
            NEXT
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-auto">
          <div className="flex h-full">
            {/* Left Form Fields */}
            <div className="flex-1 p-4 space-y-3 min-w-0">
              {/* CODE */}
              <div className="flex items-center gap-4">
                <Label className="w-20 text-right text-xs text-muted-foreground">CODE</Label>
                <Input 
                  {...form.register('code')} 
                  className="flex-1 h-8 text-sm"
                  placeholder="C40-0014"
                />
              </div>

              {/* NAME */}
              <div className="flex items-center gap-4">
                <Label className="w-20 text-right text-xs text-muted-foreground">NAME</Label>
                <Input 
                  {...form.register('name')} 
                  className="flex-1 h-8 text-sm"
                  placeholder="Pipe Conduit Sch40 .75"
                />
              </div>

              {/* DESC */}
              <div className="flex items-center gap-4">
                <Label className="w-20 text-right text-xs text-muted-foreground">DESC</Label>
                <Input 
                  {...form.register('description')} 
                  className="flex-1 h-8 text-sm"
                  placeholder="Sch 40 Conduit Pipe 3/4&quot;"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>

              {/* CONTACT */}
              <div className="flex items-center gap-4">
                <Label className="w-20 text-right text-xs text-muted-foreground">CONTACT</Label>
                <Input 
                  {...form.register('contact')} 
                  className="flex-1 h-8 text-sm"
                  placeholder=""
                />
              </div>

              {/* PHONE */}
              <div className="flex items-center gap-4">
                <Label className="w-20 text-right text-xs text-muted-foreground">PHONE</Label>
                <Input 
                  {...form.register('phone')} 
                  className="flex-1 h-8 text-sm"
                  placeholder=""
                />
              </div>

              {/* EMAIL */}
              <div className="flex items-center gap-4">
                <Label className="w-20 text-right text-xs text-muted-foreground">EMAIL</Label>
                <Input 
                  {...form.register('email')} 
                  className="flex-1 h-8 text-sm"
                  placeholder=""
                />
              </div>

              {/* CAT (Category) */}
              <div className="flex items-center gap-4">
                <Label className="w-20 text-right text-xs text-muted-foreground">CAT</Label>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 border rounded px-2 py-1.5 text-sm bg-muted/30 flex items-center gap-1">
                    <span className="text-muted-foreground">☐</span>
                    <span>{form.watch('categoryPath') || 'Perfect Catch > Pipe & Fittings > 3/4"'}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Side Panel */}
            <div className="w-80 border-l p-4 space-y-3 flex-shrink-0">
              {/* Generic / ACCOUNT toggle */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Generic...</span>
                <span className="text-muted-foreground">ACCOUNT...</span>
              </div>

              {/* COST */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">COST</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">$</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('cost')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || ''}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                      form.setValue('cost', parseFloat(cleaned) || 0);
                    }}
                    className="w-20 h-8 text-sm text-right border rounded px-2 font-medium bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* ADD AN IMAGE button */}
              <Button 
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={() => {}}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                ADD AN IMAGE
              </Button>

              {/* Image Preview */}
              <div className="border rounded-lg overflow-hidden bg-muted/30 aspect-square flex items-center justify-center">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Material" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-muted-foreground text-sm p-4">
                    <ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No image
                  </div>
                )}
              </div>

              <Button variant="outline" size="sm" className="w-full text-xs">
                View all images
              </Button>

              {/* ACTIVE toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">ACTIVE</Label>
                <Switch 
                  checked={form.watch('active')}
                  onCheckedChange={(v) => form.setValue('active', v)}
                />
              </div>

              {/* MARGIN */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">MARGIN</Label>
                <div className="flex items-center gap-1">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('margin') || ''}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                      form.setValue('margin', parseFloat(cleaned) || 0);
                    }}
                    className="w-16 h-7 text-sm text-right border rounded px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs">%</span>
                </div>
              </div>

              {/* SELL PRICE */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">SELL PRICE</Label>
                <span className="text-sm font-medium">{formatCurrency(calculatedPrice)}</span>
              </div>

              {/* TAX % */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">TAX %</Label>
                <div className="flex items-center gap-1">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('taxPercent') || ''}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                      form.setValue('taxPercent', parseFloat(cleaned) || 0);
                    }}
                    className="w-16 h-7 text-sm text-right border rounded px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs">%</span>
                </div>
              </div>

              {/* SKU % */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">SKU %</Label>
                <div className="flex items-center gap-1">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('skuPercent') || ''}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                      form.setValue('skuPercent', parseFloat(cleaned) || 0);
                    }}
                    className="w-16 h-7 text-sm text-right border rounded px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs">%</span>
                </div>
              </div>

              {/* Taxable */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Taxable</Label>
                <Switch 
                  checked={form.watch('taxable')}
                  onCheckedChange={(v) => form.setValue('taxable', v)}
                />
              </div>

              {/* Chargeable by Default */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Chargeable by Default</Label>
                <Switch 
                  checked={form.watch('chargeableByDefault')}
                  onCheckedChange={(v) => form.setValue('chargeableByDefault', v)}
                />
              </div>

              {/* TRACK STOCK */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">TRACK STOCK</Label>
                <Switch 
                  checked={form.watch('trackStock')}
                  onCheckedChange={(v) => form.setValue('trackStock', v)}
                />
              </div>

              {/* Round Up Dropdown */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">ROUND UP</Label>
                <select 
                  value={form.watch('roundUp') || ''}
                  onChange={(e) => form.setValue('roundUp', e.target.value)}
                  className="h-7 text-xs border rounded px-2 bg-background"
                >
                  <option value="">None</option>
                  <option value="1">Nearest $1</option>
                  <option value="10">Nearest $10</option>
                  <option value="100">Nearest $100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vendors Section */}
          <div className="border-t mt-4">
            {/* Add Vendor Button */}
            <div className="px-4 py-2">
              <Button 
                variant="default" 
                size="sm" 
                className="bg-green-500 hover:bg-green-600"
                onClick={() => setShowAddVendor(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                ADD A VENDOR
              </Button>
            </div>

            {/* Vendors Table Header */}
            <div className="grid grid-cols-7 gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-y">
              <div></div>
              <div>Preferred</div>
              <div>UPC Code</div>
              <div>Vendor part #</div>
              <div>Pay</div>
              <div>Active</div>
              <div></div>
            </div>

            {/* Vendor Rows */}
            {vendors.length > 0 ? (
              vendors.map((vendor: Vendor, idx: number) => (
                <div 
                  key={vendor.id || idx} 
                  className="grid grid-cols-7 gap-2 px-4 py-2 items-center border-b hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{vendor.vendorName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={vendor.preferred} />
                    {vendor.preferred && <span className="text-xs text-green-600">UPC Code</span>}
                  </div>
                  <div>
                    <Input 
                      defaultValue={vendor.upcCode || ''} 
                      className="h-7 text-xs"
                      placeholder="UPC Code"
                    />
                  </div>
                  <div>
                    <Input 
                      defaultValue={vendor.vendorPart || ''} 
                      className="h-7 text-xs"
                      placeholder="PVCD75"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Settings className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{formatCurrency(vendor.cost)}</span>
                  </div>
                  <div>
                    <Switch checked={vendor.active ?? true} />
                  </div>
                  <div>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                No vendors added yet
              </div>
            )}

            {/* Vendor's part description */}
            <div className="px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Settings className="h-4 w-4" />
              <span>Vendor's part description</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t px-4 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <Checkbox id="showHide" />
          <Label htmlFor="showHide" className="text-xs text-muted-foreground">
            Show/Hide Inactive Vendors
          </Label>
        </div>
        <Button 
          onClick={form.handleSubmit((data) => saveMutation.mutate(data))}
          disabled={saveMutation.isPending}
          className="bg-muted hover:bg-muted/80 text-foreground"
        >
          {saveMutation.isPending ? 'Saving...' : 'Add Line'}
        </Button>
      </div>
    </div>
  );
}
