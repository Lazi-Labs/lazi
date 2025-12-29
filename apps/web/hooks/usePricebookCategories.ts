import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface BusinessUnit {
  st_id: number;
  name: string;
}

export interface Category {
  st_id: number;
  name: string;
  display_name: string | null;
  description: string | null;
  active: boolean;
  sort_order: number;
  parent_st_id: number | null;
  depth: number;
  category_type: 'Services' | 'Materials';
  image_url: string | null;
  business_unit_ids: number[];
  business_units: BusinessUnit[];
  is_visible_crm: boolean;
  has_pending_changes: boolean;
  last_synced_at: string;
  updated_at: string;
  subcategories: Category[];
}

export interface PendingOverride {
  id: string;
  st_pricebook_id: string;
  item_type: 'category' | 'subcategory';
  override_name: string | null;
  override_display_name: string | null;
  override_description: string | null;
  override_position: number | null;
  override_parent_id: number | null;
  override_active: boolean | null;
  override_business_unit_ids: number[] | null;
  override_image_url: string | null;
  pending_sync: boolean;
  sync_error: string | null;
  original_name: string;
  category_type: string;
  type: 'category' | 'subcategory';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.lazilabs.com';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';

async function fetchCategories(type?: 'Services' | 'Materials', includeInactive = false): Promise<Category[]> {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (includeInactive) params.append('includeInactive', 'true');

  const response = await fetch(`${API_URL}/api/pricebook/categories/tree?${params}`, {
    headers: {
      'x-tenant-id': TENANT_ID,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }
  
  const data = await response.json();
  return data.data;
}

async function fetchPendingOverrides(): Promise<PendingOverride[]> {
  const response = await fetch(`${API_URL}/api/pricebook/categories/pending`, {
    headers: {
      'x-tenant-id': TENANT_ID,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch pending overrides');
  }
  
  const data = await response.json();
  return data.data;
}

export function usePricebookCategories(type?: 'Services' | 'Materials', includeInactive = false) {
  return useQuery({
    queryKey: ['pricebook', 'categories', 'tree', type, includeInactive],
    queryFn: () => fetchCategories(type, includeInactive),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePendingOverrides() {
  return useQuery({
    queryKey: ['pricebook', 'categories', 'pending'],
    queryFn: fetchPendingOverrides,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useCategoryOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      stId, 
      changes 
    }: { 
      stId: number; 
      changes: {
        name?: string;
        displayName?: string;
        description?: string;
        position?: number;
        parentId?: number;
        active?: boolean;
        businessUnitIds?: number[];
        imageUrl?: string;
      };
    }) => {
      const response = await fetch(`${API_URL}/api/pricebook/categories/${stId}/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID,
        },
        body: JSON.stringify(changes),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save override');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook', 'categories'] });
    },
  });
}

export function useDiscardOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stId: number) => {
      const response = await fetch(`${API_URL}/api/pricebook/categories/${stId}/override`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to discard override');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook', 'categories'] });
    },
  });
}

export function usePushToServiceTitan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_URL}/api/pricebook/categories/push`, {
        method: 'POST',
        headers: {
          'x-tenant-id': TENANT_ID,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to push to ServiceTitan');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricebook', 'categories'] });
    },
  });
}
