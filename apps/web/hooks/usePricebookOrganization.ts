import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { apiUrl } from '@/lib/api';

const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';

const ORGANIZATION_KEY = ['pricebook', 'organization'];

// Types
export interface HealthData {
  overallScore: number;
  scores: { materials: number; services: number };
  stats: {
    materials: EntityStats;
    services: EntityStats;
  };
  grade: string;
  totalIssues: number;
}

export interface EntityStats {
  total: number;
  active: number;
  reviewed: number;
  uncategorized: number;
  no_image: number;
  zero_price: number;
  no_description: number;
}

export interface CategoryCompleteness {
  category_id: number;
  category_name: string;
  entity_type: string;
  total: number;
  with_image: number;
  with_description: number;
  with_price: number;
  reviewed: number;
  completeness_score: number;
}

export interface NeedsAttentionItem {
  entity_type: 'material' | 'service';
  st_id: number;
  code: string;
  name: string;
  issues: string[];
  priority_score: number;
  health_score: number;
  category_name?: string;
}

export interface DuplicateGroup {
  id: string;
  entity_type: 'material' | 'service';
  items: DuplicateItem[];
  similarity_score: number;
  match_type: string;
}

export interface DuplicateItem {
  st_id: number;
  code: string;
  name: string;
  price: number;
  active: boolean;
}

export interface Anomaly {
  entity_type: 'material' | 'service';
  st_id: number;
  code: string;
  name: string;
  anomaly_type: string;
  details: Record<string, any>;
}

export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, any>;
  user_id: string;
  created_at: string;
}

export interface UserProgress {
  user_id: string;
  items_reviewed: number;
  items_edited: number;
  duplicates_resolved: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  earned_at: string;
}

export interface SavedView {
  id: string;
  name: string;
  entity_type: string;
  filters: Record<string, any>;
  created_at: string;
}

export interface PendingSyncItem {
  entity_type: 'material' | 'service';
  st_id: number;
  code: string;
  name: string;
  sync_status: 'pending' | 'error';
  sync_error: string | null;
  pending_since: string;
  pending_changes: Record<string, any>;
}

export interface PendingSyncCounts {
  service: { pending: number; errors: number; oldest: string | null };
  material: { pending: number; errors: number; oldest: string | null };
  totalPending: number;
  totalErrors: number;
}

// Helper function for API calls
async function fetchOrganizationApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(apiUrl(`/api/pricebook/organization${endpoint}`), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT_ID,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  const data = await response.json();
  return data.data ?? data;
}

// ==================== Query Hooks ====================

