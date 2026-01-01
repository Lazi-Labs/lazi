import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const KITS_KEY = ['pricebook', 'kits'];

interface Kit {
  id: string;
  name: string;
  description?: string;
  categoryPath: string[];
  itemCount: number;
  groupCount: number;
  items?: KitItem[];
  groups?: KitGroup[];
  includedKitIds?: string[];
}

interface KitItem {
  id: string;
  materialId: string;
  quantity: number;
  groupId?: string | null;
  material?: {
    id?: string;
    stId?: string;
    code: string;
    name: string;
    cost: number;
    unit?: string;
  };
}

interface KitGroup {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
}

interface CreateKitInput {
  name: string;
  description?: string;
  categoryPath?: string[];
  materials: Array<{
    materialId: string;
    quantity: number;
    groupId?: string | null;
  }>;
  groups?: Array<{
    id: string;
    name: string;
    color: string;
    collapsed?: boolean;
  }>;
  includedKitIds?: string[];
}

interface UpdateKitInput extends CreateKitInput {}

export function useKits(params?: { search?: string; categoryPath?: string }) {
  return useQuery({
    queryKey: [...KITS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.categoryPath) searchParams.set('categoryPath', params.categoryPath);
      
      const res = await fetch(`/api/pricebook/kits?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch kits');
      return res.json() as Promise<{ data: Kit[]; total: number }>;
    },
  });
}

export function useKit(id: string) {
  return useQuery({
    queryKey: [...KITS_KEY, id],
    queryFn: async () => {
      const res = await fetch(`/api/pricebook/kits/${id}`);
      if (!res.ok) throw new Error('Failed to fetch kit');
      return res.json() as Promise<Kit>;
    },
    enabled: !!id,
  });
}

export function useCreateKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateKitInput) => {
      const res = await fetch('/api/pricebook/kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create kit');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KITS_KEY }),
  });
}

export function useUpdateKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateKitInput }) => {
      const res = await fetch(`/api/pricebook/kits/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update kit');
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: KITS_KEY });
      queryClient.invalidateQueries({ queryKey: [...KITS_KEY, id] });
    },
  });
}

export function useDeleteKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pricebook/kits/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete kit');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KITS_KEY }),
  });
}

export function useDuplicateKit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pricebook/kits/${id}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to duplicate kit');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KITS_KEY }),
  });
}

export function useApplyKit() {
  return useMutation({
    mutationFn: async ({ id, multiplier = 1 }: { id: string; multiplier?: number }) => {
      const res = await fetch(`/api/pricebook/kits/${id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplier }),
      });
      if (!res.ok) throw new Error('Failed to apply kit');
      return res.json() as Promise<{
        materials: Array<{
          materialId: string;
          stMaterialId?: number;
          code: string;
          name: string;
          quantity: number;
          cost: number;
          price: number;
          unit?: string;
        }>;
      }>;
    },
  });
}
