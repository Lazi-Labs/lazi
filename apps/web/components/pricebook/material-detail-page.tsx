'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { CategoryTreeFilter } from './category-tree-filter';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
  addOnPrice?: number;
  addOnMemberPrice?: number;
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
  // New ST fields
  hours?: number;
  bonus?: number;
  commissionBonus?: number;
  paysCommission?: boolean;
  deductAsJobCost?: boolean;
  isInventory?: boolean;
  isConfigurableMaterial?: boolean;
  displayInAmount?: boolean;
  isOtherDirectCost?: boolean;
  unitOfMeasure?: string;
  account?: string;
  incomeAccount?: string;
  assetAccount?: string;
  cogsAccount?: string;
  categories?: number[];
  // Status fields
  hasPendingChanges?: boolean;
  isNew?: boolean;
  pushError?: string;
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
  const [hasChanges, setHasChanges] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [showAccountsPanel, setShowAccountsPanel] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [vendorCost, setVendorCost] = useState<number>(0);
  const [vendorPart, setVendorPart] = useState<string>('');
  const [vendorUpc, setVendorUpc] = useState<string>('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Fetch active material categories
  const { data: categoriesData } = useQuery({
    queryKey: ['pricebook-categories', 'materials', 'active'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/categories?type=materials&active=true'));
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.data || []);
    },
  });

  // Fetch available vendors for selection
  const { data: availableVendors } = useQuery({
    queryKey: ['inventory-vendors'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/inventory/vendors?active=true'));
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
  });

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
      memberPrice: 0,
      addOnPrice: 0,
      addOnMemberPrice: 0,
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
      // New ST fields
      hours: 0,
      bonus: 0,
      commissionBonus: 0,
      paysCommission: false,
      deductAsJobCost: false,
      isInventory: false,
      isConfigurableMaterial: false,
      displayInAmount: false,
      isOtherDirectCost: false,
      unitOfMeasure: '',
      account: '',
      vendors: [],
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
        memberPrice: material.memberPrice || 0,
        addOnPrice: material.addOnPrice || 0,
        addOnMemberPrice: material.addOnMemberPrice || 0,
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
        // New ST fields
        hours: material.hours || 0,
        bonus: material.bonus || 0,
        commissionBonus: material.commissionBonus || 0,
        paysCommission: material.paysCommission ?? false,
        deductAsJobCost: material.deductAsJobCost ?? false,
        isInventory: material.isInventory ?? false,
        isConfigurableMaterial: material.isConfigurableMaterial ?? false,
        displayInAmount: material.displayInAmount ?? false,
        isOtherDirectCost: material.isOtherDirectCost ?? false,
        unitOfMeasure: material.unitOfMeasure || '',
        account: material.account || '',
        vendors: material.vendors || [],
      });
      setImagePreview(material.defaultImageUrl || null);
    }
  }, [material, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Material>) => {
      const isNew = !materialId || materialId === 'new';
      const url = isNew
        ? apiUrl('/api/pricebook/materials')
        : apiUrl(`/api/pricebook/materials/${materialId}`);

      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned an invalid response. Please try again.');
      }
      
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to save material');
      }
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pricebook-materials'] });
      queryClient.invalidateQueries({ queryKey: ['material', materialId] });
      setHasChanges(false);
      onSave?.();
    },
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/materials/push'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          stIds: material?.isNew ? [material.id] : [material?.stId] 
        }),
      });
      
      const result = await res.json();
      if (!res.ok || result.failed?.length > 0) {
        throw new Error(result.failed?.[0]?.error || result.error || 'Push failed');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook-materials'] });
      queryClient.invalidateQueries({ queryKey: ['material', materialId] });
    },
  });

  const cost = form.watch('cost');
  const margin = form.watch('margin');
  const bonus = form.watch('bonus') || 0;
  const roundUp = form.watch('roundUp');
  
  // Calculate base price from cost and margin
  let calculatedPrice = cost && margin ? cost / (1 - margin / 100) : 0;
  
  // Add bonus on top of sell price
  calculatedPrice = calculatedPrice + bonus;
  
  // Apply round up if selected
  if (roundUp && calculatedPrice > 0) {
    const roundValue = parseInt(roundUp, 10);
    if (roundValue > 0) {
      calculatedPrice = Math.ceil(calculatedPrice / roundValue) * roundValue;
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const vendors = form.watch('vendors') || [];
  const isNew = !materialId || materialId === 'new';

  // Helper to find category path from ID
  const findCategoryPath = (cats: any[], targetId: string, path: string[] = []): string | null => {
    for (const cat of cats) {
      const id = String(cat.id || cat.stId);
      const children = cat.children || cat.subcategories || [];
      if (id === targetId) {
        return [...path, cat.name].join(' > ');
      }
      if (children.length > 0) {
        const found = findCategoryPath(children, targetId, [...path, cat.name]);
        if (found) return found;
      }
    }
    return null;
  };

  // Get display path for selected category
  const selectedCategoryPath = selectedCategoryId && categoriesData 
    ? findCategoryPath(categoriesData, selectedCategoryId) 
    : form.watch('categoryPath');

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const path = categoryId && categoriesData ? findCategoryPath(categoriesData, categoryId) : '';
    form.setValue('categoryPath', path || '');
    form.setValue('categories', categoryId ? [parseInt(categoryId, 10)] : []);
    setHasChanges(true);
    setShowCategoryPicker(false);
  };

  // Set initial category from material
  useEffect(() => {
    if (material?.categories?.length > 0) {
      setSelectedCategoryId(String(material.categories[0]));
    }
  }, [material]);

  // Handle save
  const handleSave = async () => {
    setError(null);
    const data = form.getValues();
    
    // Transform vendors array to primaryVendor and otherVendors for backend
    const vendors = data.vendors || [];
    const primaryVendor = vendors.find((v: Vendor) => v.preferred) || vendors[0] || null;
    const otherVendors = vendors.filter((v: Vendor) => v !== primaryVendor);
    
    const payload = {
      ...data,
      primaryVendor,
      otherVendors,
    };
    
    try {
      await saveMutation.mutateAsync(payload);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle push to ServiceTitan
  const handlePush = async () => {
    setError(null);
    setPushing(true);
    try {
      // Save first if there are changes
      if (hasChanges) {
        await handleSave();
      }
      await pushMutation.mutateAsync();
      // Reload to get updated state
      queryClient.invalidateQueries({ queryKey: ['material', materialId] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPushing(false);
    }
  };

  // Track form changes
  const handleFieldChange = (field: keyof Material, value: any) => {
    form.setValue(field, value);
    setHasChanges(true);
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle add vendor from selection
  const handleAddVendor = () => {
    if (!selectedVendorId) return;
    
    const selectedVendor = availableVendors?.find((v: any) => v.id === selectedVendorId);
    if (!selectedVendor) return;
    
    const currentVendors = form.getValues('vendors') || [];
    
    // Check if vendor already added
    if (currentVendors.some((v: Vendor) => v.vendorId?.toString() === selectedVendorId)) {
      setError('This vendor is already added');
      return;
    }
    
    const vendor: Vendor = {
      id: `new_${Date.now()}`,
      vendorId: parseInt(selectedVendorId, 10),
      vendorName: selectedVendor.vendorName,
      vendorPart: vendorPart,
      upcCode: vendorUpc,
      cost: vendorCost,
      preferred: currentVendors.length === 0,
      active: true,
    };
    
    const updatedVendors = [...currentVendors, vendor];
    form.setValue('vendors', updatedVendors);
    
    // Auto-set cost to cheapest vendor price
    const cheapestCost = Math.min(...updatedVendors.map((v: Vendor) => v.cost || Infinity));
    if (cheapestCost !== Infinity && cheapestCost > 0) {
      form.setValue('cost', cheapestCost);
    }
    
    // Reset form
    setSelectedVendorId('');
    setVendorCost(0);
    setVendorPart('');
    setVendorUpc('');
    setShowAddVendorModal(false);
    setHasChanges(true);
  };

  // Handle delete vendor
  const handleDeleteVendor = (vendorId: string) => {
    const currentVendors = form.getValues('vendors') || [];
    const updatedVendors = currentVendors.filter((v: Vendor) => v.id !== vendorId);
    form.setValue('vendors', updatedVendors);
    setHasChanges(true);
  };

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
        <div className="flex items-center gap-2">
          {/* Status badges */}
          {material?.hasPendingChanges && (
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
              Pending Changes
            </Badge>
          )}
          {material?.isNew && (
            <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/50">
              Not in ServiceTitan
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs">
            PULL
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/10 h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
            onClick={handlePush}
            disabled={pushing}
          >
            {pushing ? 'PUSHING...' : 'PUSH'}
          </Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs">
            <Settings className="h-3 w-3" />
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
          <div className="flex items-start">
            {/* Left Form Fields */}
            <div className="flex-1 p-4 space-y-3 min-w-0 flex-shrink-0">
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

              {/* CAT (Category) */}
              <div className="flex items-center gap-4">
                <Label className="w-20 text-right text-xs text-muted-foreground">CAT</Label>
                <div className="flex-1 flex items-center gap-2">
                  <Popover open={showCategoryPicker} onOpenChange={setShowCategoryPicker}>
                    <PopoverTrigger asChild>
                      <button 
                        type="button"
                        className="flex-1 border rounded px-2 py-1.5 text-sm bg-muted/30 flex items-center gap-1 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <span className="text-muted-foreground">☐</span>
                        <span className="truncate">{selectedCategoryPath || 'Select a category...'}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-3" align="start">
                      <CategoryTreeFilter
                        categories={categoriesData || []}
                        selectedCategoryId={selectedCategoryId}
                        onSelect={handleCategorySelect}
                        onClose={() => setShowCategoryPicker(false)}
                      />
                    </PopoverContent>
                  </Popover>
                  {selectedCategoryId && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleCategorySelect('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Vendors Section - moved inside left column */}
              <div className="border-t pt-3 mt-3">
                {/* Add Vendor Button */}
                <div className="pb-3">
                  <div className="relative">
                    <Button
                      variant="default"
                      size="sm"
                      className="bg-[#00c853] hover:bg-[#00a844] text-white font-medium"
                      onClick={() => setShowAddVendorModal(!showAddVendorModal)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      ADD A VENDOR...
                    </Button>
                    {showAddVendorModal && (
                      <div className="absolute top-full left-0 mt-2 w-80 p-4 bg-popover border rounded-md shadow-lg z-50">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Add Vendor</h4>
                          <div>
                            <Label className="text-xs text-muted-foreground">Select Vendor *</Label>
                            <select
                              value={selectedVendorId}
                              onChange={(e) => setSelectedVendorId(e.target.value)}
                              className="w-full h-8 mt-1 text-sm border rounded px-2 bg-background"
                            >
                              <option value="">Choose a vendor...</option>
                              {availableVendors?.map((v: any) => (
                                <option key={v.id} value={v.id}>{v.vendorName}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Vendor Part #</Label>
                            <Input
                              value={vendorPart}
                              onChange={(e) => setVendorPart(e.target.value)}
                              placeholder="Part number"
                              className="h-8 mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">UPC Code</Label>
                            <Input
                              value={vendorUpc}
                              onChange={(e) => setVendorUpc(e.target.value)}
                              placeholder="UPC code"
                              className="h-8 mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Cost</Label>
                            <div className="relative mt-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={vendorCost || ''}
                                onChange={(e) => setVendorCost(parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="h-8 pl-6"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowAddVendorModal(false);
                                setSelectedVendorId('');
                                setVendorCost(0);
                                setVendorPart('');
                                setVendorUpc('');
                              }}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleAddVendor}
                              disabled={!selectedVendorId}
                              className="flex-1 bg-[#00c853] hover:bg-[#00a844]"
                            >
                              Add Vendor
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Vendors Table Header */}
                <div className="grid grid-cols-[180px_70px_100px_100px_70px_50px_32px] gap-2 py-2 text-xs text-muted-foreground border-b">
                  <div></div>
                  <div className="text-center">Preferred</div>
                  <div>UPC Code</div>
                  <div>Vendor part #</div>
                  <div className="text-right">Pay</div>
                  <div className="text-center">Active</div>
                  <div></div>
                </div>

                {/* Scrollable Vendor Rows */}
                <div className="max-h-[200px] overflow-y-auto">
                  {/* Primary Vendor Row */}
                  {material?.primaryVendor && (
                    <>
                      <div className="grid grid-cols-[180px_70px_100px_100px_70px_50px_32px] gap-2 py-2 items-center border-b hover:bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground cursor-pointer" />
                          <span className="text-sm font-medium">{material.primaryVendor.vendorName}</span>
                        </div>
                        <div className="flex justify-center items-center gap-2">
                          <Settings className="h-3 w-3 text-muted-foreground" />
                          <div className="w-5 h-5 rounded-full bg-[#00c853] flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        </div>
                        <div>
                          <Input 
                            defaultValue={material.primaryVendor.upcCode || ''} 
                            className="h-7 text-xs"
                            placeholder="UPC Code"
                          />
                        </div>
                        <div>
                          <Input 
                            defaultValue={material.primaryVendor.vendorPart || ''} 
                            className="h-7 text-xs"
                            placeholder=""
                          />
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <Checkbox checked={true} className="h-4 w-4" />
                          <span className="text-sm font-medium">${material.primaryVendor.cost?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-center">
                          <div className="w-5 h-5 rounded-full bg-[#00c853] flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        </div>
                        <div>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Vendor's part description row */}
                      <div className="py-2 flex items-center gap-2 text-sm text-muted-foreground border-b bg-muted/10">
                        <Settings className="h-4 w-4 ml-6" />
                        <span>Vendor's part description</span>
                      </div>
                    </>
                  )}

                  {/* Additional Vendors */}
                  {vendors.length > 0 ? (
                    vendors.map((vendor: any, index: number) => (
                      <div key={vendor.id || index}>
                        <div className="grid grid-cols-[180px_70px_100px_100px_70px_50px_32px] gap-2 py-2 items-center border-b hover:bg-muted/30">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4 text-muted-foreground cursor-pointer" />
                            <span className="text-sm font-medium">{vendor.vendorName}</span>
                          </div>
                          <div className="flex justify-center items-center gap-2">
                            <Settings className="h-3 w-3 text-muted-foreground" />
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center",
                              vendor.preferred ? "bg-[#00c853]" : "border-2 border-muted-foreground/30"
                            )}>
                              {vendor.preferred && <Check className="h-3 w-3 text-white" />}
                            </div>
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
                              placeholder=""
                            />
                          </div>
                          <div className="flex items-center justify-end gap-1">
                            <Checkbox checked={!!vendor.useCost} className="h-4 w-4" />
                            <span className="text-sm font-medium">${vendor.cost?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-center">
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center",
                              vendor.active ? "bg-[#00c853]" : "border-2 border-muted-foreground/30"
                            )}>
                              {vendor.active && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </div>
                          <div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteVendor(vendor.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : !material?.primaryVendor && (
                    <div className="py-3 text-sm text-muted-foreground">
                      No vendors added yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side Panel */}
            <div className="w-80 border-l p-4 space-y-3 flex-shrink-0 overflow-y-auto">
              {/* Accounts Settings Box */}
              <div className="border rounded-lg">
                <button
                  type="button"
                  onClick={() => setShowAccountsPanel(!showAccountsPanel)}
                  className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Accounts
                  </span>
                  <ChevronRight className={cn("h-4 w-4 transition-transform", showAccountsPanel && "rotate-90")} />
                </button>
                
                {showAccountsPanel && (
                  <div className="p-3 pt-0 space-y-3 border-t">
                    {/* Income Account */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Income Account</Label>
                      <select
                        value={form.watch('incomeAccount') || ''}
                        onChange={(e) => handleFieldChange('incomeAccount', e.target.value)}
                        className="w-full h-8 text-sm border rounded px-2 bg-background"
                      >
                        <option value="">Select account...</option>
                        <option value="4000">4000 - Sales Revenue</option>
                        <option value="4100">4100 - Service Revenue</option>
                        <option value="4200">4200 - Material Sales</option>
                      </select>
                    </div>
                    
                    {/* Asset Account */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Asset Account</Label>
                      <select
                        value={form.watch('assetAccount') || ''}
                        onChange={(e) => handleFieldChange('assetAccount', e.target.value)}
                        className="w-full h-8 text-sm border rounded px-2 bg-background"
                      >
                        <option value="">Select account...</option>
                        <option value="1200">1200 - Inventory</option>
                        <option value="1300">1300 - Materials on Hand</option>
                        <option value="1400">1400 - Supplies</option>
                      </select>
                    </div>
                    
                    {/* COGS Account */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">COGS Account</Label>
                      <select
                        value={form.watch('cogsAccount') || ''}
                        onChange={(e) => handleFieldChange('cogsAccount', e.target.value)}
                        className="w-full h-8 text-sm border rounded px-2 bg-background"
                      >
                        <option value="">Select account...</option>
                        <option value="5000">5000 - Cost of Goods Sold</option>
                        <option value="5100">5100 - Material Costs</option>
                        <option value="5200">5200 - Direct Costs</option>
                      </select>
                    </div>
                  </div>
                )}
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
              <input
                type="file"
                ref={imageInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <Button 
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={() => imageInputRef.current?.click()}
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

              {/* MEMBER PRICE */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">MEMBER PRICE</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">$</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('memberPrice')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                      handleFieldChange('memberPrice', parseFloat(cleaned) || 0);
                    }}
                    className="w-20 h-7 text-sm text-right border rounded px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* ADD-ON PRICE */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">ADD-ON PRICE</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">$</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('addOnPrice')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                      handleFieldChange('addOnPrice', parseFloat(cleaned) || 0);
                    }}
                    className="w-20 h-7 text-sm text-right border rounded px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* ADD-ON MEMBER PRICE */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">ADD-ON MEMBER</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">$</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('addOnMemberPrice')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                      handleFieldChange('addOnMemberPrice', parseFloat(cleaned) || 0);
                    }}
                    className="w-20 h-7 text-sm text-right border rounded px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
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

              {/* TRACK STOCK / IS INVENTORY */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Track Inventory</Label>
                <Switch 
                  checked={form.watch('isInventory')}
                  onCheckedChange={(v) => handleFieldChange('isInventory', v)}
                />
              </div>

              {/* Separator for Labor & Commission */}
              <div className="border-t pt-3 mt-2">
                <Label className="text-xs font-semibold text-muted-foreground">LABOR & COMMISSION</Label>
              </div>

              {/* HOURS */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">HOURS</Label>
                <div className="flex items-center gap-1">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('hours') || '0'}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                      handleFieldChange('hours', parseFloat(cleaned) || 0);
                    }}
                    className="w-16 h-7 text-sm text-right border rounded px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs">hrs</span>
                </div>
              </div>

              {/* BONUS */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">BONUS</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium">$</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('bonus')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                      handleFieldChange('bonus', parseFloat(cleaned) || 0);
                    }}
                    className="w-20 h-7 text-sm text-right border rounded px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* COMMISSION BONUS % */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">COMMISSION %</Label>
                <div className="flex items-center gap-1">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('commissionBonus') || '0'}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                      handleFieldChange('commissionBonus', parseFloat(cleaned) || 0);
                    }}
                    className="w-16 h-7 text-sm text-right border rounded px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-xs">%</span>
                </div>
              </div>

              {/* PAYS COMMISSION */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Pays Commission</Label>
                <Switch 
                  checked={form.watch('paysCommission')}
                  onCheckedChange={(v) => handleFieldChange('paysCommission', v)}
                />
              </div>

              {/* DEDUCT AS JOB COST */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Deduct as Job Cost</Label>
                <Switch 
                  checked={form.watch('deductAsJobCost')}
                  onCheckedChange={(v) => handleFieldChange('deductAsJobCost', v)}
                />
              </div>

              {/* Separator for Additional Settings */}
              <div className="border-t pt-3 mt-2">
                <Label className="text-xs font-semibold text-muted-foreground">ADDITIONAL SETTINGS</Label>
              </div>

              {/* IS CONFIGURABLE MATERIAL */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Configurable Material</Label>
                <Switch 
                  checked={form.watch('isConfigurableMaterial')}
                  onCheckedChange={(v) => handleFieldChange('isConfigurableMaterial', v)}
                />
              </div>

              {/* DISPLAY IN AMOUNT */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Display in Amount</Label>
                <Switch 
                  checked={form.watch('displayInAmount')}
                  onCheckedChange={(v) => handleFieldChange('displayInAmount', v)}
                />
              </div>

              {/* IS OTHER DIRECT COST */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">Other Direct Cost</Label>
                <Switch 
                  checked={form.watch('isOtherDirectCost')}
                  onCheckedChange={(v) => handleFieldChange('isOtherDirectCost', v)}
                />
              </div>

              {/* UNIT OF MEASURE */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">UNIT OF MEASURE</Label>
                <input 
                  type="text"
                  value={form.watch('unitOfMeasure') || ''}
                  onChange={(e) => handleFieldChange('unitOfMeasure', e.target.value)}
                  placeholder="Each"
                  className="w-24 h-7 text-sm text-right border rounded px-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Round Up Dropdown */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">ROUND UP</Label>
                <select 
                  value={form.watch('roundUp') || ''}
                  onChange={(e) => handleFieldChange('roundUp', e.target.value)}
                  className="h-7 text-xs border rounded px-2 bg-background cursor-pointer"
                >
                  <option value="">None</option>
                  <option value="1">Nearest $1</option>
                  <option value="10">Nearest $10</option>
                  <option value="100">Nearest $100</option>
                </select>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t pt-3 mt-2 space-y-2">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending || !hasChanges}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                
                <Button
                  onClick={handlePush}
                  disabled={pushing || pushMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {pushing || pushMutation.isPending ? 'Pushing...' : 'Push to ServiceTitan'}
                </Button>
              </div>

              {/* Status Messages */}
              {material?.isNew && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                  This material exists only in LAZI CRM. Click "Push to ServiceTitan" to create it in ST.
                </div>
              )}
              
              {material?.hasPendingChanges && !material?.isNew && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                  You have pending changes. Click "Push to ServiceTitan" to sync.
                </div>
              )}

              {material?.pushError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  Push Error: {material.pushError}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
