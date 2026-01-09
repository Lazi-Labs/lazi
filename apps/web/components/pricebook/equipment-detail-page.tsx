'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Plus, Search, Copy, RefreshCw, Download, Upload, Settings, X, Trash2, Check, ImagePlus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { CategoryTreeFilter } from './category-tree-filter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Asset { url: string; type: string; alias?: string; fileName?: string; isDefault?: boolean; }
interface Vendor { id: string; vendorName: string; vendorId?: number; cost: number; vendorPart?: string; upcCode?: string; preferred?: boolean; active?: boolean; }
interface Warranty { duration?: number; description?: string; }
interface Equipment {
  id: string; stId?: string; code: string; name: string; displayName?: string; description?: string;
  manufacturer?: string; model?: string; cost: number; price: number; memberPrice?: number; addOnPrice?: number;
  addOnMemberPrice?: number; margin?: number; active: boolean; taxable?: boolean; chargeableByDefault?: boolean;
  defaultImageUrl?: string | null; category?: string; categoryPath?: string; primaryVendor?: Vendor | null;
  vendors?: Vendor[]; otherVendors?: Vendor[]; assets?: Asset[]; hours?: number; bonus?: number; commissionBonus?: number;
  paysCommission?: boolean; deductAsJobCost?: boolean; manufacturerWarranty?: Warranty | null;
  serviceWarranty?: Warranty | null; account?: string; categories?: number[];
  hasPendingChanges?: boolean; isNew?: boolean; pushError?: string; pendingImages?: string[]; imagesToDelete?: string[];
}

interface EquipmentDetailPageProps { equipmentId?: string; onClose?: () => void; onSave?: () => void; onNavigate?: (direction: 'prev' | 'next') => void; }

