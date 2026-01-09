'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '@/lib/api';
import type {
  PricingDataResponse,
  Technician,
  OfficeStaff,
  Vehicle,
  ExpenseItem,
  JobType,
  TechnicianFormData,
  OfficeStaffFormData,
  VehicleFormData,
  ExpenseItemFormData,
  JobTypeFormData,
} from '../lib/types';

const API_BASE = '/pricebook/pricing/api';

// ====================
// Main Data Hook
// ====================
export function usePricingData() {
  return useQuery<PricingDataResponse>({
    queryKey: ['pricing-data'],
    queryFn: async () => {
      const res = await fetch(apiUrl(`${API_BASE}`));
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to fetch pricing data' }));
        throw new Error(error.error || 'Failed to fetch pricing data');
      }
      return res.json();
    },
    staleTime: 30000, // 30 seconds
  });
}

// ====================
// Technicians Hooks
// ====================
export function useTechnicians() {
  return useQuery<Technician[]>({
    queryKey: ['pricing-technicians'],
    queryFn: async () => {
      const res = await fetch(apiUrl(`${API_BASE}/technicians`));
      if (!res.ok) throw new Error('Failed to fetch technicians');
      const data = await res.json();
      return data.data || data;
    },
  });
}

export function useCreateTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TechnicianFormData) => {
      const res = await fetch(apiUrl(`${API_BASE}/technicians`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to create technician' }));
        throw new Error(error.error || 'Failed to create technician');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-technicians'] });
    },
  });
}

export function useUpdateTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TechnicianFormData> }) => {
      const res = await fetch(apiUrl(`${API_BASE}/technicians/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to update technician' }));
        throw new Error(error.error || 'Failed to update technician');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-technicians'] });
    },
  });
}

export function useDeleteTechnician() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`${API_BASE}/technicians/${id}`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to delete technician' }));
        throw new Error(error.error || 'Failed to delete technician');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-technicians'] });
    },
  });
}

// ====================
// Office Staff Hooks
// ====================
export function useOfficeStaff() {
  return useQuery<OfficeStaff[]>({
    queryKey: ['pricing-office-staff'],
    queryFn: async () => {
      const res = await fetch(apiUrl(`${API_BASE}/office-staff`));
      if (!res.ok) throw new Error('Failed to fetch office staff');
      const data = await res.json();
      return data.data || data;
    },
  });
}

export function useCreateOfficeStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: OfficeStaffFormData) => {
      const res = await fetch(apiUrl(`${API_BASE}/office-staff`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to create office staff' }));
        throw new Error(error.error || 'Failed to create office staff');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-office-staff'] });
    },
  });
}

export function useUpdateOfficeStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OfficeStaffFormData> }) => {
      const res = await fetch(apiUrl(`${API_BASE}/office-staff/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to update office staff' }));
        throw new Error(error.error || 'Failed to update office staff');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-office-staff'] });
    },
  });
}

export function useDeleteOfficeStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`${API_BASE}/office-staff/${id}`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to delete office staff' }));
        throw new Error(error.error || 'Failed to delete office staff');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-office-staff'] });
    },
  });
}

// ====================
// Vehicles Hooks
// ====================
export function useVehicles() {
  return useQuery<Vehicle[]>({
    queryKey: ['pricing-vehicles'],
    queryFn: async () => {
      const res = await fetch(apiUrl(`${API_BASE}/vehicles`));
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      const data = await res.json();
      return data.data || data;
    },
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: VehicleFormData) => {
      const res = await fetch(apiUrl(`${API_BASE}/vehicles`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to create vehicle' }));
        throw new Error(error.error || 'Failed to create vehicle');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-vehicles'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VehicleFormData> }) => {
      const res = await fetch(apiUrl(`${API_BASE}/vehicles/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to update vehicle' }));
        throw new Error(error.error || 'Failed to update vehicle');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`${API_BASE}/vehicles/${id}`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to delete vehicle' }));
        throw new Error(error.error || 'Failed to delete vehicle');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-vehicles'] });
    },
  });
}

// ====================
// Expenses Hooks
// ====================
export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ExpenseItemFormData) => {
      const res = await fetch(apiUrl(`${API_BASE}/expenses`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to create expense' }));
        throw new Error(error.error || 'Failed to create expense');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ExpenseItemFormData> }) => {
      const res = await fetch(apiUrl(`${API_BASE}/expenses/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to update expense' }));
        throw new Error(error.error || 'Failed to update expense');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`${API_BASE}/expenses/${id}`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to delete expense' }));
        throw new Error(error.error || 'Failed to delete expense');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
    },
  });
}

// ====================
// Job Types Hooks
// ====================
export function useJobTypes() {
  return useQuery<JobType[]>({
    queryKey: ['pricing-job-types'],
    queryFn: async () => {
      const res = await fetch(apiUrl(`${API_BASE}/job-types`));
      if (!res.ok) throw new Error('Failed to fetch job types');
      const data = await res.json();
      return data.data || data;
    },
  });
}

export function useCreateJobType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: JobTypeFormData) => {
      const res = await fetch(apiUrl(`${API_BASE}/job-types`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to create job type' }));
        throw new Error(error.error || 'Failed to create job type');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-job-types'] });
    },
  });
}

export function useUpdateJobType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<JobTypeFormData> }) => {
      const res = await fetch(apiUrl(`${API_BASE}/job-types/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to update job type' }));
        throw new Error(error.error || 'Failed to update job type');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-job-types'] });
    },
  });
}

export function useDeleteJobType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`${API_BASE}/job-types/${id}`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Failed to delete job type' }));
        throw new Error(error.error || 'Failed to delete job type');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-job-types'] });
    },
  });
}
