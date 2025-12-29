'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Plus, 
  ChevronRight, 
  ChevronDown,
  GripVertical,
  MoreVertical,
  ArrowUpDown,
  ImageIcon,
  Eye,
  EyeOff,
  RefreshCw,
  Upload,
  Download,
  Pencil,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { apiUrl, BASE_PATH } from '@/lib/api';
import { PendingChangesBar } from './PendingChangesBar';
import { CategoryImage } from './CategoryImage';
import { VirtualizedCategoryList } from './VirtualizedCategoryList';

// Tenant ID from environment or default
const TENANT_ID = process.env.NEXT_PUBLIC_SERVICE_TITAN_TENANT_ID || '3222348440';

interface Category {
  id: string;
  stId?: string;
  name: string;
  parentId: string | null;
  subcategoryCount: number;
  imageUrl?: string | null;
  businessUnit?: string;
  businessUnitIds?: number[];
  skuInvoices?: string;
  children?: Category[];
  order?: number;
  categoryType?: string;
  active?: boolean;
  visible?: boolean;
  depth?: number;
  sortOrder?: number;
}

type CategoryTab = 'services' | 'materials';
type DropPosition = 'before' | 'after' | 'inside' | null;

export function CategoriesPanel() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CategoryTab>('services');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [draggedCategory, setDraggedCategory] = useState<Category | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [categoryToMove, setCategoryToMove] = useState<Category | null>(null);
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  
  // Image edit modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [categoryForImage, setCategoryForImage] = useState<Category | null>(null);
  const [pendingImageData, setPendingImageData] = useState<string | null>(null);
  const [pendingImageMimeType, setPendingImageMimeType] = useState<string | null>(null);
  const [pendingImageFilename, setPendingImageFilename] = useState<string | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);

  const { data: fetchedCategories, isLoading, refetch } = useQuery({
    queryKey: ['pricebook-categories-tree', activeTab, searchQuery],
    queryFn: () => fetchCategoriesTree(activeTab, searchQuery),
  });

  // Visibility toggle mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ stId, visible }: { stId: string; visible: boolean }) => {
      const res = await fetch(apiUrl(`/api/pricebook/categories/${stId}/visibility`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible }),
      });
      if (!res.ok) throw new Error('Failed to toggle visibility');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook-categories-tree'] });
    },
  });

  // Pull from ST mutation - now actually fetches from ServiceTitan API
  const handlePullFromST = async () => {
    setIsPulling(true);
    setPushStatus({ type: null, message: '' });
    try {
      const res = await fetch(apiUrl('/api/pricebook/categories/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incremental: false }), // Full sync
      });
      const result = await res.json();
      
      if (!res.ok) {
        // Check for rate limiting
        if (res.status === 429 || result.error?.includes('rate') || result.error?.includes('429')) {
          setPushStatus({ type: 'error', message: 'Rate limited by ServiceTitan. Please wait 60 seconds and try again.' });
        } else {
          setPushStatus({ type: 'error', message: result.error || 'Pull failed' });
        }
        console.error('Pull from ST failed:', result);
      } else {
        setPushStatus({ 
          type: 'success', 
          message: `Pulled ${result.fetched || 0} categories from ServiceTitan` 
        });
        await refetch();
      }
    } catch (error) {
      console.error('Pull from ST failed:', error);
      setPushStatus({ type: 'error', message: 'Network error - could not reach server' });
    } finally {
      setIsPulling(false);
      // Auto-hide status after 5 seconds
      setTimeout(() => setPushStatus({ type: null, message: '' }), 5000);
    }
  };

  // Push to ST mutation - pushes pending changes from crm.pricebook_overrides
  const handlePushToST = async () => {
    setIsPushing(true);
    setPushStatus({ type: null, message: '' });
    try {
      const res = await fetch(apiUrl('/api/pricebook/categories/push'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (!res.ok) {
        // Check for rate limiting
        if (res.status === 429 || result.error?.includes('rate') || result.error?.includes('429')) {
          setPushStatus({ type: 'error', message: 'Rate limited by ServiceTitan. Please wait 60 seconds and try again.' });
        } else {
          setPushStatus({ type: 'error', message: result.error || 'Push failed' });
        }
        console.error('Push to ST failed:', result);
      } else if (result.updated === 0 && result.failed === 0) {
        setPushStatus({ type: 'success', message: 'No pending changes to push' });
      } else if (result.failed > 0) {
        // Show detailed errors in console
        console.error('Push errors:', result.errors);
        setPushStatus({ 
          type: 'error', 
          message: `${result.updated} pushed, ${result.failed} failed. Check console for details.` 
        });
      } else {
        setPushStatus({ type: 'success', message: `Successfully pushed ${result.updated} changes to ServiceTitan` });
        // Refresh categories after successful push
        await refetch();
      }
    } catch (error) {
      setPushStatus({ type: 'error', message: 'Network error - could not reach server' });
    } finally {
      setIsPushing(false);
      // Auto-hide status after 5 seconds
      setTimeout(() => setPushStatus({ type: null, message: '' }), 5000);
    }
  };

  const handleToggleVisibility = (category: Category) => {
    const stId = category.stId || category.id;
    toggleVisibilityMutation.mutate({ stId, visible: !category.visible });
  };

  // Open edit modal
  const handleEditCategory = (category: Category) => {
    setCategoryToEdit(category);
    setEditName(category.name);
    setEditModalOpen(true);
  };

  // Save category name override
  const handleSaveEdit = async () => {
    if (!categoryToEdit || !editName.trim()) return;
    
    setIsSaving(true);
    try {
      const stId = categoryToEdit.stId || categoryToEdit.id;
      const res = await fetch(apiUrl(`/api/pricebook/categories/${stId}/override`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      
      if (res.ok) {
        // Update local state immediately
        setLocalCategories(prev => {
          const updateCategory = (cats: Category[]): Category[] => {
            return cats.map(cat => {
              if (cat.id === categoryToEdit.id || cat.stId === categoryToEdit.stId) {
                return { ...cat, name: editName.trim() };
              }
              if (cat.children) {
                return { ...cat, children: updateCategory(cat.children) };
              }
              return cat;
            });
          };
          return updateCategory(prev);
        });
        setEditModalOpen(false);
        setCategoryToEdit(null);
      } else {
        console.error('Failed to save category name');
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Open image edit modal
  const handleEditImage = (category: Category) => {
    setCategoryForImage(category);
    setPendingImageData(null);
    setPendingImageMimeType(null);
    setPendingImageFilename(null);
    setImageModalOpen(true);
  };

  // Handle file selection for image change
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setPendingImageData(base64);
      setPendingImageMimeType(file.type);
      setPendingImageFilename(file.name);
    };
    reader.readAsDataURL(file);
  };

  // Save image override
  const handleSaveImage = async () => {
    if (!categoryForImage) return;
    
    setIsSavingImage(true);
    try {
      const stId = categoryForImage.stId || categoryForImage.id;
      const res = await fetch(apiUrl(`/api/pricebook/categories/${stId}/image`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: pendingImageData,
          mimeType: pendingImageMimeType,
          filename: pendingImageFilename,
        }),
      });
      
      if (res.ok) {
        // Update local state with preview URL
        setLocalCategories(prev => {
          const updateCategory = (cats: Category[]): Category[] => {
            return cats.map(cat => {
              if (cat.id === categoryForImage.id || cat.stId === categoryForImage.stId) {
                return { ...cat, imageUrl: `${BASE_PATH}/api/pricebook/categories/${stId}/image?t=${Date.now()}` };
              }
              if (cat.children) {
                return { ...cat, children: updateCategory(cat.children) };
              }
              return cat;
            });
          };
          return updateCategory(prev);
        });
        setImageModalOpen(false);
        setCategoryForImage(null);
      } else {
        console.error('Failed to save image');
      }
    } catch (error) {
      console.error('Image save failed:', error);
    } finally {
      setIsSavingImage(false);
    }
  };

  // Delete image
  const handleDeleteImage = async () => {
    if (!categoryForImage) return;
    
    setIsSavingImage(true);
    try {
      const stId = categoryForImage.stId || categoryForImage.id;
      const res = await fetch(apiUrl(`/api/pricebook/categories/${stId}/image`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteImage: true }),
      });
      
      if (res.ok) {
        // Update local state to remove image
        setLocalCategories(prev => {
          const updateCategory = (cats: Category[]): Category[] => {
            return cats.map(cat => {
              if (cat.id === categoryForImage.id || cat.stId === categoryForImage.stId) {
                return { ...cat, imageUrl: null };
              }
              if (cat.children) {
                return { ...cat, children: updateCategory(cat.children) };
              }
              return cat;
            });
          };
          return updateCategory(prev);
        });
        setImageModalOpen(false);
        setCategoryForImage(null);
      } else {
        console.error('Failed to delete image');
      }
    } catch (error) {
      console.error('Image delete failed:', error);
    } finally {
      setIsSavingImage(false);
    }
  };

  // Sync fetched categories to local state
  useEffect(() => {
    if (fetchedCategories) {
      setLocalCategories(JSON.parse(JSON.stringify(fetchedCategories)));
    }
  }, [fetchedCategories]);

  const toggleExpanded = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const handleDragStart = (e: React.DragEvent, category: Category) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', category.id);
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string, element: HTMLElement) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedCategory || draggedCategory.id === categoryId) return;
    
    // Calculate drop position based on mouse Y position within the element
    const rect = element.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    let position: DropPosition;
    if (y < height * 0.25) {
      position = 'before';
    } else if (y > height * 0.75) {
      position = 'after';
    } else {
      position = 'inside';
    }
    
    setDragOverCategory(categoryId);
    setDropPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
    setDropPosition(null);
  };

  // Deep clone helper
  const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

  // Remove category from tree
  const removeCategoryFromTree = (categories: Category[], categoryId: string): Category[] => {
    return categories.filter(cat => {
      if (cat.id === categoryId) return false;
      if (cat.children) {
        cat.children = removeCategoryFromTree(cat.children, categoryId);
      }
      return true;
    });
  };

  // Find parent array and index
  const findCategoryLocation = (categories: Category[], categoryId: string, parent: Category[] | null = null): { parent: Category[] | null; index: number } | null => {
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].id === categoryId) {
        return { parent: categories, index: i };
      }
      if (categories[i].children) {
        const result = findCategoryLocation(categories[i].children!, categoryId, categories[i].children);
        if (result) return result;
      }
    }
    return null;
  };

  // Find category by id
  const findCategory = (categories: Category[], categoryId: string): Category | null => {
    for (const cat of categories) {
      if (cat.id === categoryId) return cat;
      if (cat.children) {
        const found = findCategory(cat.children, categoryId);
        if (found) return found;
      }
    }
    return null;
  };

  const handleDrop = (e: React.DragEvent, targetCategory: Category) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedCategory || draggedCategory.id === targetCategory.id) {
      resetDragState();
      return;
    }

    // Check if we're not dropping a parent onto its own child
    const isDescendant = checkIsDescendant(draggedCategory, targetCategory.id);
    if (isDescendant) {
      resetDragState();
      return;
    }

    // Clone the categories for manipulation
    let newCategories = deepClone(localCategories);
    
    // Get the dragged category with its children
    const draggedCat = deepClone(findCategory(newCategories, draggedCategory.id)!);
    
    // Remove from original position
    newCategories = removeCategoryFromTree(newCategories, draggedCategory.id);
    
    // Find target location
    const targetLocation = findCategoryLocation(newCategories, targetCategory.id);
    
    if (!targetLocation) {
      resetDragState();
      return;
    }

    // Insert based on drop position
    if (dropPosition === 'inside') {
      // Add as child of target
      const target = findCategory(newCategories, targetCategory.id);
      if (target) {
        draggedCat.parentId = target.id;
        if (!target.children) target.children = [];
        target.children.push(draggedCat);
        target.subcategoryCount = target.children.length;
      }
    } else if (dropPosition === 'before') {
      // Insert before target
      draggedCat.parentId = targetCategory.parentId;
      targetLocation.parent!.splice(targetLocation.index, 0, draggedCat);
    } else if (dropPosition === 'after') {
      // Insert after target
      draggedCat.parentId = targetCategory.parentId;
      targetLocation.parent!.splice(targetLocation.index + 1, 0, draggedCat);
    }

    // Update local state immediately
    setLocalCategories(newCategories);
    
    // Persist to API (fire and forget for now, could add error handling)
    // Include depth info so the API knows if this is a category or subcategory
    fetch(apiUrl(`/api/pricebook/categories/${draggedCategory.id}/move`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        newParentId: draggedCat.parentId,
        position: dropPosition,
        targetId: targetCategory.id,
        targetSortOrder: targetCategory.sortOrder || 0,
        isSubcategory: (draggedCategory.depth || 0) > 0,
        targetIsSubcategory: (targetCategory.depth || 0) > 0,
      }),
    });

    resetDragState();
  };

  const resetDragState = () => {
    setDraggedCategory(null);
    setDragOverCategory(null);
    setDropPosition(null);
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  // Check if targetId is a descendant of category
  const checkIsDescendant = (category: Category, targetId: string): boolean => {
    if (!category.children) return false;
    for (const child of category.children) {
      if (child.id === targetId) return true;
      if (checkIsDescendant(child, targetId)) return true;
    }
    return false;
  };

  const handleMoveToTop = (category: Category) => {
    const newCategories = deepClone(localCategories);
    const location = findCategoryLocation(newCategories, category.id);
    if (location && location.parent) {
      const [cat] = location.parent.splice(location.index, 1);
      location.parent.unshift(cat);
      setLocalCategories(newCategories);
    }
  };

  const handleMoveToBottom = (category: Category) => {
    const newCategories = deepClone(localCategories);
    const location = findCategoryLocation(newCategories, category.id);
    if (location && location.parent) {
      const [cat] = location.parent.splice(location.index, 1);
      location.parent.push(cat);
      setLocalCategories(newCategories);
    }
  };

  const openMoveModal = (category: Category) => {
    setCategoryToMove(category);
    setMoveModalOpen(true);
  };

  const handleMoveToCategory = (targetParentId: string | null) => {
    if (!categoryToMove) return;
    
    let newCategories = deepClone(localCategories);
    const draggedCat = deepClone(findCategory(newCategories, categoryToMove.id)!);
    
    // Remove from original position
    newCategories = removeCategoryFromTree(newCategories, categoryToMove.id);
    
    // Add to new parent
    draggedCat.parentId = targetParentId;
    
    if (targetParentId === null) {
      // Add to root
      newCategories.push(draggedCat);
    } else {
      const target = findCategory(newCategories, targetParentId);
      if (target) {
        if (!target.children) target.children = [];
        target.children.push(draggedCat);
        target.subcategoryCount = target.children.length;
      }
    }
    
    setLocalCategories(newCategories);
    setMoveModalOpen(false);
    setCategoryToMove(null);
  };

  const flatCategories = localCategories ? flattenCategories(localCategories) : [];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Tabs */}
      <div className="px-4 pt-4 border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('services')}
            className={cn(
              "pb-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'services'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Services & Equipment
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={cn(
              "pb-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'materials'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Materials & Other Stock Codes
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 border-b flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <Button variant="outline" size="sm" className="h-9">
          <Filter className="h-4 w-4 mr-1" />
          Filters
        </Button>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9"
            onClick={handlePullFromST}
            disabled={isPulling || isPushing}
          >
            {isPulling ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            {isPulling ? 'Pulling...' : 'Pull From ST'}
          </Button>
          {isPulling && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span>Syncing from ServiceTitan...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9"
            onClick={handlePushToST}
            disabled={isPulling || isPushing}
          >
            {isPushing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            {isPushing ? 'Pushing...' : 'Push To ST'}
          </Button>
          {isPushing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-green-500" />
              <span>Pushing to ServiceTitan...</span>
            </div>
          )}
        </div>
      </div>

      {/* Pending Changes Bar */}
      <PendingChangesBar 
        tenantId={TENANT_ID}
        onPush={handlePushToST}
        isPushing={isPushing}
      />

      {/* Push Status Message */}
      {pushStatus.type && (
        <div className={cn(
          "px-4 py-2 text-sm flex items-center gap-2",
          pushStatus.type === 'success' ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            pushStatus.type === 'success' ? "bg-green-500" : "bg-red-500"
          )} />
          {pushStatus.message}
        </div>
      )}

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase">
        <div className="col-span-6">Category</div>
        <div className="col-span-2 text-center">Business Unit</div>
        <div className="col-span-2 text-center">SKU Invoices</div>
        <div className="col-span-2"></div>
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading categories...</div>
        ) : !localCategories?.length ? (
          <div className="p-8 text-center text-muted-foreground">No categories found</div>
        ) : (
          <VirtualizedCategoryList
            categories={localCategories}
            expandedCategories={expandedCategories}
            toggleExpanded={toggleExpanded}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            onToggleVisibility={handleToggleVisibility}
            onEditCategory={handleEditCategory}
            onEditImage={handleEditImage}
            onMoveToTop={handleMoveToTop}
            onMoveToBottom={handleMoveToBottom}
            onChooseCategory={openMoveModal}
            dragOverCategory={dragOverCategory}
            draggedCategory={draggedCategory}
            dropPosition={dropPosition}
          />
        )}
      </div>

      {/* Move to Category Modal */}
      <Dialog open={moveModalOpen} onOpenChange={setMoveModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Search categories..." className="mb-4" />
            <div className="max-h-64 overflow-auto space-y-1">
              {flatCategories
                .filter(c => c.id !== categoryToMove?.id)
                .map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleMoveToCategory(cat.id)}
                    className="w-full text-left px-3 py-2 hover:bg-muted rounded-md flex items-center justify-between"
                  >
                    <span className="text-sm">{cat.name}</span>
                    {cat.children && cat.children.length > 0 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => handleMoveToCategory(null)}
            >
              Move
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter category name..."
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSaving || !editName.trim()}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Edit Modal */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Photo for {categoryForImage?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current/Preview Image */}
            <div className="flex justify-center">
              <div className="w-48 h-48 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {pendingImageData ? (
                  <img 
                    src={`data:${pendingImageMimeType};base64,${pendingImageData}`}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : categoryForImage?.imageUrl ? (
                  <img 
                    src={categoryForImage.imageUrl}
                    alt={categoryForImage.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => document.getElementById('image-upload-input')?.click()}
              >
                Change
              </Button>
              <input
                id="image-upload-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileSelect}
              />
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDeleteImage}
                disabled={isSavingImage || (!categoryForImage?.imageUrl && !pendingImageData)}
              >
                Delete
              </Button>
              <div className="flex-1" />
              <Button
                onClick={handleSaveImage}
                disabled={isSavingImage || !pendingImageData}
              >
                {isSavingImage ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CategoryTreeRowProps {
  category: Category;
  depth: number;
  expandedCategories: Set<string>;
  toggleExpanded: (id: string) => void;
  onDragStart: (e: React.DragEvent, category: Category) => void;
  onDragOver: (e: React.DragEvent, categoryId: string, element: HTMLElement) => void;
  onDragLeave: () => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, category: Category) => void;
  onMoveToTop: (category: Category) => void;
  onMoveToBottom: (category: Category) => void;
  onChooseCategory: (category: Category) => void;
  onToggleVisibility: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onEditImage: (category: Category) => void;
  dragOverCategory: string | null;
  draggedCategory: Category | null;
  dropPosition: DropPosition;
}

function CategoryTreeRow({
  category,
  depth,
  expandedCategories,
  toggleExpanded,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  onMoveToTop,
  onMoveToBottom,
  onChooseCategory,
  onToggleVisibility,
  onEditCategory,
  onEditImage,
  dragOverCategory,
  draggedCategory,
  dropPosition,
}: CategoryTreeRowProps) {
  const isExpanded = expandedCategories.has(category.id);
  const hasChildren = category.children && category.children.length > 0;
  const subcategoryCount = category.subcategoryCount || (category.children?.length || 0);
  const isDropTarget = dragOverCategory === category.id;

  return (
    <>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, category)}
        onDragOver={(e) => onDragOver(e, category.id, e.currentTarget as HTMLElement)}
        onDragLeave={onDragLeave}
        onDragEnd={onDragEnd}
        onDrop={(e) => onDrop(e, category)}
        className={cn(
          "grid grid-cols-12 gap-4 px-4 py-3 border-b hover:bg-muted/30 transition-colors cursor-grab active:cursor-grabbing relative group",
          depth > 0 && "bg-muted/10",
          isDropTarget && dropPosition === 'inside' && "bg-blue-100 border-blue-400 border-2",
          draggedCategory?.id === category.id && "opacity-50"
        )}
        style={{ paddingLeft: `${depth * 24 + 16}px` }}
      >
        {/* Drop indicator lines */}
        {isDropTarget && dropPosition === 'before' && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
        )}
        {isDropTarget && dropPosition === 'after' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
        )}
        {/* Category Name */}
        <div className="col-span-6 flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab" />
          
          {hasChildren ? (
            <button
              onClick={() => toggleExpanded(category.id)}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          <span className="font-medium text-sm">{category.name}</span>
          <Pencil 
            className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-foreground" 
            onClick={(e) => {
              e.stopPropagation();
              onEditCategory(category);
            }}
          />
          
          {subcategoryCount > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {subcategoryCount} sc
            </span>
          )}
        </div>

        {/* Business Unit */}
        <div className="col-span-2 flex items-center justify-center text-sm text-muted-foreground">
          {category.businessUnit || '—'}
        </div>

        {/* SKU Invoices */}
        <div className="col-span-2 flex items-center justify-center text-sm text-muted-foreground">
          {category.skuInvoices || '—'}
        </div>

        {/* Actions */}
        <div className="col-span-2 flex items-center justify-end gap-2">
          {/* Category Image with edit overlay */}
          <div 
            className="relative cursor-pointer group/image"
            onClick={(e) => {
              e.stopPropagation();
              onEditImage(category);
            }}
          >
            <CategoryImage src={category.imageUrl} alt={category.name} size={40} />
            {/* Pencil overlay on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center rounded">
              <Pencil className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Visibility toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => onToggleVisibility(category)}
            title={category.visible !== false ? 'Hide from CRM' : 'Show in CRM'}
          >
            {category.visible !== false ? (
              <Eye className="h-4 w-4 text-green-600" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          {/* Reorder button */}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowUpDown className="h-4 w-4" />
          </Button>

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onMoveToTop(category)}>
                Top
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMoveToBottom(category)}>
                Bottom
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChooseCategory(category)}>
                Choose Category
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {category.children!.map((child) => (
            <CategoryTreeRow
              key={child.id}
              category={child}
              depth={depth + 1}
              expandedCategories={expandedCategories}
              toggleExpanded={toggleExpanded}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
              onMoveToTop={onMoveToTop}
              onMoveToBottom={onMoveToBottom}
              onChooseCategory={onChooseCategory}
              onToggleVisibility={onToggleVisibility}
              onEditCategory={onEditCategory}
              onEditImage={onEditImage}
              dragOverCategory={dragOverCategory}
              draggedCategory={draggedCategory}
              dropPosition={dropPosition}
            />
          ))}
        </div>
      )}
    </>
  );
}

function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];
  function traverse(cats: Category[]) {
    for (const cat of cats) {
      result.push(cat);
      if (cat.children) {
        traverse(cat.children);
      }
    }
  }
  traverse(categories);
  return result;
}

async function fetchCategoriesTree(tab: CategoryTab, search: string): Promise<Category[]> {
  const type = tab === 'services' ? 'Services' : 'Materials';
  const params = new URLSearchParams();
  params.set('type', type);
  
  const res = await fetch(apiUrl(`/api/pricebook/categories?${params.toString()}`));
  if (!res.ok) return [];
  const response = await res.json();
  
  // Extract data array from response object
  const data = Array.isArray(response) ? response : (response.data || []);
  
  // Backend already returns data sorted by sort_order, no need to re-sort
  if (search) {
    return filterCategoriesTree(data, search.toLowerCase());
  }
  
  return data;
}

function filterCategoriesTree(categories: Category[], search: string): Category[] {
  return categories.filter(cat => {
    const matches = cat.name.toLowerCase().includes(search);
    if (cat.children) {
      cat.children = filterCategoriesTree(cat.children, search);
      return matches || cat.children.length > 0;
    }
    return matches;
  });
}
