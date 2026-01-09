// LAZI Web Clipper Material Form
// Add this page at: apps/web/app/pricebook/clip/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, ExternalLink, Loader2, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ClippedData {
  name?: string;
  description?: string;
  cost?: number;
  price?: number;
  sku?: string;
  mfgPart?: string;
  images?: string[];
  sourceUrl?: string;
  sourceDomain?: string;
}

interface Vendor {
  id: number;
  vendorName: string;
}

interface Category {
  id: number;
  stId: number;
  name: string;
  children?: Category[];
}

export default function ClipperPage() {
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    displayName: '',
    description: '',
    cost: 0,
    price: 0,
    memberPrice: 0,
    addOnPrice: 0,
    sku: '',
    mfgPart: '',
    unitOfMeasure: 'each',
    primaryVendorId: '',
    vendorPart: '',
    categoryIds: [] as number[],
    active: true,
    taxable: true,
    chargeableByDefault: true,
    isInventory: false,
    paysCommission: false,
    hours: 0,
    bonus: 0,
  });
  
  const [images, setImages] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceDomain, setSourceDomain] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [lastReceived, setLastReceived] = useState<Date | null>(null);
  
  // Fetch vendors
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const res = await fetch('/api/inventory/vendors?active=true');
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
  });
  
  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/pricebook/categories?type=materials&active=true');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    },
  });
  
  // Flatten categories for dropdown
  const flattenCategories = (cats: Category[], depth = 0): { id: number; name: string; depth: number }[] => {
    let flat: { id: number; name: string; depth: number }[] = [];
    for (const cat of cats) {
      flat.push({ id: cat.stId || cat.id, name: cat.name, depth });
      if (cat.children?.length) {
        flat = flat.concat(flattenCategories(cat.children, depth + 1));
      }
    }
    return flat;
  };
  
  const flatCategories = flattenCategories(categories);
  
  // Create material mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/pricebook/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Failed to create material');
      return result;
    },
    onSuccess: (result) => {
      toast.success(result.message || 'Material created! Push to ServiceTitan when ready.');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
  
  // Handle incoming clipped data
  const handleClippedData = useCallback((data: ClippedData) => {
    console.log('Received clipped data:', data);
    setLastReceived(new Date());
    
    setFormData(prev => ({
      ...prev,
      name: data.name || prev.name,
      description: data.description || prev.description,
      cost: data.cost || prev.cost,
      price: data.price || prev.price,
      sku: data.sku || prev.sku,
      mfgPart: data.mfgPart || prev.mfgPart,
    }));
    
    if (data.images?.length) {
      setImages(prev => {
        const newImages = [...prev];
        for (const img of data.images!) {
          if (!newImages.includes(img)) {
            newImages.push(img);
          }
        }
        return newImages;
      });
    }
    
    if (data.sourceUrl) setSourceUrl(data.sourceUrl);
    if (data.sourceDomain) setSourceDomain(data.sourceDomain);
    
    toast.success('Data received from clipper!');
  }, []);
  
  // Listen for postMessage from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'LAZI_CLIPPER_DATA') {
        handleClippedData(event.data.data);
      }
    };
    
    window.addEventListener('message', handleMessage);
    setIsListening(true);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleClippedData]);
  
  // Auto-calculate price from cost
  const handleCostChange = (cost: number) => {
    setFormData(prev => ({
      ...prev,
      cost,
      price: prev.price === 0 || prev.price === prev.cost * 1.6 
        ? Math.round(cost * 1.6 * 100) / 100 
        : prev.price,
    }));
  };
  
  // Calculate markup/margin
  const markup = formData.cost > 0 ? ((formData.price - formData.cost) / formData.cost * 100) : 0;
  const margin = formData.price > 0 ? ((formData.price - formData.cost) / formData.price * 100) : 0;
  
  // Reset form
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      displayName: '',
      description: '',
      cost: 0,
      price: 0,
      memberPrice: 0,
      addOnPrice: 0,
      sku: '',
      mfgPart: '',
      unitOfMeasure: 'each',
      primaryVendorId: '',
      vendorPart: '',
      categoryIds: [],
      active: true,
      taxable: true,
      chargeableByDefault: true,
      isInventory: false,
      paysCommission: false,
      hours: 0,
      bonus: 0,
    });
    setImages([]);
    setSourceUrl('');
    setSourceDomain('');
  };
  
  // Submit form
  const handleSubmit = () => {
    if (!formData.code || !formData.name) {
      toast.error('Code and Name are required');
      return;
    }
    
    const vendor = vendors.find(v => v.id === Number(formData.primaryVendorId));
    
    const payload = {
      code: formData.code,
      name: formData.name,
      displayName: formData.displayName || null,
      description: formData.description || formData.name,
      cost: formData.cost,
      price: formData.price,
      memberPrice: formData.memberPrice || null,
      addOnPrice: formData.addOnPrice || null,
      addOnMemberPrice: null,
      hours: formData.hours,
      bonus: formData.bonus,
      commissionBonus: 0,
      paysCommission: formData.paysCommission,
      active: formData.active,
      taxable: formData.taxable,
      chargeableByDefault: formData.chargeableByDefault,
      deductAsJobCost: false,
      isInventory: formData.isInventory,
      isConfigurableMaterial: false,
      displayInAmount: false,
      isOtherDirectCost: false,
      unitOfMeasure: formData.unitOfMeasure,
      categories: formData.categoryIds,
      primaryVendor: vendor ? {
        vendorId: vendor.id,
        vendorName: vendor.vendorName,
        cost: formData.cost,
        vendorPart: formData.sku || null,
      } : null,
      otherVendors: [],
      account: null,
      businessUnitId: null,
      assets: images.map(url => ({ type: 'image', url, name: url.split('/').pop() })),
      createdBy: 'web-clipper',
      clipperSource: {
        url: sourceUrl,
        domain: sourceDomain,
        clippedAt: new Date().toISOString(),
        mfgPartNumber: formData.mfgPart || null,
      },
    };
    
    createMutation.mutate(payload);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-orange-500 font-bold text-sm">
            LZ
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-lg">Web Clipper</h1>
            <p className="text-orange-100 text-sm">
              {isListening ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Listening for clipped data...
                </span>
              ) : 'Starting...'}
            </p>
          </div>
          {sourceDomain && (
            <Badge variant="secondary" className="bg-white/20 text-white">
              {sourceDomain}
            </Badge>
          )}
        </div>
        
        {/* Status */}
        {lastReceived && (
          <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-sm text-green-700 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Last received: {lastReceived.toLocaleTimeString()}
          </div>
        )}
        
        {/* Form */}
        <Card className="rounded-t-none border-t-0">
          <CardContent className="p-4 space-y-4">
            {/* Code & Name */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="MAT-001"
                  className="h-9"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Product name"
                  className="h-9"
                />
              </div>
            </div>
            
            {/* Description */}
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Product description"
                rows={2}
                className="resize-none"
              />
            </div>
            
            {/* Images */}
            {images.length > 0 && (
              <div>
                <Label className="text-xs">Images ({images.length})</Label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Vendor & SKU */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vendor</Label>
                <Select
                  value={formData.primaryVendorId}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, primaryVendorId: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.vendorName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">SKU / Part #</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="SKU"
                  className="h-9"
                />
              </div>
            </div>
            
            {/* Mfg Part & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mfg Part #</Label>
                <Input
                  value={formData.mfgPart}
                  onChange={(e) => setFormData(prev => ({ ...prev, mfgPart: e.target.value }))}
                  placeholder="Manufacturer part"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Select
                  value={formData.unitOfMeasure}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, unitOfMeasure: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['each', 'hour', 'foot', 'sqft', 'gallon', 'pound', 'bag', 'box', 'case', 'kit'].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Pricing */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost || ''}
                  onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                  className="h-9"
                />
              </div>
              <div className="text-center">
                <Label className="text-xs text-gray-500">Markup</Label>
                <div className="h-9 flex items-center justify-center font-semibold text-sm">
                  {markup.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <Label className="text-xs text-gray-500">Margin</Label>
                <div className="h-9 flex items-center justify-center font-semibold text-sm">
                  {margin.toFixed(1)}%
                </div>
              </div>
            </div>
            
            {/* Category */}
            <div>
              <Label className="text-xs">Category</Label>
              <Select
                value={formData.categoryIds[0]?.toString() || ''}
                onValueChange={(v) => setFormData(prev => ({ ...prev, categoryIds: v ? [Number(v)] : [] }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {flatCategories.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {'  '.repeat(c.depth)}{c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Options */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.active}
                  onCheckedChange={(c) => setFormData(prev => ({ ...prev, active: !!c }))}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.taxable}
                  onCheckedChange={(c) => setFormData(prev => ({ ...prev, taxable: !!c }))}
                />
                Taxable
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.chargeableByDefault}
                  onCheckedChange={(c) => setFormData(prev => ({ ...prev, chargeableByDefault: !!c }))}
                />
                Chargeable
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={formData.isInventory}
                  onCheckedChange={(c) => setFormData(prev => ({ ...prev, isInventory: !!c }))}
                />
                Inventory
              </label>
            </div>
            
            {/* Source URL */}
            {sourceUrl && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                  {sourceUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={resetForm} className="flex-1">
            Reset
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createMutation.isPending}
            className="flex-[2] bg-orange-500 hover:bg-orange-600"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Material'
            )}
          </Button>
        </div>
        
        {/* Instructions */}
        <Card className="mt-4">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2 pb-4">
            <p>1. Keep this window open</p>
            <p>2. Go to a vendor website (Pool360, Home Depot, etc.)</p>
            <p>3. Click the LAZI extension icon in your browser</p>
            <p>4. Hover and click on product info to capture it</p>
            <p>5. Click "Send to LAZI" - data appears here automatically!</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
