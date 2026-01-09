/**
 * Pricebook Organization Hooks
 * 
 * React Query hooks for health metrics, bulk operations, and organization features.
 * Follows patterns from usePricebookCategories.ts and useKits.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.lazilabs.com';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || '3222348440';

// ============================================================================
// TYPES
// ============================================================================

export interface HealthStats {
  total: number;
  active: number;
  reviewed: number;
  uncategorized: number;
  no_image: number;
  zero_price: number;
  no_description: number;
  negative_margin?: number;
  high_margin?: number;
}

export interface HealthData {
  overallScore: number;
  scores: {
    materials: number;
    services: number;
  };
  stats: {
    materials: HealthStats;
    services: HealthStats;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  totalIssues: number;
}

export interface AttentionItem {
  id: number;
  st_id: number;
  code: string;
  name: string;
  entity_type: 'material' | 'service';
  price?: number;
  cost?: number;
  image_url?: string;
  category_st_id?: number;
  category_name?: string;
  is_reviewed: boolean;
  health_score: number;
  issues: string[];
}

export interface CategoryCompleteness {
  category_st_id: number;
  category_name: string;
  entity_type: string;
  total_items: number;
  description_pct: number;
  image_pct: number;
  price_pct: number;
  cost_pct: number;
  reviewed_pct: number;
}

export interface DuplicateGroup {
  id: number;
  entity_type: string;
  member_st_ids: number[];
  similarity_score: number;
  match_reason?: string;
  status: 'pending' | 'merged' | 'dismissed';
  items?: Array<{
    st_id: number;
    code: string;
    name: string;
    price?: number;
    image_url?: string;
  }>;
}

export interface DuplicatePair {
  st_id_1: number;
  name_1: string;
  code_1: string;
  st_id_2: number;
  name_2: string;
  code_2: string;
  similarity: number;
}

export interface AnomalyGroup {
  type: 'negative_margin' | 'high_margin' | 'zero_price';
  description: string;
  items: Array<{
    st_id: number;
    code: string;
    name: string;
    entity_type: 'material' | 'service';
    price: number;
    cost: number;
    margin_pct: number;
  }>;
}

export interface AuditLogEntry {
  id: number;
  user_id: string;
  action: string;
  entity_type: string;
  entity_st_id: number;
  entity_name: string;
  changes: Record<string, { old: any; new: any }>;
  batch_id?: string;
  source: string;
  created_at: string;
}

export interface SavedView {
  id: string;
  name: string;
  entity_type: string;
  filters: Record<string, any>;
  sort_config: Record<string, any>;
  visible_columns: string[];
  is_default: boolean;
  created_at: string;
}

export interface ProgressData {
  dailyProgress: Array<{
    date: string;
    items_reviewed: number;
    items_categorized: number;
    items_priced: number;
    items_imaged: number;
    duplicates_resolved: number;
    total_actions: number;
  }>;
  totals: {
    reviewed: number;
    categorized: number;
    priced: number;
    imaged: number;
    duplicates: number;
    total: number;
  };
  achievements: Array<{
    achievement_key: string;
    achieved_at: string;
  }>;
  completion: {
    overall: number;
    reviewed: number;
    categorized: number;
    imaged: number;
    priced: number;
  };
  today: {
    items_reviewed: number;
    items_categorized: number;
    items_priced: number;
    total_actions: number;
  } | null;
}

export type IssueType = 'uncategorized' | 'no_image' | 'zero_price' | 'no_description' | 'unreviewed';
export type EntityType = 'materials' | 'services' | 'all';

// ============================================================================
// API HELPERS
// ============================================================================

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api/pricebook/organization${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': TENANT_ID,
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }
  
  return response.json();
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const organizationKeys = {
  all: ['pricebook', 'organization'] as const,
  health: () => [...organizationKeys.all, 'health'] as const,
  healthCategories: (entityType: EntityType) => [...organizationKeys.all, 'health', 'categories', entityType] as const,
  needsAttention: (entityType: EntityType, issueType?: IssueType) => [...organizationKeys.all, 'needs-attention', entityType, issueType] as const,
  duplicates: (entityType: EntityType, threshold?: number) => [...organizationKeys.all, 'duplicates', entityType, threshold] as const,
  anomalies: () => [...organizationKeys.all, 'anomalies'] as const,
  auditLog: (days: number, userId?: string) => [...organizationKeys.all, 'audit-log', days, userId] as const,
  progress: (userId: string) => [...organizationKeys.all, 'progress', userId] as const,
  savedViews: (userId: string, entityType?: string) => [...organizationKeys.all, 'saved-views', userId, entityType] as const,
};

// ============================================================================
// HOOKS: HEALTH & METRICS
// ============================================================================

export function usePricebookHealth() {
  return useQuery({
    queryKey: organizationKeys.health(),
    queryFn: async () => {
      const response = await apiFetch<{ success: boolean; data: HealthData }>('/health');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCategoryCompleteness(entityType: EntityType = 'materials') {
  return useQuery({
    queryKey: organizationKeys.healthCategories(entityType),
    queryFn: async () => {
      const response = await apiFetch<{ success: boolean; data: CategoryCompleteness[] }>(
        `/health/categories?entityType=${entityType}`
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: entityType !== 'all',
  });
}

// ============================================================================
// HOOKS: NEEDS ATTENTION QUEUE
// ============================================================================

export function useNeedsAttention(params?: {
  entityType?: EntityType;
  issueType?: IssueType;
  limit?: number;
  offset?: number;
}) {
  const { entityType = 'all', issueType, limit = 50, offset = 0 } = params || {};

  return useQuery({
    queryKey: organizationKeys.needsAttention(entityType, issueType),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        entityType,
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (issueType) searchParams.set('issueType', issueType);

      const response = await apiFetch<{
        success: boolean;
        data: AttentionItem[];
        pagination: { total: number; limit: number; offset: number };
      }>(`/needs-attention?${searchParams}`);

      return response;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// ============================================================================
// HOOKS: DUPLICATES
// ============================================================================

export function useDuplicates(entityType: EntityType = 'materials', threshold: number = 0.7) {
  return useQuery({
    queryKey: organizationKeys.duplicates(entityType, threshold),
    queryFn: async () => {
      const response = await apiFetch<{
        success: boolean;
        data: DuplicateGroup[] | DuplicatePair[];
        source: 'cached' | 'fresh';
      }>(`/duplicates?entityType=${entityType}&threshold=${threshold}`);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: entityType !== 'all',
  });
}

export function useMergeDuplicates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entityType: string;
      keepStId: number;
      mergeStIds: number[];
      userId?: string;
    }) => {
      return apiFetch<{ success: boolean; kept: number; merged: number }>('/duplicates/merge', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.duplicates(variables.entityType as EntityType) });
      queryClient.invalidateQueries({ queryKey: organizationKeys.health() });
      queryClient.invalidateQueries({ queryKey: ['pricebook', variables.entityType] });
    },
  });
}

export function useDismissDuplicate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { groupId: number; userId?: string }) => {
      return apiFetch<{ success: boolean }>('/duplicates/dismiss', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}

// ============================================================================
// HOOKS: ANOMALIES
// ============================================================================

export function useAnomalies() {
  return useQuery({
    queryKey: organizationKeys.anomalies(),
    queryFn: async () => {
      const response = await apiFetch<{
        success: boolean;
        data: AnomalyGroup[];
        total: number;
      }>('/anomalies');
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// HOOKS: BULK OPERATIONS
// ============================================================================

export function useBulkUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entityType: 'materials' | 'services';
      stIds: number[];
      updates: Record<string, any>;
      userId?: string;
    }) => {
      return apiFetch<{ success: boolean; updated: number; batchId: string }>('/bulk-update', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pricebook', variables.entityType] });
      queryClient.invalidateQueries({ queryKey: organizationKeys.health() });
      queryClient.invalidateQueries({ queryKey: organizationKeys.needsAttention(variables.entityType as EntityType) });
    },
  });
}

export function useBulkReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entityType: 'materials' | 'services';
      stIds: number[];
      reviewed?: boolean;
      userId?: string;
    }) => {
      return apiFetch<{ success: boolean; updated: number }>('/bulk-review', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pricebook', variables.entityType] });
      queryClient.invalidateQueries({ queryKey: organizationKeys.health() });
      queryClient.invalidateQueries({ queryKey: organizationKeys.needsAttention(variables.entityType as EntityType) });
      queryClient.invalidateQueries({ queryKey: organizationKeys.progress(variables.userId || '') });
    },
  });
}

// ============================================================================
// HOOKS: AUDIT LOG
// ============================================================================

export function useAuditLog(params?: { userId?: string; entityType?: string; days?: number }) {
  const { userId, entityType, days = 7 } = params || {};

  return useQuery({
    queryKey: organizationKeys.auditLog(days, userId),
    queryFn: async () => {
      const searchParams = new URLSearchParams({ days: days.toString() });
      if (userId) searchParams.set('userId', userId);
      if (entityType) searchParams.set('entityType', entityType);

      const response = await apiFetch<{
        success: boolean;
        data: Record<string, AuditLogEntry[]>;
        total: number;
      }>(`/audit-log?${searchParams}`);

      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// HOOKS: PROGRESS & GAMIFICATION
// ============================================================================

export function useProgress(userId: string) {
  return useQuery({
    queryKey: organizationKeys.progress(userId),
    queryFn: async () => {
      const response = await apiFetch<{ success: boolean; data: ProgressData }>(`/progress?userId=${userId}`);
      return response.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    enabled: !!userId,
  });
}

// ============================================================================
// HOOKS: SAVED VIEWS
// ============================================================================

export function useSavedViews(userId: string, entityType?: string) {
  return useQuery({
    queryKey: organizationKeys.savedViews(userId, entityType),
    queryFn: async () => {
      const searchParams = new URLSearchParams({ userId });
      if (entityType) searchParams.set('entityType', entityType);

      const response = await apiFetch<{ success: boolean; data: SavedView[] }>(`/saved-views?${searchParams}`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
}

export function useCreateSavedView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      userId: string;
      name: string;
      entityType: string;
      filters?: Record<string, any>;
      sortConfig?: Record<string, any>;
      visibleColumns?: string[];
      isDefault?: boolean;
    }) => {
      return apiFetch<{ success: boolean; data: SavedView }>('/saved-views', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.savedViews(variables.userId) });
    },
  });
}

export function useDeleteSavedView() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; userId: string }) => {
      return apiFetch<{ success: boolean }>(`/saved-views/${params.id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.savedViews(variables.userId) });
    },
  });
}

// ============================================================================
// HOOKS: UTILITIES
// ============================================================================

export function useRecalculateHealth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiFetch<{ success: boolean; materials_updated: number; services_updated: number }>('/recalculate-health', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.health() });
      queryClient.invalidateQueries({ queryKey: organizationKeys.needsAttention('all') });
    },
  });
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Get issue counts for quick filter badges
 */