export function usePricebookHealth() {
  return useQuery({
    queryKey: [...ORGANIZATION_KEY, 'health'],
    queryFn: () => fetchOrganizationApi<HealthData>('/health'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCategoryCompleteness(entityType?: 'material' | 'service') {
  return useQuery({
    queryKey: [...ORGANIZATION_KEY, 'health', 'categories', entityType],
    queryFn: () => {
      const params = entityType ? `?entityType=${entityType}` : '';
      return fetchOrganizationApi<CategoryCompleteness[]>(`/health/categories${params}`);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useNeedsAttention(params?: {
  entityType?: 'material' | 'service';
  issueType?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: [...ORGANIZATION_KEY, 'needs-attention', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.entityType) searchParams.set('entityType', params.entityType);
      if (params?.issueType) searchParams.set('issueType', params.issueType);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      const query = searchParams.toString();
      return fetchOrganizationApi<{ items: NeedsAttentionItem[]; total: number }>(
        `/needs-attention${query ? `?${query}` : ''}`
      );
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useDuplicates(entityType?: 'material' | 'service', threshold?: number) {
  return useQuery({
    queryKey: [...ORGANIZATION_KEY, 'duplicates', entityType, threshold],
    queryFn: () => {
      const params = new URLSearchParams();
      if (entityType) params.set('entityType', entityType);
      if (threshold) params.set('threshold', threshold.toString());
      const query = params.toString();
      return fetchOrganizationApi<DuplicateGroup[]>(`/duplicates${query ? `?${query}` : ''}`);
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useAnomalies() {
  return useQuery({
    queryKey: [...ORGANIZATION_KEY, 'anomalies'],
    queryFn: () => fetchOrganizationApi<Anomaly[]>('/anomalies'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAuditLog(params?: {
  userId?: string;
  entityType?: string;
  days?: number;
}) {
  return useQuery({
    queryKey: [...ORGANIZATION_KEY, 'audit-log', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.userId) searchParams.set('userId', params.userId);
      if (params?.entityType) searchParams.set('entityType', params.entityType);
      if (params?.days) searchParams.set('days', params.days.toString());
      const query = searchParams.toString();
      return fetchOrganizationApi<AuditLogEntry[]>(`/audit-log${query ? `?${query}` : ''}`);
    },
    staleTime: 60 * 1000,
  });
}

export function useProgress(userId?: string) {
  return useQuery({
    queryKey: [...ORGANIZATION_KEY, 'progress', userId],
    queryFn: () => {
      const query = userId ? `?userId=${userId}` : '';
      return fetchOrganizationApi<UserProgress>(`/progress${query}`);
    },
    staleTime: 60 * 1000,
    enabled: !!userId,
  });
}

export function useSavedViews(userId?: string, entityType?: string) {
  return useQuery({
    queryKey: [...ORGANIZATION_KEY, 'saved-views', userId, entityType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (userId) params.set('userId', userId);
      if (entityType) params.set('entityType', entityType);
      const query = params.toString();
      return fetchOrganizationApi<SavedView[]>(`/saved-views${query ? `?${query}` : ''}`);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePendingSyncCounts() {
  return useQuery({
    queryKey: [...ORGANIZATION_KEY, 'pending-sync', 'counts'],
    queryFn: () => fetchOrganizationApi<PendingSyncCounts>('/pending-sync/counts'),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
  });
}

export function usePendingSync(params?: {
  entityType?: 'material' | 'service' | 'all';
  status?: 'pending' | 'error' | 'all';
  limit?: number;
}) {
  return useQuery({
    queryKey: [...ORGANIZATION_KEY, 'pending-sync', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.entityType && params.entityType !== 'all') {
        searchParams.set('entityType', params.entityType);
      }
      if (params?.status && params.status !== 'all') {
        searchParams.set('status', params.status);
      }
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      const query = searchParams.toString();
      return fetchOrganizationApi<{
        data: PendingSyncItem[];
        counts: PendingSyncCounts;
        total: number;
      }>(`/pending-sync${query ? `?${query}` : ''}`);
    },
    staleTime: 30 * 1000,
  });
}

// ==================== Mutation Hooks ====================

export function useBulkUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entityType: 'material' | 'service';
      ids: number[];
      updates: Record<string, any>;
      userId?: string;
    }) => {
      return fetchOrganizationApi<{ updated: number }>('/bulk-update', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_KEY });
      queryClient.invalidateQueries({ queryKey: ['pricebook'] });
    },
  });
}

export function useBulkReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entityType: 'material' | 'service';
      stIds: number[];
      isReviewed: boolean;
      userId?: string;
    }) => {
      return fetchOrganizationApi<{ updated: number }>('/bulk-review', {
        method: 'POST',
        body: JSON.stringify({
          entityType: params.entityType,
          ids: params.stIds,
          reviewed: params.isReviewed,
          userId: params.userId,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_KEY });
      queryClient.invalidateQueries({ queryKey: ['pricebook'] });
    },
  });
}

export function useCreateSavedView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      entityType: string;
      filters: Record<string, any>;
      userId: string;
    }) => {
      return fetchOrganizationApi<SavedView>('/saved-views', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORGANIZATION_KEY, 'saved-views'] });
    },
  });
}

export function useDeleteSavedView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (viewId: string) => {
      return fetchOrganizationApi<{ success: boolean }>(`/saved-views/${viewId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORGANIZATION_KEY, 'saved-views'] });
    },
  });
}

export function useMergeDuplicates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      groupId: string;
      keepId: number;
      mergeIds: number[];
      userId?: string;
    }) => {
      return fetchOrganizationApi<{ success: boolean }>('/duplicates/merge', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORGANIZATION_KEY, 'duplicates'] });
      queryClient.invalidateQueries({ queryKey: ['pricebook'] });
    },
  });
}

export function useDismissDuplicates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      return fetchOrganizationApi<{ success: boolean }>('/duplicates/dismiss', {
        method: 'POST',
        body: JSON.stringify({ groupId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORGANIZATION_KEY, 'duplicates'] });
    },
  });
}

export function useRecalculateHealth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return fetchOrganizationApi<{ success: boolean; updated: number }>('/recalculate-health', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORGANIZATION_KEY, 'health'] });
    },
  });
}

export function usePushToServiceTitan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entityType: 'material' | 'service';
      stIds: number[];
      userId?: string;
    }) => {
      return fetchOrganizationApi<{ pushed: number; failed: number; errors: string[] }>(
        '/pending-sync/push',
        {
          method: 'POST',
          body: JSON.stringify(params),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORGANIZATION_KEY, 'pending-sync'] });
      queryClient.invalidateQueries({ queryKey: ['pricebook'] });
    },
  });
}

export function useRetryPendingSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { entityType: string; stIds: number[] }) => {
      return fetchOrganizationApi<{ retried: number; failed: number }>('/pending-sync/retry', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ORGANIZATION_KEY, 'pending-sync'] });
    },
  });
}

// ==================== Derived Hooks ====================

export function useIssueCounts() {
  const { data: health, isLoading, error } = usePricebookHealth();
  const { data: syncData } = usePendingSyncCounts();

  const combined = health
    ? {
        uncategorized:
          (health.stats.materials?.uncategorized || 0) +
          (health.stats.services?.uncategorized || 0),
        no_image:
          (health.stats.materials?.no_image || 0) + (health.stats.services?.no_image || 0),
        zero_price:
          (health.stats.materials?.zero_price || 0) + (health.stats.services?.zero_price || 0),
        no_description:
          (health.stats.materials?.no_description || 0) +
          (health.stats.services?.no_description || 0),
        needs_review:
          (health.stats.materials?.active || 0) -
          (health.stats.materials?.reviewed || 0) +
          ((health.stats.services?.active || 0) - (health.stats.services?.reviewed || 0)),
        unreviewed:
          (health.stats.materials?.active || 0) -
          (health.stats.materials?.reviewed || 0) +
          ((health.stats.services?.active || 0) - (health.stats.services?.reviewed || 0)),
        reviewed:
          (health.stats.materials?.reviewed || 0) + (health.stats.services?.reviewed || 0),
        pending_sync: syncData?.totalPending || 0,
      }
    : null;

  return {
    combined,
    materials: health?.stats.materials,
    services: health?.stats.services,
    isLoading,
    error,
  };
}

// ==================== Filter State Hook ====================

export type FilterType =
  | 'uncategorized'
  | 'no_image'
  | 'zero_price'
  | 'no_description'
  | 'needs_review'
  | 'unreviewed'
  | 'reviewed'
  | 'pending_sync'
  | 'no_vendor';

export function useQuickFilters(initialFilters: FilterType[] = []) {
  const [activeFilters, setActiveFilters] = useState<FilterType[]>(initialFilters);

  const toggleFilter = useCallback((filter: FilterType) => {
    setActiveFilters((prev) => {
      if (prev.includes(filter)) {
        return prev.filter((f) => f !== filter);
      }
      // reviewed and unreviewed/needs_review are mutually exclusive
      if (filter === 'reviewed') {
        return [...prev.filter((f) => f !== 'unreviewed' && f !== 'needs_review'), filter];
      }
      if (filter === 'unreviewed' || filter === 'needs_review') {
        return [...prev.filter((f) => f !== 'reviewed' && f !== 'unreviewed' && f !== 'needs_review'), filter];
      }
      return [...prev, filter];
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters([]);
  }, []);

  const hasFilter = useCallback(
    (filter: FilterType) => activeFilters.includes(filter),
    [activeFilters]
  );

  return {
    activeFilters,
    toggleFilter,
    clearFilters,
    hasFilter,
    setActiveFilters,
  };
}
