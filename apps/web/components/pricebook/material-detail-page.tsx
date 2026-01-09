'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { CategoryTreeFilter } from './category-tree-filter';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Asset {
  url: string;
  type: string;
  alias?: string;
  fileName?: string;
  isDefault?: boolean;
}

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
  assets?: Asset[];
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

interface GLAccount {
  id: number;
  name: string;
  number: string;
  type: 'Asset' | 'Expense' | 'Income' | 'Liability';
  active: boolean;
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
  const [pushSuccess, setPushSuccess] = useState<string | null>(null);
  const [pushProgress, setPushProgress] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [showAccountsPanel, setShowAccountsPanel] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [vendorCost, setVendorCost] = useState<number>(0);
  const [vendorPart, setVendorPart] = useState<string>('');
  const [vendorUpc, setVendorUpc] = useState<string>('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [imageUploadTab, setImageUploadTab] = useState<'file' | 'url'>('file');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [pullSuccess, setPullSuccess] = useState<string | null>(null);
  const [materialAssets, setMaterialAssets] = useState<Asset[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allImageUrls, setAllImageUrls] = useState<string[]>([]);
  const [pendingImages, setPendingImages] = useState<string[]>([]); // New images to be pushed
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]); // ST images to delete on push
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [imageHovered, setImageHovered] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Helper to convert ST image path to full proxied URL
  const getStImageUrl = (path: string): string => {
    if (!path) return '';
    // If it's a data URL, return as-is
    if (path.startsWith('data:')) {
      return path;
    }
    // If it's already using our API routes, return as-is
    if (path.includes('/api/images/')) {
      return path;
    }
    // If it's a full S3 or external URL, proxy it
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return apiUrl(`/api/images/proxy?url=${encodeURIComponent(path)}`);
    }
    // For ST paths like "Images/Material/xxx.jpg", use the ST image route
    // This route uses authenticated ST API to fetch the image
    return apiUrl(`/api/images/st/${path}`);
  };

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

  // Fetch GL accounts for account dropdowns
  const { data: glAccountsData } = useQuery({
    queryKey: ['gl-accounts'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/accounting/accounts'));
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Filter accounts by type for dropdowns
  const incomeAccounts = (glAccountsData as GLAccount[] || []).filter(a => a.type === 'Income' && a.active);
  const assetAccounts = (glAccountsData as GLAccount[] || []).filter(a => a.type === 'Asset' && a.active);
  const cogsAccounts = (glAccountsData as GLAccount[] || []).filter(a => a.type === 'Expense' && a.active);

  const { data: material, isLoading, refetch: refetchMaterial } = useQuery({
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
      defaultImageUrl: null,
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
      // Get image URL from any of the possible fields
      const materialImageUrl = material.imageUrl || material.s3ImageUrl || material.defaultImageUrl || null;

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
        defaultImageUrl: materialImageUrl,
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
        // Combine primaryVendor and otherVendors into vendors array
        vendors: [
          ...(material.primaryVendor ? [{ ...material.primaryVendor, preferred: true }] : []),
          ...(material.vendors || []).map((v: any) => ({ ...v, preferred: false })),
        ],
      });
      // Load assets from material (already filtered by backend)
      const assets = material.assets || [];
      setMaterialAssets(assets);

      // Load images marked for deletion from API (for badge display)
      const loadedImagesToDelete: string[] = material.imagesToDelete || [];
      setImagesToDelete(loadedImagesToDelete);

      // Build array of ST asset image URLs
      const stImageUrls: string[] = [];
      assets.filter((a: Asset) => a.type === 'Image').forEach((asset: Asset) => {
        if (asset.url) {
          stImageUrls.push(getStImageUrl(asset.url));
        }
      });

      // Load pending images from API response (already parsed)
      const loadedPendingImages: string[] = material.pendingImages || [];

      // If there's a single image URL (not JSON array), add it
      if (materialImageUrl && !materialImageUrl.startsWith('[')) {
        const localUrl = getStImageUrl(materialImageUrl);
        if (!stImageUrls.includes(localUrl) && !loadedPendingImages.includes(materialImageUrl)) {
          stImageUrls.unshift(localUrl);
        }
      }

      // Set pending images from loaded data (raw S3 URLs)
      setPendingImages(loadedPendingImages);

      // Combine all images: pending first, then ST assets
      const allUrls = [...loadedPendingImages, ...stImageUrls];
      setAllImageUrls(allUrls);
      setCurrentImageIndex(0);

      // Set preview to first image
      if (allUrls.length > 0) {
        setImagePreview(allUrls[0]);
      } else {
        setImagePreview(null);
      }
    }
  }, [material]);

  // Update allImageUrls when pending images change
  useEffect(() => {
    const stUrls = materialAssets.filter(a => a.type === 'Image').map(a => getStImageUrl(a.url));
    const allUrls = [...pendingImages, ...stUrls];
    setAllImageUrls(allUrls);
    if (allUrls.length > 0 && currentImageIndex >= allUrls.length) {
      setCurrentImageIndex(0);
    }
  }, [pendingImages, materialAssets]);

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
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pricebook-materials'] });
      queryClient.invalidateQueries({ queryKey: ['material', materialId] });

      // If we pushed a new material, redirect to the new ST ID URL
      if (result.results?.created?.length > 0) {
        const newStId = result.results.created[0].stId;
        if (newStId && window.location.pathname.includes('new_')) {
          window.location.href = `/dashboard/pricebook/materials/${newStId}`;
        }
      }
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
    setSaveSuccess(null);
    const data = form.getValues();

    // Transform vendors array to primaryVendor and otherVendors for backend
    const vendors = data.vendors || [];
    const primaryVendor = vendors.find((v: Vendor) => v.preferred) || vendors[0] || null;
    const otherVendors = vendors.filter((v: Vendor) => v !== primaryVendor);

    const payload = {
      ...data,
      primaryVendor,
      otherVendors,
      // Send pending images as array for multi-image support
      pendingImages: pendingImages.length > 0 ? pendingImages : undefined,
      // Send images to delete (ST asset URLs marked for removal)
      imagesToDelete: imagesToDelete.length > 0 ? imagesToDelete : undefined,
    };

    try {
      await saveMutation.mutateAsync(payload);
      // Refetch material data to get updated state (hasPendingChanges, imagesToDelete, etc.)
      await refetchMaterial();
      setSaveSuccess('Changes saved successfully!');
      // Clear success after 3 seconds
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle push to ServiceTitan
  const handlePush = async () => {
    setError(null);
    setPushSuccess(null);
    setPushing(true);
    setPushProgress(0);

    // Simulate progress while pushing
    const progressInterval = setInterval(() => {
      setPushProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      // Save first if there are changes
      if (hasChanges) {
        await handleSave();
      }
      setPushProgress(50);
      await pushMutation.mutateAsync();
      setPushProgress(100);

      // Clear pending images and images to delete after successful push
      setPendingImages([]);
      setImagesToDelete([]);

      // Show centered success modal
      setSuccessMessage('Successfully pushed to ServiceTitan!');
      setShowSuccessModal(true);

      // Reload to get updated state
      queryClient.invalidateQueries({ queryKey: ['material', materialId] });

      // Auto-hide modal after 3 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(progressInterval);
      setPushing(false);
      // Reset progress after animation
      setTimeout(() => setPushProgress(0), 500);
    }
  };

  // Handle pull from ServiceTitan
  const handlePull = async () => {
    if (!material?.stId || material?.isNew) {
      setError('Cannot pull: Material does not exist in ServiceTitan');
      return;
    }

    setError(null);
    setPullSuccess(null);
    setPulling(true);
    setPullProgress(0);

    // Simulate progress while pulling
    const progressInterval = setInterval(() => {
      setPullProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 15;
      });
    }, 200);

    try {
      setPullProgress(30);
      const res = await fetch(apiUrl(`/api/pricebook/materials/${material.stId}/pull`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      setPullProgress(70);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to pull from ServiceTitan');
      }

      setPullProgress(100);

      // Refresh material data
      queryClient.invalidateQueries({ queryKey: ['material', materialId] });
      queryClient.invalidateQueries({ queryKey: ['pricebook-materials'] });

      // Update assets if returned
      if (result.data?.assets) {
        setMaterialAssets(result.data.assets);
      }

      setPullSuccess(`Pulled latest data from ServiceTitan`);
      setHasChanges(false);

      // Clear success after 5 seconds
      setTimeout(() => setPullSuccess(null), 5000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(progressInterval);
      setPulling(false);
      // Reset progress after animation
      setTimeout(() => setPullProgress(0), 500);
    }
  };

  // Track form changes
  const handleFieldChange = (field: keyof Material, value: any) => {
    form.setValue(field, value);
    setHasChanges(true);
  };

  // Handle image upload from file - uploads to S3 and adds to pending images
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageLoading(true);
    setImageLoadError(false);

    try {
      // Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      // Upload to S3 via backend
      const response = await fetch(apiUrl('/api/pricebook/images/upload-file'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64Data,
          filename: file.name,
          entityType: 'materials',
          entityId: materialId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // ADD to pending images array (not replace)
        setPendingImages(prev => [...prev, result.s3Url]);
        setImagePreview(result.s3Url);
        setHasChanges(true);
        setShowImageModal(false);
        console.log('[IMAGE UPLOAD] Successfully uploaded to S3:', result.s3Url);
      } else {
        console.error('[IMAGE UPLOAD] Failed:', result.error);
        setImageLoadError(true);
      }
    } catch (err) {
      console.error('[IMAGE UPLOAD] Error:', err);
      setImageLoadError(true);
    } finally {
      setImageLoading(false);
      // Reset file input
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // Handle image from URL - uploads to S3 and adds to pending images
  const handleImageFromUrl = async () => {
    const url = imageUrlInput.trim();
    if (!url) return;

    setImageLoading(true);
    setImageLoadError(false);

    try {
      // Upload to S3 via backend (this fetches the URL and uploads to S3)
      const response = await fetch(apiUrl('/api/pricebook/images/upload'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          entityType: 'materials',
          entityId: materialId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // ADD to pending images array (not replace)
        setPendingImages(prev => [...prev, result.s3Url]);
        setImagePreview(result.s3Url);
        setHasChanges(true);
        setShowImageModal(false);
        setImageUrlInput('');
        setImageLoadError(false);
        console.log('[IMAGE UPLOAD] Successfully uploaded to S3:', result.s3Url);
      } else {
        console.error('[IMAGE UPLOAD] Failed:', result.error);
        setImageLoadError(true);
      }
    } catch (err) {
      console.error('[IMAGE UPLOAD] Error:', err);
      setImageLoadError(true);
    } finally {
      setImageLoading(false);
    }
  };

  // Get proxy URL for external images
  const getProxyImageUrl = (url: string) => {
    if (!url) return '';
    // If it's already a data URL or relative URL, return as-is
    if (url.startsWith('data:') || url.startsWith('/')) {
      return url;
    }
    // If it's already proxied, return as-is
    if (url.includes('/api/images/proxy')) {
      return url;
    }
    // Otherwise, proxy external URLs
    return apiUrl(`/api/images/proxy?url=${encodeURIComponent(url)}`);
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
      {/* Top Header Bar */}
      <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
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
          {/* Status badges - show when DB has pending changes OR local unsaved changes */}
          {(material?.hasPendingChanges || hasChanges || imagesToDelete.length > 0 || pendingImages.length > 0) && (
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
              {hasChanges ? 'Unsaved Changes' : 'Pending Changes'}
            </Badge>
          )}
          {material?.isNew && (
            <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/50">
              Not in ServiceTitan
            </Badge>
          )}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700 relative overflow-hidden"
              onClick={handlePull}
              disabled={pulling || !material?.stId || material?.isNew}
            >
              {pulling ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  PULLING...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  PULL
                </span>
              )}
            </Button>
            {/* Progress bar overlay */}
            {pulling && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-800 rounded-b overflow-hidden">
                <div
                  className="h-full bg-purple-300 transition-all duration-200 ease-out"
                  style={{ width: `${pullProgress}%` }}
                />
              </div>
            )}
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 h-7 px-2 text-xs bg-green-600 hover:bg-green-700 relative overflow-hidden"
              onClick={handlePush}
              disabled={pushing}
            >
              {pushing ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  PUSHING...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  PUSH
                </span>
              )}
            </Button>
            {/* Progress bar overlay */}
            {pushing && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-800 rounded-b overflow-hidden">
                <div
                  className="h-full bg-green-300 transition-all duration-200 ease-out"
                  style={{ width: `${pushProgress}%` }}
                />
              </div>
            )}
          </div>
          {/* View in ST button - only show for materials already pushed to ST */}
          {material?.stId && !material?.isNew && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 h-7 px-2 text-xs"
              onClick={() => window.open(`https://go.servicetitan.com/#/new/pricebook/materials/${material.stId}`, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              VIEW IN ST
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs">
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation */}
        <div className="hidden md:flex w-16 border-r flex-col items-center py-4 gap-2">
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('prev')}>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-xs">PREV</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('next')}>
            <span className="text-xs">NEXT</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Content - New Reorganized Layout */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          
          {/* Hidden file input for image upload */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {/* ROW 1: IDENTITY + PRODUCT IMAGE */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Identity Section */}
            <div className="flex-1 border rounded-lg p-4">
              <div className="text-xs text-muted-foreground font-medium mb-3">IDENTITY</div>
              <div className="grid grid-cols-12 gap-3">
                {/* Code - 3 cols */}
                <div className="col-span-12 md:col-span-3">
                  <div className="text-xs text-muted-foreground font-medium py-2">CODE</div>
                  <Controller
                    name="code"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => { field.onChange(e); setHasChanges(true); }}
                        className="font-mono text-sm h-8"
                        placeholder="C40-0014"
                      />
                    )}
                  />
                </div>
                {/* Name - 6 cols */}
                <div className="col-span-12 md:col-span-6">
                  <div className="text-xs text-muted-foreground font-medium py-2">NAME</div>
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => { field.onChange(e); setHasChanges(true); }}
                        className="text-sm h-8"
                        placeholder="Pipe Conduit Sch40 .75"
                      />
                    )}
                  />
                </div>
                {/* Category - 3 cols */}
                <div className="col-span-12 md:col-span-3">
                  <div className="text-xs text-muted-foreground font-medium py-2">CATEGORY</div>
                  <Popover open={showCategoryPicker} onOpenChange={setShowCategoryPicker}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-8 text-sm justify-start truncate">
                        {selectedCategoryPath || 'Select...'}
                      </Button>
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
                </div>
                {/* Description - 10 cols */}
                <div className="col-span-12 md:col-span-10">
                  <div className="text-xs text-muted-foreground font-medium py-2">DESCRIPTION</div>
                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => { field.onChange(e); setHasChanges(true); }}
                        className="text-sm h-8"
                        placeholder="Sch 40 Conduit Pipe 3/4&quot;"
                      />
                    )}
                  />
                </div>
                {/* Active toggle - 2 cols, right aligned */}
                <div className="col-span-12 md:col-span-2 flex items-end justify-end">
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={form.watch('active')}
                      onCheckedChange={(checked) => { form.setValue('active', !!checked); setHasChanges(true); }}
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>
            
            {/* Product Image Card - fixed width */}
            <div className="w-full md:w-48 flex-shrink-0 border rounded-lg overflow-hidden">
              <div className="p-2 border-b flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">PRODUCT IMAGE</span>
              </div>
              {/* Image with overlays */}
              <div
                className="aspect-square flex items-center justify-center relative group bg-muted/30"
                onMouseEnter={() => setImageHovered(true)}
                onMouseLeave={() => setImageHovered(false)}
              >
                {allImageUrls.length > 0 ? (
                  <>
                    <img
                      src={allImageUrls[currentImageIndex]}
                      alt={`Material image ${currentImageIndex + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    {/* X button to remove image */}
                    <button
                      type="button"
                      onClick={() => {
                        const currentUrl = allImageUrls[currentImageIndex];
                        const pendingIndex = pendingImages.findIndex(url => url === currentUrl);
                        if (pendingIndex >= 0) {
                          setPendingImages(prev => prev.filter((_, i) => i !== pendingIndex));
                          setHasChanges(true);
                        } else {
                          const stAsset = materialAssets.find(a => a.type === 'Image' && getStImageUrl(a.url) === currentUrl);
                          if (stAsset) {
                            setImagesToDelete(prev => [...prev, stAsset.url]);
                            setMaterialAssets(prev => prev.filter(a => a !== stAsset));
                            setHasChanges(true);
                          }
                        }
                        if (currentImageIndex >= allImageUrls.length - 1) {
                          setCurrentImageIndex(Math.max(0, allImageUrls.length - 2));
                        }
                      }}
                      className={cn(
                        "absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition-all duration-200 shadow-lg",
                        imageHovered ? "opacity-100 scale-100" : "opacity-0 scale-75"
                      )}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {/* Badges */}
                    {currentImageIndex < pendingImages.length && (
                      <div className="absolute top-1 left-1">
                        <Badge className="text-[8px] px-1 py-0 bg-yellow-500 text-black">Pending</Badge>
                      </div>
                    )}
                    {currentImageIndex >= pendingImages.length && (
                      <div className="absolute top-1 left-1">
                        <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-500/80 text-white border-blue-400">ST</Badge>
                      </div>
                    )}
                    {/* Nav arrows */}
                    {allImageUrls.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCurrentImageIndex(prev => prev === 0 ? allImageUrls.length - 1 : prev - 1)}
                          className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentImageIndex(prev => prev === allImageUrls.length - 1 ? 0 : prev + 1)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                          <Badge className="bg-black/60 text-white text-[10px] px-1.5">
                            {currentImageIndex + 1}/{allImageUrls.length}
                          </Badge>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-center text-muted-foreground text-xs p-2">
                    <ImagePlus className="h-6 w-6 mx-auto mb-1 opacity-50" />
                    No image
                  </div>
                )}
              </div>
              {/* Edit button */}
              <div className="p-2 border-t">
                <Button
                  size="sm"
                  className="w-full bg-green-500 hover:bg-green-600 text-white text-xs h-7"
                  onClick={() => setShowImageModal(!showImageModal)}
                >
                  Edit{allImageUrls.length > 0 ? ` (${allImageUrls.length})` : ''}
                  {pendingImages.length > 0 && <span className="ml-1 text-yellow-200">*</span>}
                </Button>
              </div>
            </div>
          </div>

          {/* Image Management Modal - positioned absolutely */}
          {showImageModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImageModal(false)}>
              <div className="bg-popover border rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-3 border-b">
                  <h4 className="font-medium text-sm">Manage Images</h4>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowImageModal(false); setImageUrlInput(''); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 space-y-4">
                  {/* Existing Images Grid */}
                  {(materialAssets.length > 0 || pendingImages.length > 0) && (
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">Current Images</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {pendingImages.map((url, index) => (
                          <div key={`pending-${index}`} className="relative border-2 border-yellow-400 rounded-lg overflow-hidden aspect-square bg-muted/30">
                            <img src={url} alt={`Pending ${index + 1}`} className="w-full h-full object-cover" />
                            <Badge className="absolute top-1 left-1 text-[10px] px-1 py-0 bg-yellow-500 text-black">Pending</Badge>
                            <button type="button" onClick={() => { setPendingImages(prev => prev.filter((_, i) => i !== index)); setHasChanges(true); }} className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {materialAssets.filter(a => a.type === 'Image').map((asset, index) => (
                          <div key={index} className="relative border rounded-lg overflow-hidden aspect-square bg-muted/30">
                            <img src={getStImageUrl(asset.url)} alt={asset.alias || `Image ${index + 1}`} className="w-full h-full object-cover" />
                            <Badge variant="outline" className="absolute top-1 left-1 text-[10px] px-1 py-0 bg-blue-500/20 text-blue-700 border-blue-500/50">ST</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="border-t" />
                  <Label className="text-xs text-muted-foreground block">Add New Image</Label>
                  <div className="flex gap-1 p-1 bg-muted rounded-lg">
                    <button type="button" onClick={() => setImageUploadTab('file')} className={cn("flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors", imageUploadTab === 'file' ? "bg-background shadow" : "text-muted-foreground hover:text-foreground")}>
                      <Upload className="h-3 w-3 inline mr-1" />Upload
                    </button>
                    <button type="button" onClick={() => setImageUploadTab('url')} className={cn("flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors", imageUploadTab === 'url' ? "bg-background shadow" : "text-muted-foreground hover:text-foreground")}>
                      <Download className="h-3 w-3 inline mr-1" />URL
                    </button>
                  </div>
                  {imageUploadTab === 'file' && (
                    <div onClick={() => imageInputRef.current?.click()} className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors">
                      <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Click to select</p>
                    </div>
                  )}
                  {imageUploadTab === 'url' && (
                    <div className="space-y-3">
                      <Input type="url" value={imageUrlInput} onChange={(e) => { setImageUrlInput(e.target.value); setImageLoadError(false); }} placeholder="https://example.com/image.jpg" className={cn("text-sm", imageLoadError && "border-red-500")} />
                      {imageUrlInput.trim() && !imageLoadError && (
                        <div className="border rounded-lg overflow-hidden bg-muted/30 h-24 flex items-center justify-center">
                          <img src={getProxyImageUrl(imageUrlInput.trim())} alt="Preview" className="max-h-full max-w-full object-contain" onError={() => setImageLoadError(true)} />
                        </div>
                      )}
                      <Button onClick={handleImageFromUrl} disabled={!imageUrlInput.trim() || imageLoading} className="w-full" size="sm">
                        {imageLoading ? <><RefreshCw className="h-3 w-3 animate-spin mr-1" />Uploading...</> : 'Add Image'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ROW 2: PRICING */}
          <div className="border rounded-lg p-4">
            <div className="text-xs text-muted-foreground font-medium mb-3">PRICING</div>
            <div className="grid grid-cols-6 gap-3 mb-3">
              {/* Cost */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cost</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('cost')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || ''}
                    onChange={(e) => { const cleaned = e.target.value.replace(/[^0-9.]/g, ''); form.setValue('cost', parseFloat(cleaned) || 0); }}
                    className="w-full bg-blue-500/10 border border-blue-500/30 rounded px-2 py-1.5 pl-5 text-sm text-right h-8"
                  />
                </div>
              </div>
              {/* Margin */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Margin</label>
                <div className="relative">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('margin') || ''}
                    onChange={(e) => { const cleaned = e.target.value.replace(/[^0-9.]/g, ''); form.setValue('margin', parseFloat(cleaned) || 0); }}
                    className="w-full bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1.5 text-sm text-right h-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
              {/* Sell Price */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sell Price</label>
                <div className="w-full bg-green-500/10 border border-green-500/30 rounded px-2 py-1.5 text-sm text-right h-8">
                  {formatCurrency(calculatedPrice)}
                </div>
              </div>
              {/* Member Price */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Member Price</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('memberPrice')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    onChange={(e) => { const cleaned = e.target.value.replace(/[^0-9.]/g, ''); handleFieldChange('memberPrice', parseFloat(cleaned) || 0); }}
                    className="w-full border rounded px-2 py-1.5 pl-5 text-sm text-right h-8"
                  />
                </div>
              </div>
              {/* Add-on Price */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Add-on Price</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('addOnPrice')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    onChange={(e) => { const cleaned = e.target.value.replace(/[^0-9.]/g, ''); handleFieldChange('addOnPrice', parseFloat(cleaned) || 0); }}
                    className="w-full border rounded px-2 py-1.5 pl-5 text-sm text-right h-8"
                  />
                </div>
              </div>
              {/* Add-on Member */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Add-on Member</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('addOnMemberPrice')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    onChange={(e) => { const cleaned = e.target.value.replace(/[^0-9.]/g, ''); handleFieldChange('addOnMemberPrice', parseFloat(cleaned) || 0); }}
                    className="w-full border rounded px-2 py-1.5 pl-5 text-sm text-right h-8"
                  />
                </div>
              </div>
            </div>
            {/* Second row: Tax%, SKU%, Unit of Measure, Round Up */}
            <div className="grid grid-cols-6 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tax %</label>
                <div className="relative">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('taxPercent') || ''}
                    onChange={(e) => { const cleaned = e.target.value.replace(/[^0-9.]/g, ''); form.setValue('taxPercent', parseFloat(cleaned) || 0); }}
                    className="w-full border rounded px-2 py-1.5 text-sm text-right h-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">SKU %</label>
                <div className="relative">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('skuPercent') || ''}
                    onChange={(e) => { const cleaned = e.target.value.replace(/[^0-9.]/g, ''); form.setValue('skuPercent', parseFloat(cleaned) || 0); }}
                    className="w-full border rounded px-2 py-1.5 text-sm text-right h-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Unit of Measure</label>
                <input 
                  type="text"
                  value={form.watch('unitOfMeasure') || ''}
                  onChange={(e) => handleFieldChange('unitOfMeasure', e.target.value)}
                  placeholder="Each"
                  className="w-full border rounded px-2 py-1.5 text-sm h-8"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Round Up</label>
                <select 
                  value={form.watch('roundUp') || ''}
                  onChange={(e) => handleFieldChange('roundUp', e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm cursor-pointer h-8"
                >
                  <option value="">None</option>
                  <option value="1">Nearest $1</option>
                  <option value="10">Nearest $10</option>
                  <option value="100">Nearest $100</option>
                </select>
              </div>
            </div>
          </div>

          {/* ROW 3: SETTINGS */}
          <div className="border rounded-lg p-4">
            <div className="text-xs text-muted-foreground font-medium mb-3">SETTINGS</div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2">
              {/* Taxable */}
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm">Taxable</span>
                <button type="button" onClick={() => form.setValue('taxable', !form.watch('taxable'))} className={cn("relative w-9 h-5 rounded-full transition-colors", form.watch('taxable') ? 'bg-primary' : 'bg-muted')}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", form.watch('taxable') ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </label>
              {/* Configurable Material */}
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm">Configurable Material</span>
                <button type="button" onClick={() => handleFieldChange('isConfigurableMaterial', !form.watch('isConfigurableMaterial'))} className={cn("relative w-9 h-5 rounded-full transition-colors", form.watch('isConfigurableMaterial') ? 'bg-primary' : 'bg-muted')}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", form.watch('isConfigurableMaterial') ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </label>
              {/* Chargeable by Default */}
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm">Chargeable by Default</span>
                <button type="button" onClick={() => form.setValue('chargeableByDefault', !form.watch('chargeableByDefault'))} className={cn("relative w-9 h-5 rounded-full transition-colors", form.watch('chargeableByDefault') ? 'bg-primary' : 'bg-muted')}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", form.watch('chargeableByDefault') ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </label>
              {/* Display in Amount */}
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm">Display in Amount</span>
                <button type="button" onClick={() => handleFieldChange('displayInAmount', !form.watch('displayInAmount'))} className={cn("relative w-9 h-5 rounded-full transition-colors", form.watch('displayInAmount') ? 'bg-primary' : 'bg-muted')}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", form.watch('displayInAmount') ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </label>
              {/* Track Inventory */}
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm">Track Inventory</span>
                <button type="button" onClick={() => handleFieldChange('isInventory', !form.watch('isInventory'))} className={cn("relative w-9 h-5 rounded-full transition-colors", form.watch('isInventory') ? 'bg-primary' : 'bg-muted')}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", form.watch('isInventory') ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </label>
              {/* Other Direct Cost */}
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm">Other Direct Cost</span>
                <button type="button" onClick={() => handleFieldChange('isOtherDirectCost', !form.watch('isOtherDirectCost'))} className={cn("relative w-9 h-5 rounded-full transition-colors", form.watch('isOtherDirectCost') ? 'bg-primary' : 'bg-muted')}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", form.watch('isOtherDirectCost') ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </label>
            </div>
          </div>

          {/* ROW 4: LABOR & COMMISSION */}
          <div className="border rounded-lg p-4">
            <div className="text-xs text-muted-foreground font-medium mb-3">LABOR & COMMISSION</div>
            <div className="flex items-end gap-6">
              {/* Hours */}
              <div className="w-32">
                <label className="text-xs text-muted-foreground mb-1 block">Hours</label>
                <div className="relative">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('hours') || '0'}
                    onChange={(e) => { const cleaned = e.target.value.replace(/[^0-9.]/g, ''); handleFieldChange('hours', parseFloat(cleaned) || 0); }}
                    className="w-full border rounded px-2 py-1.5 text-sm text-right h-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">hrs</span>
                </div>
              </div>
              {/* Bonus */}
              <div className="w-32">
                <label className="text-xs text-muted-foreground mb-1 block">Bonus</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('bonus')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    onChange={(e) => { const cleaned = e.target.value.replace(/[^0-9.]/g, ''); handleFieldChange('bonus', parseFloat(cleaned) || 0); }}
                    className="w-full border rounded px-2 py-1.5 pl-5 text-sm text-right h-8"
                  />
                </div>
              </div>
              {/* Commission % */}
              <div className="w-32">
                <label className="text-xs text-muted-foreground mb-1 block">Commission %</label>
                <div className="relative">
                  <input 
                    type="text"
                    inputMode="decimal"
                    value={form.watch('commissionBonus') || '0'}
                    onChange={(e) => { const cleaned = e.target.value.replace(/[^0-9.]/g, ''); handleFieldChange('commissionBonus', parseFloat(cleaned) || 0); }}
                    className="w-full border rounded px-2 py-1.5 text-sm text-right h-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
              {/* Spacer */}
              <div className="flex-1" />
              {/* Pays Commission toggle */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-sm">Pays Commission</span>
                <button type="button" onClick={() => handleFieldChange('paysCommission', !form.watch('paysCommission'))} className={cn("relative w-9 h-5 rounded-full transition-colors", form.watch('paysCommission') ? 'bg-primary' : 'bg-muted')}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", form.watch('paysCommission') ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </label>
              {/* Deduct as Job Cost toggle */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-sm">Deduct as Job Cost</span>
                <button type="button" onClick={() => handleFieldChange('deductAsJobCost', !form.watch('deductAsJobCost'))} className={cn("relative w-9 h-5 rounded-full transition-colors", form.watch('deductAsJobCost') ? 'bg-primary' : 'bg-muted')}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", form.watch('deductAsJobCost') ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </label>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* ROW 5: ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !hasChanges}
              className="bg-blue-600 hover:bg-blue-700 text-white h-10"
            >
              {saveMutation.isPending ? (
                <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Saving...</span>
              ) : (
                'Save Changes'
              )}
            </Button>
            <div className="relative">
              <Button
                onClick={handlePush}
                disabled={pushing || pushMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-10 relative overflow-hidden"
              >
                {pushing || pushMutation.isPending ? (
                  <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Pushing...</span>
                ) : (
                  <span className="flex items-center gap-2"><Upload className="h-4 w-4" />Push to ServiceTitan</span>
                )}
              </Button>
              {pushing && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-800 rounded-b overflow-hidden">
                  <div className="h-full bg-green-300 transition-all duration-200 ease-out" style={{ width: `${pushProgress}%` }} />
                </div>
              )}
            </div>
          </div>

          {/* Success/Status Messages */}
          {saveSuccess && (
            <div className="p-3 bg-blue-500/10 border border-blue-500 rounded-lg text-sm flex items-center gap-2">
              <Check className="h-4 w-4" />{saveSuccess}
            </div>
          )}
          {pushSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg text-sm flex items-center gap-2">
              <Check className="h-4 w-4" />{pushSuccess}
            </div>
          )}
          {pullSuccess && (
            <div className="p-3 bg-purple-500/10 border border-purple-500 rounded-lg text-sm flex items-center gap-2">
              <Download className="h-4 w-4" />{pullSuccess}
            </div>
          )}
          {material?.isNew && (
            <div className="p-3 bg-blue-500/10 border border-blue-500 rounded-lg text-sm">
              This material exists only in LAZI CRM. Click "Push to ServiceTitan" to create it in ST.
            </div>
          )}
          {material?.hasPendingChanges && !material?.isNew && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500 rounded-lg text-sm">
              You have pending changes. Click "Push to ServiceTitan" to sync.
            </div>
          )}
          {material?.pushError && (
            <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-sm">
              Push Error: {material.pushError}
            </div>
          )}

          {/* ROW 6: VENDORS */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-muted-foreground font-medium">VENDORS</div>
              <div className="relative">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white font-medium h-7 text-xs"
                  onClick={() => setShowAddVendorModal(!showAddVendorModal)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Vendor
                </Button>
                {showAddVendorModal && (
                  <div className="absolute top-full right-0 mt-2 w-80 p-4 bg-popover border rounded-lg shadow-lg z-50">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Add Vendor</h4>
                      <div>
                        <label className="text-xs text-muted-foreground">Select Vendor *</label>
                        <select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)} className="w-full h-8 mt-1 text-sm border rounded px-2">
                          <option value="">Choose a vendor...</option>
                          {availableVendors?.map((v: any) => (<option key={v.id} value={v.id}>{v.vendorName}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Vendor Part #</label>
                        <Input value={vendorPart} onChange={(e) => setVendorPart(e.target.value)} placeholder="Part number" className="h-8 mt-1" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">UPC Code</label>
                        <Input value={vendorUpc} onChange={(e) => setVendorUpc(e.target.value)} placeholder="UPC code" className="h-8 mt-1" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Cost</label>
                        <div className="relative mt-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                          <Input type="number" step="0.01" value={vendorCost || ''} onChange={(e) => setVendorCost(parseFloat(e.target.value) || 0)} placeholder="0.00" className="h-8 pl-6" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => { setShowAddVendorModal(false); setSelectedVendorId(''); setVendorCost(0); setVendorPart(''); setVendorUpc(''); }} className="flex-1">Cancel</Button>
                        <Button size="sm" onClick={handleAddVendor} disabled={!selectedVendorId} className="flex-1 bg-green-600 hover:bg-green-700 text-white">Add Vendor</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Vendors Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_70px_120px_120px_80px_60px_40px] gap-2 py-2 px-3 text-xs text-muted-foreground bg-muted/30 border-b">
                <div>Vendor</div>
                <div className="text-center">Pref</div>
                <div>UPC Code</div>
                <div>Part #</div>
                <div className="text-right">Cost</div>
                <div className="text-center">Active</div>
                <div></div>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {vendors.length > 0 ? (
                  vendors.map((vendor: any, index: number) => (
                    <div key={vendor.id || index} className="grid grid-cols-[1fr_70px_120px_120px_80px_60px_40px] gap-2 py-2 px-3 items-center border-b last:border-b-0 hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{vendor.vendorName}</span>
                      </div>
                      <div className="flex justify-center">
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", vendor.preferred ? "bg-primary" : "border-2 border-muted-foreground/30")}>
                          {vendor.preferred && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </div>
                      <div><Input defaultValue={vendor.upcCode || ''} className="h-7 text-xs" placeholder="UPC" /></div>
                      <div><Input defaultValue={vendor.vendorPart || ''} className="h-7 text-xs" placeholder="Part #" /></div>
                      <div className="text-right text-sm font-medium">${vendor.cost?.toFixed(2) || '0.00'}</div>
                      <div className="flex justify-center">
                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center", vendor.active ? "bg-primary" : "border-2 border-muted-foreground/30")}>
                          {vendor.active && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </div>
                      <div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteVendor(vendor.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-sm text-muted-foreground text-center">No vendors added yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Accounts Settings (collapsible) */}
          <div className="border rounded-lg">
            <button
              type="button"
              onClick={() => setShowAccountsPanel(!showAccountsPanel)}
              className="w-full flex items-center justify-between p-4 text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Accounts
              </span>
              <ChevronRight className={cn("h-4 w-4 transition-transform", showAccountsPanel && "rotate-90")} />
            </button>
            {showAccountsPanel && (
              <div className="p-4 pt-0 space-y-3 border-t">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Income Account</label>
                  <select value={form.watch('incomeAccount') || ''} onChange={(e) => handleFieldChange('incomeAccount', e.target.value)} className="w-full h-8 text-sm border rounded px-2 bg-background">
                    <option value="">Select account...</option>
                    {incomeAccounts.map((account) => (<option key={account.id} value={account.id.toString()}>{account.number} - {account.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Asset Account</label>
                  <select value={form.watch('assetAccount') || ''} onChange={(e) => handleFieldChange('assetAccount', e.target.value)} className="w-full h-8 text-sm border rounded px-2 bg-background">
                    <option value="">Select account...</option>
                    {assetAccounts.map((account) => (<option key={account.id} value={account.id.toString()}>{account.number} - {account.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">COGS Account</label>
                  <select value={form.watch('cogsAccount') || ''} onChange={(e) => handleFieldChange('cogsAccount', e.target.value)} className="w-full h-8 text-sm border rounded px-2 bg-background">
                    <option value="">Select account...</option>
                    {cogsAccounts.map((account) => (<option key={account.id} value={account.id.toString()}>{account.number} - {account.name}</option>))}
                  </select>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>


      {/* Success Modal Overlay - Centered on screen */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl shadow-2xl p-8 max-w-md mx-4 transform animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Success!</h3>
              <p className="text-muted-foreground mb-6">{successMessage}</p>
              <Button
                onClick={() => setShowSuccessModal(false)}
                className="bg-green-600 hover:bg-green-700 text-white px-8"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