export function useIssueCounts() {
  const { data: health } = usePricebookHealth();

  if (!health) {
    return { materials: {}, services: {}, combined: {} };
  }

  const combineCounts = (...sources: (HealthStats | undefined)[]) => {
    return sources.reduce((acc, s) => {
      if (!s) return acc;
      acc.uncategorized = (acc.uncategorized || 0) + (s.uncategorized || 0);
      acc.no_image = (acc.no_image || 0) + (s.no_image || 0);
      acc.zero_price = (acc.zero_price || 0) + (s.zero_price || 0);
      acc.no_description = (acc.no_description || 0) + (s.no_description || 0);
      acc.unreviewed = (acc.unreviewed || 0) + ((s.active || 0) - (s.reviewed || 0));
      acc.reviewed = (acc.reviewed || 0) + (s.reviewed || 0);
      return acc;
    }, {} as Record<string, number>);
  };

  return {
    materials: combineCounts(health.stats.materials),
    services: combineCounts(health.stats.services),
    combined: combineCounts(health.stats.materials, health.stats.services),
  };
}

// ============================================================================
// TYPES: PENDING SYNC
// ============================================================================

export interface PendingSyncItem {
  entity_type: 'material' | 'service';
  st_id: number;
  code: string;
  name: string;
  sync_status: 'pending' | 'error';
  sync_error?: string;
  pending_since: string;
  pending_changes: Record<string, any>;
}