export function EquipmentDetailPage({ equipmentId, onClose, onSave, onNavigate }: EquipmentDetailPageProps) {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushProgress, setPushProgress] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [vendorCost, setVendorCost] = useState<number>(0);
  const [vendorPart, setVendorPart] = useState<string>('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [imageUploadTab, setImageUploadTab] = useState<'file' | 'url'>('file');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [pullSuccess, setPullSuccess] = useState<string | null>(null);
  const [equipmentAssets, setEquipmentAssets] = useState<Asset[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allImageUrls, setAllImageUrls] = useState<string[]>([]);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [imageHovered, setImageHovered] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const getStImageUrl = (path: string): string => {
    if (!path) return '';
    if (path.startsWith('data:') || path.includes('/api/images/')) return path;
    if (path.startsWith('http://') || path.startsWith('https://')) return apiUrl(`/api/images/proxy?url=${encodeURIComponent(path)}`);
    return apiUrl(`/api/images/st/${path}`);
  };

  const { data: categoriesData } = useQuery({
    queryKey: ['pricebook-categories', 'equipment', 'active'],
    queryFn: async () => { const res = await fetch(apiUrl('/api/pricebook/categories?type=equipment&active=true')); if (!res.ok) return []; const data = await res.json(); return Array.isArray(data) ? data : (data.data || []); },
  });

  const { data: availableVendors } = useQuery({
    queryKey: ['inventory-vendors'],
    queryFn: async () => { const res = await fetch(apiUrl('/api/inventory/vendors?active=true')); if (!res.ok) return []; const data = await res.json(); return data.data || []; },
  });

  const { data: equipment, refetch: refetchEquipment } = useQuery({
    queryKey: ['equipment', equipmentId],
    queryFn: async () => { if (!equipmentId) return null; const res = await fetch(apiUrl(`/api/pricebook/equipment/${equipmentId}`)); if (!res.ok) return null; return res.json(); },
    enabled: !!equipmentId,
  });

  const form = useForm<Equipment>({
    defaultValues: { code: '', name: '', description: '', manufacturer: '', model: '', cost: 0, price: 0, memberPrice: 0, addOnPrice: 0, addOnMemberPrice: 0, margin: 70, active: true, taxable: true, chargeableByDefault: true, hours: 0, bonus: 0, commissionBonus: 0, paysCommission: false, deductAsJobCost: false, account: '', vendors: [] },
  });

  useEffect(() => {
    if (equipment) {
      const imgUrl = equipment.imageUrl || equipment.s3ImageUrl || equipment.defaultImageUrl || null;
      form.reset({ code: equipment.code || '', name: equipment.name || '', description: equipment.description || '', manufacturer: equipment.manufacturer || '', model: equipment.model || '', cost: equipment.cost || 0, price: equipment.price || 0, memberPrice: equipment.memberPrice || 0, addOnPrice: equipment.addOnPrice || 0, addOnMemberPrice: equipment.addOnMemberPrice || 0, margin: equipment.margin || 70, active: equipment.active ?? true, taxable: equipment.taxable ?? true, chargeableByDefault: equipment.chargeableByDefault ?? true, hours: equipment.hours || 0, bonus: equipment.bonus || 0, commissionBonus: equipment.commissionBonus || 0, paysCommission: equipment.paysCommission ?? false, deductAsJobCost: equipment.deductAsJobCost ?? false, account: equipment.account || '', manufacturerWarranty: equipment.manufacturerWarranty || null, serviceWarranty: equipment.serviceWarranty || null, vendors: [...(equipment.primaryVendor ? [{ ...equipment.primaryVendor, preferred: true }] : []), ...(equipment.vendors || []).map((v: any) => ({ ...v, preferred: false }))] });
      const assets = equipment.assets || []; setEquipmentAssets(assets); setImagesToDelete(equipment.imagesToDelete || []);
      const stUrls: string[] = []; assets.filter((a: Asset) => a.type === 'Image').forEach((asset: Asset) => { if (asset.url) stUrls.push(getStImageUrl(asset.url)); });
      const loadedPending: string[] = equipment.pendingImages || [];
      if (imgUrl && !imgUrl.startsWith('[')) { const localUrl = getStImageUrl(imgUrl); if (!stUrls.includes(localUrl) && !loadedPending.includes(imgUrl)) stUrls.unshift(localUrl); }
      setPendingImages(loadedPending); setAllImageUrls([...loadedPending, ...stUrls]); setCurrentImageIndex(0);
    }
  }, [equipment]);

  useEffect(() => { const stUrls = equipmentAssets.filter(a => a.type === 'Image').map(a => getStImageUrl(a.url)); setAllImageUrls([...pendingImages, ...stUrls]); }, [pendingImages, equipmentAssets]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Equipment>) => {
      const isNew = !equipmentId || equipmentId === 'new';
      const res = await fetch(isNew ? apiUrl('/api/pricebook/equipment') : apiUrl(`/api/pricebook/equipment/${equipmentId}`), { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Failed to save'); return result;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pricebook-equipment'] }); queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] }); setHasChanges(false); onSave?.(); },
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/equipment/push'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stIds: equipment?.isNew ? [equipment.id] : [equipment?.stId] }) });
      const result = await res.json(); if (!res.ok || result.failed?.length > 0) throw new Error(result.failed?.[0]?.error || result.error || 'Push failed'); return result;
    },
    onSuccess: (result) => { queryClient.invalidateQueries({ queryKey: ['pricebook-equipment'] }); queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] }); if (result.results?.created?.length > 0) { const newStId = result.results.created[0].stId; if (newStId && window.location.pathname.includes('new_')) window.location.href = `/dashboard/pricebook/equipment/${newStId}`; } },
  });

  const cost = form.watch('cost'); const margin = form.watch('margin'); const bonus = form.watch('bonus') || 0;
  const calculatedPrice = (cost && margin ? cost / (1 - margin / 100) : 0) + bonus;
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const vendors = form.watch('vendors') || [];

  const findCategoryPath = (cats: any[], targetId: string, path: string[] = []): string | null => { for (const cat of cats) { const id = String(cat.id || cat.stId); if (id === targetId) return [...path, cat.name].join(' > '); const children = cat.children || cat.subcategories || []; if (children.length > 0) { const found = findCategoryPath(children, targetId, [...path, cat.name]); if (found) return found; } } return null; };
  const selectedCategoryPath = selectedCategoryId && categoriesData ? findCategoryPath(categoriesData, selectedCategoryId) : form.watch('categoryPath');
  const handleCategorySelect = (categoryId: string) => { setSelectedCategoryId(categoryId); form.setValue('categoryPath', categoryId && categoriesData ? findCategoryPath(categoriesData, categoryId) || '' : ''); form.setValue('categories', categoryId ? [parseInt(categoryId, 10)] : []); setHasChanges(true); setShowCategoryPicker(false); };
  useEffect(() => { if (equipment?.categories?.length > 0) setSelectedCategoryId(String(equipment.categories[0])); }, [equipment]);

  const handleSave = async () => { setError(null); setSaveSuccess(null); const data = form.getValues(); const vends = data.vendors || []; const primaryVendor = vends.find((v: Vendor) => v.preferred) || vends[0] || null; const otherVendors = vends.filter((v: Vendor) => v !== primaryVendor); try { await saveMutation.mutateAsync({ ...data, primaryVendor, otherVendors, pendingImages: pendingImages.length > 0 ? pendingImages : undefined, imagesToDelete: imagesToDelete.length > 0 ? imagesToDelete : undefined }); await refetchEquipment(); setSaveSuccess('Changes saved!'); setTimeout(() => setSaveSuccess(null), 3000); } catch (err: any) { setError(err.message); } };

  const handlePush = async () => { setError(null); setPushing(true); setPushProgress(0); const progressInterval = setInterval(() => setPushProgress(prev => prev >= 90 ? prev : prev + 10), 200); try { if (hasChanges) await handleSave(); setPushProgress(50); await pushMutation.mutateAsync(); setPushProgress(100); setPendingImages([]); setImagesToDelete([]); queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] }); } catch (err: any) { setError(err.message); } finally { clearInterval(progressInterval); setPushing(false); setTimeout(() => setPushProgress(0), 500); } };

  const handlePull = async () => { if (!equipment?.stId || equipment?.isNew) { setError('Cannot pull: Equipment does not exist in ServiceTitan'); return; } setError(null); setPulling(true); setPullProgress(0); const progressInterval = setInterval(() => setPullProgress(prev => prev >= 90 ? prev : prev + 15), 200); try { setPullProgress(30); const res = await fetch(apiUrl(`/api/pricebook/equipment/${equipment.stId}/pull`), { method: 'POST', headers: { 'Content-Type': 'application/json' } }); setPullProgress(70); const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Failed to pull'); setPullProgress(100); queryClient.invalidateQueries({ queryKey: ['equipment', equipmentId] }); if (result.data?.assets) setEquipmentAssets(result.data.assets); setPullSuccess('Pulled latest data'); setHasChanges(false); setTimeout(() => setPullSuccess(null), 5000); } catch (err: any) { setError(err.message); } finally { clearInterval(progressInterval); setPulling(false); setTimeout(() => setPullProgress(0), 500); } };

  const handleFieldChange = (field: keyof Equipment, value: any) => { form.setValue(field, value); setHasChanges(true); };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setImageLoading(true); setImageLoadError(false); try { const reader = new FileReader(); const base64 = await new Promise<string>((resolve, reject) => { reader.onloadend = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file); }); const response = await fetch(apiUrl('/api/pricebook/images/upload-file'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: base64, filename: file.name, entityType: 'equipment', entityId: equipmentId }) }); const result = await response.json(); if (response.ok && result.success) { setPendingImages(prev => [...prev, result.s3Url]); setHasChanges(true); setShowImageModal(false); } else setImageLoadError(true); } catch { setImageLoadError(true); } finally { setImageLoading(false); if (imageInputRef.current) imageInputRef.current.value = ''; } };

  const handleImageFromUrl = async () => { const url = imageUrlInput.trim(); if (!url) return; setImageLoading(true); setImageLoadError(false); try { const response = await fetch(apiUrl('/api/pricebook/images/upload'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, entityType: 'equipment', entityId: equipmentId }) }); const result = await response.json(); if (response.ok && result.success) { setPendingImages(prev => [...prev, result.s3Url]); setHasChanges(true); setShowImageModal(false); setImageUrlInput(''); } else setImageLoadError(true); } catch { setImageLoadError(true); } finally { setImageLoading(false); } };

  const getProxyImageUrl = (url: string) => { if (!url || url.startsWith('data:') || url.startsWith('/') || url.includes('/api/images/proxy')) return url; return apiUrl(`/api/images/proxy?url=${encodeURIComponent(url)}`); };

  const handleAddVendor = () => { if (!selectedVendorId) return; const sv = availableVendors?.find((v: any) => v.id === selectedVendorId); if (!sv) return; const cv = form.getValues('vendors') || []; if (cv.some((v: Vendor) => v.vendorId?.toString() === selectedVendorId)) { setError('Vendor already added'); return; } const vendor: Vendor = { id: `new_${Date.now()}`, vendorId: parseInt(selectedVendorId, 10), vendorName: sv.vendorName, vendorPart, cost: vendorCost, preferred: cv.length === 0, active: true }; form.setValue('vendors', [...cv, vendor]); setSelectedVendorId(''); setVendorCost(0); setVendorPart(''); setShowAddVendorModal(false); setHasChanges(true); };

  const handleDeleteVendor = (vendorId: string) => { form.setValue('vendors', (form.getValues('vendors') || []).filter((v: Vendor) => v.id !== vendorId)); setHasChanges(true); };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs" onClick={onClose}><ChevronLeft className="h-4 w-4 mr-1" />Back to List</Button>
          <span className="font-semibold text-lg mx-4">Equipment</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs"><Plus className="h-3 w-3 mr-1" />NEW</Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs"><Search className="h-3 w-3 mr-1" />SEARCH</Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs"><Copy className="h-3 w-3 mr-1" />DUPLICATE</Button>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs"><RefreshCw className="h-3 w-3 mr-1" />REFRESH</Button>
        </div>
        <div className="flex items-center gap-2">
          {(equipment?.hasPendingChanges || hasChanges || imagesToDelete.length > 0 || pendingImages.length > 0) && <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50">{hasChanges ? 'Unsaved Changes' : 'Pending Changes'}</Badge>}
          {equipment?.isNew && <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/50">Not in ServiceTitan</Badge>}
          <div className="relative"><Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700" onClick={handlePull} disabled={pulling || !equipment?.stId || equipment?.isNew}>{pulling ? <><RefreshCw className="h-3 w-3 animate-spin mr-1" />PULLING...</> : <><Download className="h-3 w-3 mr-1" />PULL</>}</Button>{pulling && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-800 rounded-b overflow-hidden"><div className="h-full bg-purple-300 transition-all" style={{ width: `${pullProgress}%` }} /></div>}</div>
          <div className="relative"><Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs bg-green-600 hover:bg-green-700" onClick={handlePush} disabled={pushing}>{pushing ? <><RefreshCw className="h-3 w-3 animate-spin mr-1" />PUSHING...</> : <><Upload className="h-3 w-3 mr-1" />PUSH</>}</Button>{pushing && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-800 rounded-b overflow-hidden"><div className="h-full bg-green-300 transition-all" style={{ width: `${pushProgress}%` }} /></div>}</div>
          {equipment?.stId && !equipment?.isNew && <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs" onClick={() => window.open(`https://go.servicetitan.com/#/new/pricebook/equipment/${equipment.stId}`, '_blank')}><ExternalLink className="h-3 w-3 mr-1" />VIEW IN ST</Button>}
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 h-7 px-2 text-xs"><Settings className="h-3 w-3" /></Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex w-16 border-r flex-col items-center py-4 gap-2">
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('prev')}><ChevronLeft className="h-4 w-4" /><span className="text-xs">PREV</span></Button>
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('next')}><span className="text-xs">NEXT</span><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

          {/* ROW 1: IDENTITY + IMAGE */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 border rounded-lg p-4">
              <div className="text-xs text-muted-foreground font-medium mb-3">IDENTITY</div>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-3"><div className="text-xs text-muted-foreground font-medium py-2">CODE</div><Controller name="code" control={form.control} render={({ field }) => <Input {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); setHasChanges(true); }} className="font-mono text-sm h-8" placeholder="EQ-001" />} /></div>
                <div className="col-span-12 md:col-span-6"><div className="text-xs text-muted-foreground font-medium py-2">NAME</div><Controller name="name" control={form.control} render={({ field }) => <Input {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); setHasChanges(true); }} className="text-sm h-8" placeholder="HVAC Unit 3-Ton" />} /></div>
                <div className="col-span-12 md:col-span-3"><div className="text-xs text-muted-foreground font-medium py-2">CATEGORY</div><Popover open={showCategoryPicker} onOpenChange={setShowCategoryPicker}><PopoverTrigger asChild><Button variant="outline" className="w-full h-8 text-sm justify-start truncate">{selectedCategoryPath || 'Select...'}</Button></PopoverTrigger><PopoverContent className="w-[400px] p-3" align="start"><CategoryTreeFilter categories={categoriesData || []} selectedCategoryId={selectedCategoryId} onSelect={handleCategorySelect} onClose={() => setShowCategoryPicker(false)} /></PopoverContent></Popover></div>
                <div className="col-span-12 md:col-span-4"><div className="text-xs text-muted-foreground font-medium py-2">MANUFACTURER</div><Controller name="manufacturer" control={form.control} render={({ field }) => <Input {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); setHasChanges(true); }} className="text-sm h-8" placeholder="Carrier" />} /></div>
                <div className="col-span-12 md:col-span-4"><div className="text-xs text-muted-foreground font-medium py-2">MODEL</div><Controller name="model" control={form.control} render={({ field }) => <Input {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); setHasChanges(true); }} className="text-sm h-8" placeholder="24ACC636A003" />} /></div>
                <div className="col-span-12 md:col-span-4 flex items-end justify-end"><label className="flex items-center gap-2 text-xs"><Checkbox checked={form.watch('active')} onCheckedChange={(checked) => { form.setValue('active', !!checked); setHasChanges(true); }} />Active</label></div>
                <div className="col-span-12"><div className="text-xs text-muted-foreground font-medium py-2">DESCRIPTION</div><Controller name="description" control={form.control} render={({ field }) => <Textarea {...field} value={field.value || ''} onChange={(e) => { field.onChange(e); setHasChanges(true); }} className="text-sm min-h-[60px]" placeholder="3-Ton 16 SEER Air Conditioner" />} /></div>
              </div>
            </div>
            <div className="w-full md:w-48 flex-shrink-0 border rounded-lg overflow-hidden">
              <div className="p-2 border-b"><span className="text-xs text-muted-foreground font-medium">PRODUCT IMAGE</span></div>
              <div className="aspect-square flex items-center justify-center relative group bg-muted/30" onMouseEnter={() => setImageHovered(true)} onMouseLeave={() => setImageHovered(false)}>
                {allImageUrls.length > 0 ? (<><img src={allImageUrls[currentImageIndex]} alt="Equipment" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><button type="button" onClick={() => { const url = allImageUrls[currentImageIndex]; const pi = pendingImages.findIndex(u => u === url); if (pi >= 0) { setPendingImages(prev => prev.filter((_, i) => i !== pi)); setHasChanges(true); } else { const stA = equipmentAssets.find(a => a.type === 'Image' && getStImageUrl(a.url) === url); if (stA) { setImagesToDelete(prev => [...prev, stA.url]); setEquipmentAssets(prev => prev.filter(a => a !== stA)); setHasChanges(true); } } if (currentImageIndex >= allImageUrls.length - 1) setCurrentImageIndex(Math.max(0, allImageUrls.length - 2)); }} className={cn("absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white transition-all", imageHovered ? "opacity-100" : "opacity-0")}><X className="h-3 w-3" /></button>{currentImageIndex < pendingImages.length && <div className="absolute top-1 left-1"><Badge className="text-[8px] px-1 py-0 bg-yellow-500 text-black">Pending</Badge></div>}{currentImageIndex >= pendingImages.length && <div className="absolute top-1 left-1"><Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-500/80 text-white border-blue-400">ST</Badge></div>}{allImageUrls.length > 1 && (<><button type="button" onClick={() => setCurrentImageIndex(prev => prev === 0 ? allImageUrls.length - 1 : prev - 1)} className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"><ChevronLeft className="h-4 w-4" /></button><button type="button" onClick={() => setCurrentImageIndex(prev => prev === allImageUrls.length - 1 ? 0 : prev + 1)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"><ChevronRight className="h-4 w-4" /></button><div className="absolute bottom-1 left-1/2 -translate-x-1/2"><Badge className="bg-black/60 text-white text-[10px] px-1.5">{currentImageIndex + 1}/{allImageUrls.length}</Badge></div></>)}</>) : (<div className="text-center text-muted-foreground text-xs p-2"><ImagePlus className="h-6 w-6 mx-auto mb-1 opacity-50" />No image</div>)}
              </div>
              <div className="p-2 border-t"><Button size="sm" className="w-full bg-green-500 hover:bg-green-600 text-white text-xs h-7" onClick={() => setShowImageModal(!showImageModal)}>Edit{allImageUrls.length > 0 ? ` (${allImageUrls.length})` : ''}{pendingImages.length > 0 && <span className="ml-1 text-yellow-200">*</span>}</Button></div>
            </div>
          </div>

          {/* Image Modal */}
          {showImageModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowImageModal(false)}><div className="bg-popover border rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between p-3 border-b"><h4 className="font-medium text-sm">Manage Images</h4><Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setShowImageModal(false); setImageUrlInput(''); }}><X className="h-4 w-4" /></Button></div><div className="p-4 space-y-4">{(equipmentAssets.length > 0 || pendingImages.length > 0) && (<div><Label className="text-xs text-muted-foreground mb-2 block">Current Images</Label><div className="grid grid-cols-2 gap-2">{pendingImages.map((url, i) => (<div key={`p-${i}`} className="relative border-2 border-yellow-400 rounded-lg overflow-hidden aspect-square bg-muted/30"><img src={url} alt={`Pending ${i + 1}`} className="w-full h-full object-cover" /><Badge className="absolute top-1 left-1 text-[10px] px-1 py-0 bg-yellow-500 text-black">Pending</Badge><button type="button" onClick={() => { setPendingImages(prev => prev.filter((_, idx) => idx !== i)); setHasChanges(true); }} className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white"><Trash2 className="h-3 w-3" /></button></div>))}{equipmentAssets.filter(a => a.type === 'Image').map((asset, i) => (<div key={i} className="relative border rounded-lg overflow-hidden aspect-square bg-muted/30"><img src={getStImageUrl(asset.url)} alt={asset.alias || `Image ${i + 1}`} className="w-full h-full object-cover" /><Badge variant="outline" className="absolute top-1 left-1 text-[10px] px-1 py-0 bg-blue-500/20 text-blue-700 border-blue-500/50">ST</Badge></div>))}</div></div>)}<div className="border-t" /><Label className="text-xs text-muted-foreground block">Add New Image</Label><div className="flex gap-1 p-1 bg-muted rounded-lg"><button type="button" onClick={() => setImageUploadTab('file')} className={cn("flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors", imageUploadTab === 'file' ? "bg-background shadow" : "text-muted-foreground hover:text-foreground")}><Upload className="h-3 w-3 inline mr-1" />Upload</button><button type="button" onClick={() => setImageUploadTab('url')} className={cn("flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors", imageUploadTab === 'url' ? "bg-background shadow" : "text-muted-foreground hover:text-foreground")}><Download className="h-3 w-3 inline mr-1" />URL</button></div>{imageUploadTab === 'file' && (<div onClick={() => imageInputRef.current?.click()} className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"><Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" /><p className="text-xs text-muted-foreground">Click to select</p></div>)}{imageUploadTab === 'url' && (<div className="space-y-3"><Input type="url" value={imageUrlInput} onChange={(e) => { setImageUrlInput(e.target.value); setImageLoadError(false); }} placeholder="https://example.com/image.jpg" className={cn("text-sm", imageLoadError && "border-red-500")} />{imageUrlInput.trim() && !imageLoadError && (<div className="border rounded-lg overflow-hidden bg-muted/30 h-24 flex items-center justify-center"><img src={getProxyImageUrl(imageUrlInput.trim())} alt="Preview" className="max-h-full max-w-full object-contain" onError={() => setImageLoadError(true)} /></div>)}<Button onClick={handleImageFromUrl} disabled={!imageUrlInput.trim() || imageLoading} className="w-full" size="sm">{imageLoading ? <><RefreshCw className="h-3 w-3 animate-spin mr-1" />Uploading...</> : 'Add Image'}</Button></div>)}</div></div></div>)}

          {/* ROW 2: PRICING */}
          <div className="border rounded-lg p-4"><div className="text-xs text-muted-foreground font-medium mb-3">PRICING</div><div className="grid grid-cols-6 gap-3"><div><label className="text-xs text-muted-foreground mb-1 block">Cost</label><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><input type="text" inputMode="decimal" value={form.watch('cost')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || ''} onChange={(e) => { form.setValue('cost', parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0); setHasChanges(true); }} className="w-full bg-blue-500/10 border border-blue-500/30 rounded px-2 py-1.5 pl-5 text-sm text-right h-8" /></div></div><div><label className="text-xs text-muted-foreground mb-1 block">Margin</label><div className="relative"><input type="text" inputMode="decimal" value={form.watch('margin') || ''} onChange={(e) => { form.setValue('margin', parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0); setHasChanges(true); }} className="w-full bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1.5 text-sm text-right h-8" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span></div></div><div><label className="text-xs text-muted-foreground mb-1 block">Sell Price</label><div className="w-full bg-green-500/10 border border-green-500/30 rounded px-2 py-1.5 text-sm text-right h-8">{formatCurrency(calculatedPrice)}</div></div><div><label className="text-xs text-muted-foreground mb-1 block">Member Price</label><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><input type="text" inputMode="decimal" value={form.watch('memberPrice')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} onChange={(e) => handleFieldChange('memberPrice', parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)} className="w-full border rounded px-2 py-1.5 pl-5 text-sm text-right h-8" /></div></div><div><label className="text-xs text-muted-foreground mb-1 block">Add-on Price</label><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><input type="text" inputMode="decimal" value={form.watch('addOnPrice')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} onChange={(e) => handleFieldChange('addOnPrice', parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)} className="w-full border rounded px-2 py-1.5 pl-5 text-sm text-right h-8" /></div></div><div><label className="text-xs text-muted-foreground mb-1 block">Add-on Member</label><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><input type="text" inputMode="decimal" value={form.watch('addOnMemberPrice')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} onChange={(e) => handleFieldChange('addOnMemberPrice', parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)} className="w-full border rounded px-2 py-1.5 pl-5 text-sm text-right h-8" /></div></div></div></div>

          {/* ROW 3: SETTINGS */}
          <div className="border rounded-lg p-4"><div className="text-xs text-muted-foreground font-medium mb-3">SETTINGS</div><div className="grid grid-cols-2 gap-x-12 gap-y-2"><label className="flex items-center justify-between cursor-pointer group"><span className="text-sm">Taxable</span><button type="button" onClick={() => { form.setValue('taxable', !form.watch('taxable')); setHasChanges(true); }} className={cn("relative w-9 h-5 rounded-full transition-colors", form.watch('taxable') ? 'bg-primary' : 'bg-muted')}><div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", form.watch('taxable') ? 'translate-x-4' : 'translate-x-0.5')} /></button></label><label className="flex items-center justify-between cursor-pointer group"><span className="text-sm">Chargeable by Default</span><button type="button" onClick={() => { form.setValue('chargeableByDefault', !form.watch('chargeableByDefault')); setHasChanges(true); }} className={cn("relative w-9 h-5 rounded-full transition-colors", form.watch('chargeableByDefault') ? 'bg-primary' : 'bg-muted')}><div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", form.watch('chargeableByDefault') ? 'translate-x-4' : 'translate-x-0.5')} /></button></label></div></div>

          {/* ROW 4: LABOR & COMMISSION */}
          <div className="border rounded-lg p-4"><div className="text-xs text-muted-foreground font-medium mb-3">LABOR & COMMISSION</div><div className="flex items-end gap-6"><div className="w-32"><label className="text-xs text-muted-foreground mb-1 block">Hours</label><div className="relative"><input type="text" inputMode="decimal" value={form.watch('hours') || '0'} onChange={(e) => handleFieldChange('hours', parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)} className="w-full border rounded px-2 py-1.5 text-sm text-right h-8" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">hrs</span></div></div><div className="w-32"><label className="text-xs text-muted-foreground mb-1 block">Bonus</label><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><input type="text" inputMode="decimal" value={form.watch('bonus')?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} onChange={(e) => handleFieldChange('bonus', parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)} className="w-full border rounded px-2 py-1.5 pl-5 text-sm text-right h-8" /></div></div><div className="w-32"><label className="text-xs text-muted-foreground mb-1 block">Commission %</label><div className="relative"><input type="text" inputMode="decimal" value={form.watch('commissionBonus') || '0'} onChange={(e) => handleFieldChange('commissionBonus', parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0)} className="w-full border rounded px-2 py-1.5 text-sm text-right h-8" /><span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span></div></div><div className="flex-1" /><label className="flex items-center gap-2 cursor-pointer group"><span className="text-sm">Pays Commission</span><button type="button" onClick={() => handleFieldChange('paysCommission', !form.watch('paysCommission'))} className={cn("relative w-9 h-5 rounded-full transition-colors", form.watch('paysCommission') ? 'bg-primary' : 'bg-muted')}><div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", form.watch('paysCommission') ? 'translate-x-4' : 'translate-x-0.5')} /></button></label><label className="flex items-center gap-2 cursor-pointer group"><span className="text-sm">Deduct as Job Cost</span><button type="button" onClick={() => handleFieldChange('deductAsJobCost', !form.watch('deductAsJobCost'))} className={cn("relative w-9 h-5 rounded-full transition-colors", form.watch('deductAsJobCost') ? 'bg-primary' : 'bg-muted')}><div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", form.watch('deductAsJobCost') ? 'translate-x-4' : 'translate-x-0.5')} /></button></label></div></div>

          {/* ROW 5: WARRANTY */}
          <div className="border rounded-lg p-4"><div className="text-xs text-muted-foreground font-medium mb-3">WARRANTY</div><div className="grid grid-cols-2 gap-6"><div><label className="text-xs text-muted-foreground mb-1 block">Manufacturer Warranty (months)</label><Input type="number" value={form.watch('manufacturerWarranty')?.duration || ''} onChange={(e) => handleFieldChange('manufacturerWarranty', { ...form.watch('manufacturerWarranty'), duration: parseInt(e.target.value) || 0 })} placeholder="12" className="h-8" /></div><div><label className="text-xs text-muted-foreground mb-1 block">Service Warranty (months)</label><Input type="number" value={form.watch('serviceWarranty')?.duration || ''} onChange={(e) => handleFieldChange('serviceWarranty', { ...form.watch('serviceWarranty'), duration: parseInt(e.target.value) || 0 })} placeholder="12" className="h-8" /></div></div></div>

          {/* Error Display */}
          {error && <div className="p-3 bg-destructive/10 border border-destructive text-destructive rounded-lg text-sm">{error}</div>}

          {/* ROW 6: ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-4"><Button onClick={handleSave} disabled={saveMutation.isPending || !hasChanges} className="bg-blue-600 hover:bg-blue-700 text-white h-10">{saveMutation.isPending ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Save Changes'}</Button><div className="relative"><Button onClick={handlePush} disabled={pushing || pushMutation.isPending} className="w-full bg-green-600 hover:bg-green-700 text-white h-10">{pushing || pushMutation.isPending ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Pushing...</> : <><Upload className="h-4 w-4 mr-2" />Push to ServiceTitan</>}</Button>{pushing && <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-800 rounded-b overflow-hidden"><div className="h-full bg-green-300 transition-all" style={{ width: `${pushProgress}%` }} /></div>}</div></div>

          {/* Status Messages */}
          {saveSuccess && <div className="p-3 bg-blue-500/10 border border-blue-500 rounded-lg text-sm flex items-center gap-2"><Check className="h-4 w-4" />{saveSuccess}</div>}
          {pullSuccess && <div className="p-3 bg-purple-500/10 border border-purple-500 rounded-lg text-sm flex items-center gap-2"><Download className="h-4 w-4" />{pullSuccess}</div>}
          {equipment?.isNew && <div className="p-3 bg-blue-500/10 border border-blue-500 rounded-lg text-sm">This equipment exists only in LAZI CRM. Click "Push to ServiceTitan" to create it in ST.</div>}
          {equipment?.hasPendingChanges && !equipment?.isNew && <div className="p-3 bg-yellow-500/10 border border-yellow-500 rounded-lg text-sm">You have pending changes. Click "Push to ServiceTitan" to sync.</div>}
          {equipment?.pushError && <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg text-sm">Push Error: {equipment.pushError}</div>}

          {/* ROW 7: VENDORS */}
          <div className="border rounded-lg p-4"><div className="flex items-center justify-between mb-3"><div className="text-xs text-muted-foreground font-medium">VENDORS</div><div className="relative"><Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 text-white font-medium h-7 text-xs" onClick={() => setShowAddVendorModal(!showAddVendorModal)}><Plus className="h-3 w-3 mr-1" />Add Vendor</Button>{showAddVendorModal && (<div className="absolute top-full right-0 mt-2 w-80 p-4 bg-popover border rounded-lg shadow-lg z-50"><div className="space-y-3"><h4 className="font-medium text-sm">Add Vendor</h4><div><label className="text-xs text-muted-foreground">Select Vendor *</label><select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)} className="w-full h-8 mt-1 text-sm border rounded px-2"><option value="">Choose a vendor...</option>{availableVendors?.map((v: any) => (<option key={v.id} value={v.id}>{v.vendorName}</option>))}</select></div><div><label className="text-xs text-muted-foreground">Vendor Part #</label><Input value={vendorPart} onChange={(e) => setVendorPart(e.target.value)} placeholder="Part number" className="h-8 mt-1" /></div><div><label className="text-xs text-muted-foreground">Cost</label><div className="relative mt-1"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><Input type="number" step="0.01" value={vendorCost || ''} onChange={(e) => setVendorCost(parseFloat(e.target.value) || 0)} placeholder="0.00" className="h-8 pl-6" /></div></div><div className="flex gap-2 pt-2"><Button size="sm" variant="outline" onClick={() => { setShowAddVendorModal(false); setSelectedVendorId(''); setVendorCost(0); setVendorPart(''); }} className="flex-1">Cancel</Button><Button size="sm" onClick={handleAddVendor} disabled={!selectedVendorId} className="flex-1 bg-green-600 hover:bg-green-700 text-white">Add Vendor</Button></div></div></div>)}</div></div><div className="border rounded-lg overflow-hidden"><div className="grid grid-cols-[1fr_70px_120px_80px_60px_40px] gap-2 py-2 px-3 text-xs text-muted-foreground bg-muted/30 border-b"><div>Vendor</div><div className="text-center">Pref</div><div>Part #</div><div className="text-right">Cost</div><div className="text-center">Active</div><div></div></div><div className="max-h-[200px] overflow-y-auto">{vendors.length > 0 ? (vendors.map((vendor: any, index: number) => (<div key={vendor.id || index} className="grid grid-cols-[1fr_70px_120px_80px_60px_40px] gap-2 py-2 px-3 items-center border-b last:border-b-0 hover:bg-muted/30"><div className="flex items-center gap-2"><span className="text-sm font-medium truncate">{vendor.vendorName}</span></div><div className="flex justify-center"><div className={cn("w-5 h-5 rounded-full flex items-center justify-center", vendor.preferred ? "bg-primary" : "border-2 border-muted-foreground/30")}>{vendor.preferred && <Check className="h-3 w-3 text-primary-foreground" />}</div></div><div><Input defaultValue={vendor.vendorPart || ''} className="h-7 text-xs" placeholder="Part #" /></div><div className="text-right text-sm font-medium">${vendor.cost?.toFixed(2) || '0.00'}</div><div className="flex justify-center"><div className={cn("w-5 h-5 rounded-full flex items-center justify-center", vendor.active ? "bg-primary" : "border-2 border-muted-foreground/30")}>{vendor.active && <Check className="h-3 w-3 text-primary-foreground" />}</div></div><div><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteVendor(vendor.id)}><Trash2 className="h-4 w-4" /></Button></div></div>))) : (<div className="py-4 text-sm text-muted-foreground text-center">No vendors added yet</div>)}</div></div></div>

        </div>
      </div>
    </div>
  );
}
