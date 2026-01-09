'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Settings,
  ExternalLink,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { KitSelectorModal } from './kits/KitSelectorModal';
import { CategorySelectorModal } from './CategorySelectorModal';
import { ServiceSelectorModal } from './ServiceSelectorModal';
import { ReviewedToggle, PendingChangeDot } from './organization/ReviewedToggle';
import { useBulkReview, usePushToServiceTitan } from '@/hooks/usePricebookOrganization';
import { CheckCircle2 } from 'lucide-react';

interface ServiceDetailPageProps {
  serviceId: string | null;
  onClose: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

interface Service {
  id: string;
  stId?: string;
  st_id?: number;
  code: string;
  name: string;
  displayName?: string;
  description?: string;
  warranty?: string | { description?: string };
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
  incomeAccount?: string;
  assetAccount?: string;
  cogsAccount?: string;
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
  is_reviewed?: boolean;
  has_local_changes?: boolean;
}

interface CategoryTag {
  id: string;
  path: string;
  name: string;
}

interface MaterialLineItem {
  id: string;
  materialId: string;
  stId?: string;  // ServiceTitan ID - required for pushing to ST
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

interface GLAccount {
  id: number;
  name: string;
  number: string;
  type: 'Asset' | 'Expense' | 'Income' | 'Liability';
  active: boolean;
}

interface Asset {
  url: string;
  type: string;
  alias?: string;
  fileName?: string;
  isDefault?: boolean;
}

export function ServiceDetailPage({ serviceId, onClose, onNavigate }: ServiceDetailPageProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'materials' | 'equipment'>('materials');
  const [materialSearch, setMaterialSearch] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isUpgradesModalOpen, setIsUpgradesModalOpen] = useState(false);
  const [isRecommendationsModalOpen, setIsRecommendationsModalOpen] = useState(false);
  const [showAccountsPanel, setShowAccountsPanel] = useState(false);

  // Detect if this is a new service
  const isNewService = !serviceId || serviceId === 'new' || serviceId.startsWith('new_');

  // Local form state - initialize with defaults for new services
  const [formData, setFormData] = useState<Partial<Service>>(() => {
    if (!serviceId || serviceId === 'new') {
      return {
        code: '',
        name: '',
        displayName: '',
        description: '',
        price: 0,
        memberPrice: 0,
        addOnPrice: 0,
        memberAddOnPrice: 0,
        durationHours: 0,
        active: true,
        taxable: true,
        warranty: '',
        categories: [],
        materials: [],
        equipment: [],
        upgrades: [],
        recommendations: [],
      };
    }
    return {};
  });

  // Track local ID for new services (assigned after first save)
  const [localServiceId, setLocalServiceId] = useState<string | null>(
    serviceId?.startsWith('new_') ? serviceId : null
  );