export interface PendingSyncCounts {
  [entityType: string]: {
    pending: number;
    errors: number;
    oldest?: string;
  };
}

// ============================================================================
// HOOKS: PENDING SYNC
// ============================================================================

export function usePendingSyncCounts() {
  return useQuery({
    queryKey: [...organizationKeys.all, 'pending-sync', 'counts'],
    queryFn: async () => {
      const response = await apiFetch<{
        success: boolean;
        data: PendingSyncCounts;
        totalPending: number;
        totalErrors: number;
      }>('/pending-sync/counts');
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function usePendingSync(params?: {
  entityType?: 'material' | 'service' | 'all';
  status?: 'pending' | 'error';
  limit?: number;
}) {
  const { entityType = 'all', status = 'pending', limit = 100 } = params || {};

  return useQuery({
    queryKey: [...organizationKeys.all, 'pending-sync', entityType, status],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        status,
        limit: limit.toString(),
      });
      if (entityType !== 'all') searchParams.set('entityType', entityType);

      const response = await apiFetch<{
        success: boolean;
        data: PendingSyncItem[];
        counts: PendingSyncCounts;
        total: number;
      }>(`/pending-sync?${searchParams}`);

      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function usePushToServiceTitan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entityType: 'material' | 'service' | 'materials' | 'services';
      stIds: number[];
      userId?: string;
    }) => {
      return apiFetch<{
        success: boolean;
        pushed: number;
        failed: number;
        errors: Array<{ st_id?: number; id?: number; code: string; error: string }>;
      }>('/pending-sync/push', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...organizationKeys.all, 'pending-sync'] });
      queryClient.invalidateQueries({ queryKey: ['pricebook'] });
    },
  });
}

export function useRetryPendingSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entityType: 'material' | 'service' | 'materials' | 'services';
      stIds: number[];
    }) => {
      return apiFetch<{ success: boolean }>('/pending-sync/retry', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...organizationKeys.all, 'pending-sync'] });
    },
  });
}
