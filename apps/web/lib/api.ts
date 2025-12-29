const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const CRM_API_URL = process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:3001/api/crm';
const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:3001/api/auth';

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function fetcher<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `JWT ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'API Error' }));
    throw new ApiError(error.message || 'API Error', res.status, error);
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string) => fetcher<T>(endpoint),
  
  post: <T>(endpoint: string, data?: unknown) =>
    fetcher<T>(endpoint, { 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  patch: <T>(endpoint: string, data: unknown) =>
    fetcher<T>(endpoint, { 
      method: 'PATCH', 
      body: JSON.stringify(data) 
    }),
  
  delete: <T>(endpoint: string) =>
    fetcher<T>(endpoint, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// CRM API Client - Uses ST Automation backend (main database)
// ─────────────────────────────────────────────────────────────────────────────

async function crmFetcher<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${CRM_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'CRM API Error' }));
    throw new ApiError(error.message || error.error || 'CRM API Error', res.status, error);
  }

  return res.json();
}

export interface CRMContact {
  id: string;
  st_customer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  stage: string;
  lead_score: number;
  lead_source: string | null;
  tags: string[];
  notes: string | null;
  is_active: boolean;
  pipeline_id: string | null;
  pipeline_name: string | null;
  balance: string;
  city: string | null;
  state: string | null;
  address_line1: string | null;
  open_opportunities: string;
  pending_tasks: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
  next_followup_at: string | null;
}

export interface CRMPipeline {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  stages: CRMPipelineStage[] | null;
  open_opportunities: string;
  pipeline_value: string;
}

export interface CRMPipelineStage {
  id: number;
  pipeline_id: number;
  name: string;
  color: string;
  display_order: number;
  is_won: boolean;
  is_lost: boolean;
  probability_percent: number;
}

export interface CRMOpportunity {
  id: string;
  contact_id: string;
  pipeline_id: string;
  stage_id: number;
  name: string;
  description: string | null;
  value: number;
  status: 'Open' | 'Won' | 'Lost';
  expected_close_date: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  pipeline_name: string;
  stage_name: string;
  stage_color: string;
  created_at: string;
  updated_at: string;
}

export interface CRMDashboardStats {
  total_contacts: string;
  new_contacts_30d: string;
  open_opportunities: string;
  pipeline_value: string;
  won_30d: string;
  won_value_30d: string;
  overdue_tasks: string;
  due_followups: string;
}

export interface CRMContactsResponse {
  success: boolean;
  data: CRMContact[];
  total: number;
  limit: number;
  offset: number;
}

export interface CRMPipelinesResponse {
  success: boolean;
  pipelines: CRMPipeline[];
}

export interface CRMOpportunitiesResponse {
  success: boolean;
  opportunities: CRMOpportunity[];
}

export interface CRMDashboardResponse {
  success: boolean;
  stats: CRMDashboardStats;
}

export const crmApi = {
  // Contacts
  getContacts: (params?: { search?: string; stage?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.stage) searchParams.set('stage', params.stage);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const query = searchParams.toString();
    return crmFetcher<CRMContactsResponse>(`/contacts${query ? `?${query}` : ''}`);
  },

  getContact: (id: string) => crmFetcher<{ success: boolean; contact: CRMContact }>(`/contacts/${id}`),

  updateContact: (id: string, data: Partial<CRMContact>) =>
    crmFetcher<{ success: boolean; contact: CRMContact }>(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  moveContactToStage: (id: string, stage: string) =>
    crmFetcher<{ success: boolean; contact: CRMContact }>(`/contacts/${id}/move-stage`, {
      method: 'POST',
      body: JSON.stringify({ stage }),
    }),

  // Pipelines
  getPipelines: () => crmFetcher<CRMPipelinesResponse>('/pipelines'),

  getPipelineStats: (id: string) =>
    crmFetcher<{ success: boolean; stats: CRMPipelineStage[] }>(`/pipelines/${id}/stats`),

  // Opportunities
  getOpportunities: (params?: { pipeline_id?: string; stage_id?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.pipeline_id) searchParams.set('pipeline_id', params.pipeline_id);
    if (params?.stage_id) searchParams.set('stage_id', params.stage_id);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return crmFetcher<CRMOpportunitiesResponse>(`/opportunities${query ? `?${query}` : ''}`);
  },

  createOpportunity: (data: Partial<CRMOpportunity>) =>
    crmFetcher<{ success: boolean; opportunity: CRMOpportunity }>('/opportunities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateOpportunity: (id: string, data: Partial<CRMOpportunity>) =>
    crmFetcher<{ success: boolean; opportunity: CRMOpportunity }>(`/opportunities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  moveOpportunityToStage: (id: string, stage_id: number) =>
    crmFetcher<{ success: boolean; opportunity: CRMOpportunity }>(`/opportunities/${id}/move-stage`, {
      method: 'POST',
      body: JSON.stringify({ stage_id }),
    }),

  // Activities
  getActivities: (contactId: string) =>
    crmFetcher<{ success: boolean; activities: unknown[] }>(`/contacts/${contactId}/activities`),

  logActivity: (contactId: string, data: { type: string; subject: string; body?: string }) =>
    crmFetcher<{ success: boolean; activity: unknown }>(`/contacts/${contactId}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Tasks
  createTask: (data: { contact_id?: string; opportunity_id?: string; title: string; due_date?: string; priority?: string }) =>
    crmFetcher<{ success: boolean; task: unknown }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  completeTask: (id: string) =>
    crmFetcher<{ success: boolean; task: unknown }>(`/tasks/${id}/complete`, {
      method: 'POST',
    }),

  getUpcomingTasks: (userId?: string, days?: number) => {
    const searchParams = new URLSearchParams();
    if (userId) searchParams.set('user_id', userId);
    if (days) searchParams.set('days', days.toString());
    const query = searchParams.toString();
    return crmFetcher<{ success: boolean; tasks: unknown[] }>(`/tasks/upcoming${query ? `?${query}` : ''}`);
  },

  // Dashboard
  getDashboard: () => crmFetcher<CRMDashboardResponse>('/dashboard'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth API Client - Uses ST Automation auth endpoints
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
}

export interface AuthLoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AuthRefreshResponse {
  accessToken: string;
  user: AuthUser;
}

async function authFetcher<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const res = await fetch(`${AUTH_API_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies for refresh token
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Auth API Error' }));
    throw new ApiError(error.error || error.message || 'Auth API Error', res.status, error);
  }

  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    authFetcher<AuthLoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    authFetcher<{ success: boolean }>('/logout', {
      method: 'POST',
    }),

  refresh: () =>
    authFetcher<AuthRefreshResponse>('/refresh', {
      method: 'POST',
    }),

  getMe: () => authFetcher<AuthUser>('/me'),

  updateMe: (data: { firstName?: string; lastName?: string; phone?: string }) =>
    authFetcher<AuthUser>('/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    authFetcher<{ success: boolean; message: string }>('/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Pricebook API - Uses Next.js API routes with basePath support
// ─────────────────────────────────────────────────────────────────────────────

// Base path must match next.config.mjs
export const BASE_PATH = '/dashboard';

/**
 * Prepends the base path to an API route for client-side fetch calls
 * @param path - API path starting with /api/...
 * @returns Full path with base path prepended
 */
export function apiUrl(path: string): string {
  // If path already starts with basePath, return as-is
  if (path.startsWith(BASE_PATH)) {
    return path;
  }
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${normalizedPath}`;
}

export { ApiError };
export default api;