  // Sync state
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>(
    isNewService ? 'pending' : 'synced'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [hasChanges, setHasChanges] = useState(isNewService && serviceId === 'new');

  // Progress and notifications
  const [pushProgress, setPushProgress] = useState(0);
  const [pullProgress, setPullProgress] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [pushSuccess, setPushSuccess] = useState<string | null>(null);
  const [pullSuccess, setPullSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Review status state
  const [isReviewed, setIsReviewed] = useState(false);
  const bulkReviewMutation = useBulkReview();
  const pushOrgMutation = usePushToServiceTitan();

  // Image state
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [serviceAssets, setServiceAssets] = useState<Asset[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allImageUrls, setAllImageUrls] = useState<string[]>([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [imageUploadTab, setImageUploadTab] = useState<'file' | 'url'>('file');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Get effective ID (local ID for new services, or serviceId for existing)
  const effectiveId = localServiceId || serviceId;

  const { data: service, isLoading } = useQuery({
    queryKey: ['service-detail', effectiveId],
    queryFn: () => fetchService(effectiveId!),
    enabled: !!effectiveId && effectiveId !== 'new',
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

  // Helper to convert ST image path to full proxied URL
  const getStImageUrl = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('data:')) return path;
    if (path.includes('/api/images/')) return path;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return apiUrl(`/api/images/proxy?url=${encodeURIComponent(path)}`);
    }
    return apiUrl(`/api/images/st/${path}`);
  };

  // Get proxy URL for external images
  const getProxyImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    if (url.includes('/api/images/')) return url;
    return apiUrl(`/api/images/proxy?url=${encodeURIComponent(url)}`);
  };

  // Handle image upload from file
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageLoading(true);
    setImageLoadError(false);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const response = await fetch(apiUrl('/api/pricebook/images/upload-file'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: base64Data,
          filename: file.name,
          entityType: 'services',
          entityId: effectiveId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPendingImages(prev => [...prev, result.s3Url]);
        setHasChanges(true);
        setShowImageModal(false);
      } else {
        setImageLoadError(true);
      }
    } catch (err) {
      console.error('[IMAGE UPLOAD] Error:', err);
      setImageLoadError(true);
    } finally {
      setImageLoading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // Handle image from URL
  const handleImageFromUrl = async () => {
    const url = imageUrlInput.trim();
    if (!url) return;

    setImageLoading(true);
    setImageLoadError(false);

    try {
      const response = await fetch(apiUrl('/api/pricebook/images/upload'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          entityType: 'services',
          entityId: effectiveId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPendingImages(prev => [...prev, result.s3Url]);
        setHasChanges(true);
        setShowImageModal(false);
        setImageUrlInput('');
        setImageLoadError(false);
      } else {
        setImageLoadError(true);
      }
    } catch (err) {
      console.error('[IMAGE UPLOAD] Error:', err);
      setImageLoadError(true);
    } finally {
      setImageLoading(false);
    }
  };

  useEffect(() => {
    if (service) {
      setFormData(service);
      // Initialize reviewed status from service data
      setIsReviewed(service.is_reviewed || false);
      // Initialize sync status from API response
      if ((service as any).isNew || (service as any)._syncStatus === 'pending' || (service as any)._hasLocalEdits || service.has_local_changes) {
        setSyncStatus('pending');
      } else if ((service as any)._syncStatus === 'error') {
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
      }

      // Load images from service
      const assets = (service as any).assets || [];
      setServiceAssets(assets);

      // Load images marked for deletion
      const loadedImagesToDelete: string[] = (service as any).imagesToDelete || [];
      setImagesToDelete(loadedImagesToDelete);

      // Build array of ST asset image URLs
      const stImageUrls: string[] = assets
        .filter((a: Asset) => a.type === 'Image')
        .map((asset: Asset) => getStImageUrl(asset.url));

      // Load pending images from API response
      const loadedPendingImages: string[] = (service as any).pendingImages || [];
      setPendingImages(loadedPendingImages);

      // Combine all images: pending first, then ST assets
      const allUrls = [...loadedPendingImages, ...stImageUrls];
      setAllImageUrls(allUrls);
      setCurrentImageIndex(0);
    }
  }, [service]);

  // Update allImageUrls when pending images change
  useEffect(() => {
    const stUrls = serviceAssets.filter(a => a.type === 'Image').map(a => getStImageUrl(a.url));
    const allUrls = [...pendingImages, ...stUrls];
    setAllImageUrls(allUrls);
    if (allUrls.length > 0 && currentImageIndex >= allUrls.length) {
      setCurrentImageIndex(0);
    }
  }, [pendingImages, serviceAssets]);

  const updateField = (field: keyof Service, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSyncStatus('pending');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  // SAVE handler - saves locally to CRM table
  // For new services: POST to create, for existing: PUT to update
  const handleSave = async () => {
    // Validate required fields for new services
    if (serviceId === 'new' && !localServiceId) {
      if (!formData.code || !formData.description) {
        setError('Code and Description are required fields');
        toast({
          title: 'Validation Error',
          description: 'Code and Description are required fields',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSaving(true);
    setSaveSuccess(null);
    setError(null);

    try {
      // Determine if creating new or updating existing
      const isCreatingNew = serviceId === 'new' && !localServiceId;
      const updateId = localServiceId || serviceId;

      const url = isCreatingNew
        ? apiUrl('/api/pricebook/services')
        : apiUrl(`/api/pricebook/services/${updateId}`);

      const method = isCreatingNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '3222348440',
        },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          displayName: formData.displayName || formData.name,
          description: formData.description,
          price: formData.price,
          memberPrice: formData.memberPrice,
          addOnPrice: formData.addOnPrice,
          addOnMemberPrice: formData.memberAddOnPrice,
          hours: formData.durationHours,
          active: formData.active,
          taxable: formData.taxable,
          warranty: typeof formData.warranty === 'string' ? formData.warranty : formData.warranty?.description || '',
          categories: formData.categories,
          materials: formData.materials,
          equipment: formData.equipment,
          // Include pending images and images to delete
          pendingImages: pendingImages.length > 0 ? pendingImages : undefined,
          imagesToDelete: imagesToDelete.length > 0 ? imagesToDelete : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSyncStatus('pending');
        setHasChanges(false);

        // If we just created a new service, store the local ID
        if (isCreatingNew && result.data?.id) {
          setLocalServiceId(result.data.id);
          setSaveSuccess(`Service "${formData.code}" created. Click PUSH to sync with ServiceTitan.`);
          // Update URL to include the new ID
          window.history.replaceState(null, '', `/dashboard/pricebook/services/${result.data.id}`);
        } else {
          setSaveSuccess('Changes saved locally. Click PUSH to sync with ServiceTitan.');
        }
        // Clear success message after 5 seconds
        setTimeout(() => setSaveSuccess(null), 5000);
      } else {
        setError(result.error || 'Failed to save');
        toast({
          title: 'Save failed',
          description: result.error || 'Failed to save',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save changes');
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
  // For new services: POST to ST creates service and returns new ID
  // For existing services: PATCH updates the service
  const handlePush = async () => {
    // Get the ID to push (local ID for new services, serviceId for existing)
    const pushId = localServiceId || serviceId;

    // Validate: must have saved first (have a local ID) before pushing
    if (!pushId || pushId === 'new') {
      setError('Please save the service first before pushing to ServiceTitan');
      toast({
        title: 'Save Required',
        description: 'Please save the service first before pushing to ServiceTitan',
        variant: 'destructive',
      });
      return;
    }

    setIsPushing(true);
    setPushProgress(0);
    setPushSuccess(null);
    setError(null);

    // Simulate progress while pushing
    const progressInterval = setInterval(() => {
      setPushProgress(prev => Math.min(prev + 10, 90));
    }, 150);

    try {
      const response = await fetch(
        apiUrl(`/api/pricebook/services/${pushId}/push`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': '3222348440',
          },
        }
      );

      clearInterval(progressInterval);
      setPushProgress(100);

      const result = await response.json();

      if (result.success) {
        setSyncStatus('synced');
        setHasChanges(false);

        // Check if we pushed a new service and got a real ST ID back
        if (result.newStId && pushId.startsWith('new_')) {
          setPushSuccess('Service created in ServiceTitan!');
          setSuccessMessage(`Service has been created in ServiceTitan with ID: ${result.newStId}`);
          setShowSuccessModal(true);

          // Redirect to the new ST ID URL after showing success
          setTimeout(() => {
            window.location.href = `/dashboard/pricebook/services/${result.newStId}`;
          }, 1500);
        } else {
          setPushSuccess('Successfully pushed to ServiceTitan!');
          setSuccessMessage('Changes have been pushed to ServiceTitan successfully.');
          setShowSuccessModal(true);
          // Refresh data
          queryClient.invalidateQueries({ queryKey: ['service-detail', pushId] });
          // Clear success message after 5 seconds
          setTimeout(() => setPushSuccess(null), 5000);
        }
      } else {
        setSyncStatus('error');
        setError(result.error || 'Failed to push to ServiceTitan');
        toast({
          title: 'Push failed',
          description: result.error || 'Failed to push to ServiceTitan',
          variant: 'destructive',
        });
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Push error:', err);
      setSyncStatus('error');
      setError('Failed to push to ServiceTitan');
      toast({
        title: 'Push failed',
        description: 'Failed to push to ServiceTitan',
        variant: 'destructive',
      });
    } finally {
      setIsPushing(false);
      setTimeout(() => setPushProgress(0), 500);
    }
  };

  // PULL handler - pulls latest from ServiceTitan
  // Only available for existing services (not new ones)
  const handlePull = async () => {
    const pullId = localServiceId || serviceId;
    if (!pullId || pullId === 'new' || pullId.startsWith('new_')) return;

    const confirmed = window.confirm(
      'This will overwrite your local changes with the latest data from ServiceTitan. Continue?'
    );
    if (!confirmed) return;

    setIsPulling(true);
    setPullProgress(0);
    setPullSuccess(null);
    setError(null);

    // Simulate progress while pulling
    const progressInterval = setInterval(() => {
      setPullProgress(prev => Math.min(prev + 10, 90));
    }, 150);

    try {
      const response = await fetch(
        apiUrl(`/api/pricebook/services/${pullId}/pull`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': '3222348440',
          },
        }
      );

      clearInterval(progressInterval);
      setPullProgress(100);

      const result = await response.json();

      if (result.success) {
        setSyncStatus('synced');
        setHasChanges(false);
        setPullSuccess('Pulled latest from ServiceTitan!');
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['service-detail', pullId] });
        // Clear success message after 5 seconds
        setTimeout(() => setPullSuccess(null), 5000);
      } else {
        setError(result.error || 'Failed to pull from ServiceTitan');
        toast({
          title: 'Pull failed',
          description: result.error || 'Failed to pull from ServiceTitan',
          variant: 'destructive',
        });
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Pull error:', err);
      setError('Failed to pull from ServiceTitan');
      toast({
        title: 'Pull failed',
        description: 'Failed to pull from ServiceTitan',
        variant: 'destructive',
      });
    } finally {
      setIsPulling(false);
      setTimeout(() => setPullProgress(0), 500);
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
    setHasChanges(true);
    toast({
      title: 'Kit applied',
      description: `Added ${kitMaterials.length} materials from kit`,
    });
  };

  // Handle review toggle using organization API
  const handleReviewToggle = async (reviewed: boolean) => {
    const serviceStId = service?.st_id || parseInt(effectiveId || '0');
    if (!serviceStId) return;

    try {
      await bulkReviewMutation.mutateAsync({
        entityType: 'service',
        stIds: [serviceStId],
        isReviewed: reviewed,
      });
      setIsReviewed(reviewed);
      toast({
        title: reviewed ? 'Marked as Field Ready' : 'Marked as Needs Review',
        description: reviewed
          ? 'This service has been marked as reviewed and ready for technicians.'
          : 'This service has been marked as needing review.',
      });
      // Refresh service data
      queryClient.invalidateQueries({ queryKey: ['service-detail', effectiveId] });
    } catch (err) {
      console.error('Review toggle error:', err);
      toast({
        title: 'Review update failed',
        description: 'Failed to update review status',
        variant: 'destructive',
      });
    }
  };

  const materialNet = formData.materials?.reduce((sum, m) => sum + (m.quantity * m.unitCost), 0) || 0;
  const materialList = materialNet * 3.15; // Example markup

  // Only show loading for existing services, not new ones
  if (isLoading && serviceId !== 'new' && !serviceId?.startsWith('new_')) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading service...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Bar - matching materials page */}
      <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs" onClick={onClose}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to List
          </Button>
          <span className="font-semibold text-lg mx-4">Services</span>
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
            <RefreshCw className="h-3 w-3 mr-1" />
            REFRESH
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {/* Status badges */}
          {/* New Service badge */}
          {isNewService && (
            <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/50">
              New Service
            </Badge>
          )}
          {(hasChanges || syncStatus === 'pending') && !isNewService && (
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">
              {hasChanges ? 'Unsaved Changes' : 'Pending Changes'}
            </Badge>
          )}
          {syncStatus === 'error' && (
            <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/50">
              Sync Error
            </Badge>
          )}

          {/* SAVE Button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
            disabled={isSaving || (!hasChanges && !isNewService)}
          >
            {isSaving ? (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                SAVING...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Save className="h-3 w-3" />
                SAVE
              </span>
            )}
          </Button>

          {/* PULL Button with progress - disabled for new services */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-white hover:bg-white/10 h-7 px-2 text-xs relative overflow-hidden",
                isNewService ? "bg-gray-500 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
              )}
              onClick={handlePull}
              disabled={isPulling || isNewService}
              title={isNewService ? "Cannot pull a new service - push first to create in ServiceTitan" : "Pull latest from ServiceTitan"}
            >
              {isPulling ? (
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
            {isPulling && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-800 rounded-b overflow-hidden">
                <div
                  className="h-full bg-purple-300 transition-all duration-200 ease-out"
                  style={{ width: `${pullProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* PUSH Button with progress */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-white hover:bg-white/10 h-7 px-2 text-xs relative overflow-hidden",
                (service?.has_local_changes || hasChanges || syncStatus === 'pending')
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-green-600 hover:bg-green-700"
              )}
              onClick={handlePush}
              disabled={isPushing}
            >
              {isPushing ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  PUSHING...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  PUSH
                  {(service?.has_local_changes || hasChanges || syncStatus === 'pending') && (
                    <PendingChangeDot title="Pending changes to sync" />
                  )}
                </span>
              )}
            </Button>
            {isPushing && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-800 rounded-b overflow-hidden">
                <div
                  className="h-full bg-green-300 transition-all duration-200 ease-out"
                  style={{ width: `${pushProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* View in ST button */}
          {service?.stId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 h-7 px-2 text-xs"
              onClick={() => window.open(`https://go.servicetitan.com/#/new/pricebook/services/${service.stId}`, '_blank')}
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

      {/* Review Status Bar - Only show for existing services */}
      {!isNewService && (
        <div className="px-4 py-2 space-y-2">
          {/* Review Status */}
          <div
            className={cn(
              'rounded-lg p-3 flex items-center justify-between',
              isReviewed
                ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800'
                : 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
            )}
          >
            <div className="flex items-center gap-3">
              {isReviewed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              )}
              <div>
                <span className={cn('font-medium', isReviewed ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400')}>
                  {isReviewed ? 'Field Ready' : 'Needs Review'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  {isReviewed
                    ? 'This item has been reviewed and is ready for technicians'
                    : 'Review pricing, description, and images before use'}
                </span>
              </div>
            </div>
            <ReviewedToggle
              isReviewed={isReviewed}
              onToggle={handleReviewToggle}
              size="lg"
              disabled={bulkReviewMutation.isPending}
            />
          </div>

          {/* Pending Changes Warning */}
          {(service?.has_local_changes || hasChanges || syncStatus === 'pending') && (
            <div className="rounded-lg p-3 bg-orange-50 border border-orange-200 dark:bg-orange-950 dark:border-orange-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <span className="font-medium text-orange-700 dark:text-orange-400">Pending Changes</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                    Local edits not yet pushed to ServiceTitan
                  </span>
                </div>
              </div>
              <Button
                onClick={handlePush}
                disabled={isPushing}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isPushing ? (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Pushing...
                  </span>
                ) : (
                  'Push Now'
                )}
              </Button>
            </div>
          )}
        </div>
      )}

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
                  value={typeof formData.warranty === 'string' ? formData.warranty : formData.warranty?.description || ''}
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
                  {formData.upgrades?.length ? formData.upgrades.map((u, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {u}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => updateField('upgrades', formData.upgrades?.filter((_, idx) => idx !== i))}
                      />
                    </Badge>
                  )) : (
                    <span className="text-xs text-muted-foreground">No upgrades assigned</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:h-8 md:w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                  onClick={() => setIsUpgradesModalOpen(true)}
                >
                  <Plus className="h-4 w-4 md:h-3 md:w-3" />
                </Button>
              </div>

              {/* REC */}
              <div className="text-xs text-muted-foreground font-medium py-2">REC</div>
              <div className="md:col-span-2 flex items-center gap-2">
                <div className="flex-1 border rounded-md p-2 min-h-[44px] md:min-h-[32px] flex items-center gap-2 flex-wrap">
                  {formData.recommendations?.length ? formData.recommendations.map((r, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {r}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => updateField('recommendations', formData.recommendations?.filter((_, idx) => idx !== i))}
                      />
                    </Badge>
                  )) : (
                    <span className="text-xs text-muted-foreground">No recommendations assigned</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:h-8 md:w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                  onClick={() => setIsRecommendationsModalOpen(true)}
                >
                  <Plus className="h-4 w-4 md:h-3 md:w-3" />
                </Button>
              </div>

              {/* CAT */}
              <div className="text-xs text-muted-foreground font-medium py-2">CAT</div>
              <div className="md:col-span-2 flex items-center gap-2">
                <div className="flex-1 border rounded-md p-2 min-h-[44px] md:min-h-[32px] flex items-center gap-2 flex-wrap">
                  {formData.categories?.length ? formData.categories.map((cat) => (
                    <Badge key={cat.id} variant="outline" className="gap-1 text-xs">
                      {cat.path || cat.name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => updateField('categories', formData.categories?.filter(c => c.id !== cat.id))}
                      />
                    </Badge>
                  )) : (
                    <span className="text-xs text-muted-foreground">No categories assigned</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 md:h-8 md:w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                  onClick={() => setIsCategoriesModalOpen(true)}
                >
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
                    <Checkbox checked={false} disabled />
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
                    checked={formData.active ?? true}
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
              {/* Accounts Settings Box */}
              <div className="border rounded-lg">
                <button
                  type="button"
                  onClick={() => setShowAccountsPanel(!showAccountsPanel)}
                  className="w-full flex items-center justify-between p-2 text-xs font-medium hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="h-3 w-3" />
                    Accounts
                  </span>
                  <ChevronRight className={cn("h-3 w-3 transition-transform", showAccountsPanel && "rotate-90")} />
                </button>

                {showAccountsPanel && (
                  <div className="p-2 pt-0 space-y-2 border-t">
                    {/* Income Account */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Income Account</Label>
                      <select
                        value={formData.incomeAccount || ''}
                        onChange={(e) => updateField('incomeAccount', e.target.value)}
                        className="w-full h-7 text-xs border rounded px-2 bg-background"
                      >
                        <option value="">Select account...</option>
                        {incomeAccounts.map((account) => (
                          <option key={account.id} value={account.id.toString()}>
                            {account.number} - {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Asset Account */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Asset Account</Label>
                      <select
                        value={formData.assetAccount || ''}
                        onChange={(e) => updateField('assetAccount', e.target.value)}
                        className="w-full h-7 text-xs border rounded px-2 bg-background"
                      >
                        <option value="">Select account...</option>
                        {assetAccounts.map((account) => (
                          <option key={account.id} value={account.id.toString()}>
                            {account.number} - {account.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* COGS Account */}
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">COGS Account</Label>
                      <select
                        value={formData.cogsAccount || ''}
                        onChange={(e) => updateField('cogsAccount', e.target.value)}
                        className="w-full h-7 text-xs border rounded px-2 bg-background"
                      >
                        <option value="">Select account...</option>
                        {cogsAccounts.map((account) => (
                          <option key={account.id} value={account.id.toString()}>
                            {account.number} - {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
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
                    checked={formData.taxable ?? false}
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
                    checked={formData.noDiscounts ?? false}
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
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <div className="relative">
              <Button
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                onClick={() => setShowImageModal(!showImageModal)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Image{(pendingImages.length + serviceAssets.filter(a => a.type === 'Image').length) > 0 ? ` (${pendingImages.length + serviceAssets.filter(a => a.type === 'Image').length})` : ''}
                {pendingImages.length > 0 && <span className="ml-1 text-yellow-200">*</span>}
              </Button>

              {/* Image Management Modal */}
              {showImageModal && (
                <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-popover border rounded-lg shadow-lg z-50 max-h-[500px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">Manage Images</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setShowImageModal(false);
                        setImageUrlInput('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Existing Images Grid */}
                  {(serviceAssets.length > 0 || pendingImages.length > 0) && (
                    <div className="mb-4">
                      <Label className="text-xs text-muted-foreground mb-2 block">Current Images</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Show pending images (to be pushed) */}
                        {pendingImages.map((url, index) => (
                          <div key={`pending-${index}`} className="relative border-2 border-yellow-400 rounded-lg overflow-hidden aspect-square bg-muted/30">
                            <img
                              src={url}
                              alt={`Pending image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-1 left-1">
                              <Badge className="text-[10px] px-1 py-0 bg-yellow-500 text-black">Pending</Badge>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setPendingImages(prev => prev.filter((_, i) => i !== index));
                                setHasChanges(true);
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {/* Show ST assets */}
                        {serviceAssets.filter(a => a.type === 'Image').map((asset, index) => (
                          <div key={index} className="relative border rounded-lg overflow-hidden aspect-square bg-muted/30">
                            <img
                              src={getStImageUrl(asset.url)}
                              alt={asset.alias || `Image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-1 left-1">
                              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-blue-500/20 text-blue-700 border-blue-500/50">ST</Badge>
                            </div>
                            {asset.isDefault && (
                              <div className="absolute bottom-1 left-1">
                                <Badge className="text-[10px] px-1 py-0 bg-green-500">Default</Badge>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {pendingImages.length > 0 && (
                        <p className="text-xs text-yellow-600 mt-2">
                          {pendingImages.length} pending image{pendingImages.length > 1 ? 's' : ''} will be uploaded when you push to ServiceTitan.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t my-3" />

                  {/* Add New Image Section */}
                  <Label className="text-xs text-muted-foreground mb-2 block">Add New Image</Label>

                  {/* Tab Buttons */}
                  <div className="flex gap-1 mb-3 p-1 bg-muted rounded-lg">
                    <button
                      type="button"
                      onClick={() => setImageUploadTab('file')}
                      className={cn(
                        "flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors",
                        imageUploadTab === 'file'
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Upload className="h-3 w-3 inline mr-1" />
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadTab('url')}
                      className={cn(
                        "flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors",
                        imageUploadTab === 'url'
                          ? "bg-background shadow text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Download className="h-3 w-3 inline mr-1" />
                      From URL
                    </button>
                  </div>

                  {/* File Upload Tab */}
                  {imageUploadTab === 'file' && (
                    <div className="space-y-3">
                      <div
                        onClick={() => imageInputRef.current?.click()}
                        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-green-500 hover:bg-green-50/50 transition-colors"
                      >
                        <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          Click to select an image
                        </p>
                      </div>
                    </div>
                  )}

                  {/* URL Tab */}
                  {imageUploadTab === 'url' && (
                    <div className="space-y-3">
                      <div>
                        <Input
                          type="url"
                          value={imageUrlInput}
                          onChange={(e) => {
                            setImageUrlInput(e.target.value);
                            setImageLoadError(false);
                          }}
                          placeholder="https://example.com/image.jpg"
                          className={cn("text-sm", imageLoadError && "border-red-500")}
                        />
                        {imageLoadError && (
                          <p className="text-xs text-red-500 mt-1">Failed to load image</p>
                        )}
                      </div>
                      {/* URL Preview */}
                      {imageUrlInput.trim() && !imageLoadError && (
                        <div className="border rounded-lg overflow-hidden bg-muted/30 h-24 flex items-center justify-center">
                          <img
                            src={getProxyImageUrl(imageUrlInput.trim())}
                            alt="Preview"
                            className="max-h-full max-w-full object-contain"
                            onError={() => setImageLoadError(true)}
                          />
                        </div>
                      )}
                      <Button
                        onClick={handleImageFromUrl}
                        disabled={!imageUrlInput.trim() || imageLoading}
                        className="w-full bg-green-500 hover:bg-green-600"
                        size="sm"
                      >
                        {imageLoading ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Uploading...
                          </span>
                        ) : (
                          'Add Image'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Image Preview with Carousel */}
            <div
              className="border rounded-lg overflow-hidden bg-muted/30 aspect-square flex items-center justify-center relative group"
              onMouseEnter={() => setImageHovered(true)}
              onMouseLeave={() => setImageHovered(false)}
            >
              {allImageUrls.length > 0 ? (
                <>
                  <img
                    src={allImageUrls[currentImageIndex]}
                    alt={`Service image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Navigation arrows */}
                  {allImageUrls.length > 1 && imageHovered && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCurrentImageIndex(i => (i - 1 + allImageUrls.length) % allImageUrls.length)}
                        className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentImageIndex(i => (i + 1) % allImageUrls.length)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  {/* Image counter */}
                  {allImageUrls.length > 1 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/50 rounded text-white text-xs">
                      {currentImageIndex + 1} / {allImageUrls.length}
                    </div>
                  )}
                  {/* Pending badge on preview */}
                  {currentImageIndex < pendingImages.length && (
                    <div className="absolute top-1 left-1">
                      <Badge className="text-[10px] px-1 py-0 bg-yellow-500 text-black">Pending</Badge>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <ImagePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No images</p>
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

      {/* Category Selector Modal */}
      <CategorySelectorModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        selectedCategories={formData.categories || []}
        onCategoriesChange={(categories) => {
          updateField('categories', categories);
        }}
      />

      {/* Upgrades Selector Modal */}
      <ServiceSelectorModal
        isOpen={isUpgradesModalOpen}
        onClose={() => setIsUpgradesModalOpen(false)}
        title="Select Upgrade Services"
        selectedServices={formData.upgrades || []}
        onServicesChange={(services) => {
          updateField('upgrades', services);
        }}
        excludeServiceId={effectiveId || undefined}
      />

      {/* Recommendations Selector Modal */}
      <ServiceSelectorModal
        isOpen={isRecommendationsModalOpen}
        onClose={() => setIsRecommendationsModalOpen(false)}
        title="Select Recommended Services"
        selectedServices={formData.recommendations || []}
        onServicesChange={(services) => {
          updateField('recommendations', services);
        }}
        excludeServiceId={effectiveId || undefined}
      />

      {/* Notification Messages - Fixed position at bottom */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {/* Save Success Message */}
        {saveSuccess && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-lg text-sm text-blue-700 flex items-center gap-2 animate-in slide-in-from-bottom-2">
            <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
            {saveSuccess}
          </div>
        )}

        {/* Push Success Message */}
        {pushSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg shadow-lg text-sm text-green-700 flex items-center gap-2 animate-in slide-in-from-bottom-2">
            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
            {pushSuccess}
          </div>
        )}

        {/* Pull Success Message */}
        {pullSuccess && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg shadow-lg text-sm text-purple-700 flex items-center gap-2 animate-in slide-in-from-bottom-2">
            <Download className="h-4 w-4 text-purple-600 flex-shrink-0" />
            {pullSuccess}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg text-sm text-red-700 flex items-center gap-2 animate-in slide-in-from-bottom-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Success Modal Overlay */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-4 transform animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Success!</h3>
              <p className="text-gray-600 mb-6">{successMessage}</p>
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
