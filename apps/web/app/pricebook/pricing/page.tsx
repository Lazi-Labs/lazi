'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Users,
  Truck,
  Receipt,
  Calculator,
  TrendingUp,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { calcFullSummary } from './lib/calculations';
import type {
  PricingDataResponse,
  CalculationResults,
  TechnicianFormData,
  OfficeStaffFormData,
  VehicleFormData,
  ExpenseItemFormData,
  JobTypeFormData,
  MarkupTierFormData,
} from './lib/types';

// Tab components
import OverviewTab from './components/OverviewTab';
import WorkforceTab from './components/WorkforceTab';
import FleetTab from './components/FleetTab';
import ExpensesTab from './components/ExpensesTab';
import RatesTab from './components/RatesTab';
import PLTab from './components/PLTab';

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'workforce', label: 'Workforce', icon: Users },
  { id: 'fleet', label: 'Fleet', icon: Truck },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'rates', label: 'Rates', icon: Calculator },
  { id: 'pl', label: 'P&L', icon: TrendingUp },
] as const;

type TabId = typeof tabs[number]['id'];

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all pricing data
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<PricingDataResponse>({
    queryKey: ['pricing-data'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/pricebook/pricing/api'));
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to fetch data' }));
        throw new Error(err.error || 'Failed to fetch pricing data');
      }
      return res.json();
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  // ===================
  // Technician Mutations
  // ===================
  const createTechnicianMutation = useMutation({
    mutationFn: async (formData: TechnicianFormData) => {
      const res = await fetch(apiUrl('/pricebook/pricing/api/technicians'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create technician' }));
        throw new Error(err.error || 'Failed to create technician');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Technician created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateTechnicianMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TechnicianFormData }) => {
      const res = await fetch(apiUrl(`/pricebook/pricing/api/technicians/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update technician' }));
        throw new Error(err.error || 'Failed to update technician');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Technician updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTechnicianMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/pricebook/pricing/api/technicians/${id}`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to delete technician' }));
        throw new Error(err.error || 'Failed to delete technician');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Technician deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ===================
  // Office Staff Mutations
  // ===================
  const createOfficeStaffMutation = useMutation({
    mutationFn: async (formData: OfficeStaffFormData) => {
      const res = await fetch(apiUrl('/pricebook/pricing/api/office-staff'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create office staff' }));
        throw new Error(err.error || 'Failed to create office staff');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Office staff created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateOfficeStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: OfficeStaffFormData }) => {
      const res = await fetch(apiUrl(`/pricebook/pricing/api/office-staff/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update office staff' }));
        throw new Error(err.error || 'Failed to update office staff');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Office staff updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteOfficeStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/pricebook/pricing/api/office-staff/${id}`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to delete office staff' }));
        throw new Error(err.error || 'Failed to delete office staff');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Office staff deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ===================
  // Vehicle Mutations
  // ===================
  const createVehicleMutation = useMutation({
    mutationFn: async (formData: VehicleFormData) => {
      const res = await fetch(apiUrl('/pricebook/pricing/api/vehicles'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create vehicle' }));
        throw new Error(err.error || 'Failed to create vehicle');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Vehicle created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VehicleFormData }) => {
      const res = await fetch(apiUrl(`/pricebook/pricing/api/vehicles/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update vehicle' }));
        throw new Error(err.error || 'Failed to update vehicle');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Vehicle updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/pricebook/pricing/api/vehicles/${id}`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to delete vehicle' }));
        throw new Error(err.error || 'Failed to delete vehicle');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Vehicle deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ===================
  // Expense Mutations
  // ===================
  const createExpenseMutation = useMutation({
    mutationFn: async (formData: ExpenseItemFormData) => {
      const res = await fetch(apiUrl('/pricebook/pricing/api/expenses'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create expense' }));
        throw new Error(err.error || 'Failed to create expense');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Expense created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExpenseItemFormData }) => {
      const res = await fetch(apiUrl(`/pricebook/pricing/api/expenses/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update expense' }));
        throw new Error(err.error || 'Failed to update expense');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Expense updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/pricebook/pricing/api/expenses/${id}`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to delete expense' }));
        throw new Error(err.error || 'Failed to delete expense');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Expense deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ===================
  // Job Type Mutations
  // ===================
  const createJobTypeMutation = useMutation({
    mutationFn: async (formData: JobTypeFormData) => {
      const res = await fetch(apiUrl('/pricebook/pricing/api/job-types'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create job type' }));
        throw new Error(err.error || 'Failed to create job type');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Job type created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateJobTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: JobTypeFormData }) => {
      const res = await fetch(apiUrl(`/pricebook/pricing/api/job-types/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update job type' }));
        throw new Error(err.error || 'Failed to update job type');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Job type updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteJobTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/pricebook/pricing/api/job-types/${id}`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to delete job type' }));
        throw new Error(err.error || 'Failed to delete job type');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Job type deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ===================
  // Markup Tier Mutations
  // ===================
  const createMarkupTierMutation = useMutation({
    mutationFn: async (formData: MarkupTierFormData) => {
      const res = await fetch(apiUrl('/pricebook/pricing/api/markup-tiers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create markup tier' }));
        throw new Error(err.error || 'Failed to create markup tier');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Markup tier created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMarkupTierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MarkupTierFormData }) => {
      const res = await fetch(apiUrl(`/pricebook/pricing/api/markup-tiers/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to update markup tier' }));
        throw new Error(err.error || 'Failed to update markup tier');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Markup tier updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMarkupTierMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/pricebook/pricing/api/markup-tiers/${id}`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to delete markup tier' }));
        throw new Error(err.error || 'Failed to delete markup tier');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-data'] });
      toast({ title: 'Markup tier deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // ===================
  // Loading States
  // ===================
  const isWorkforceLoading =
    createTechnicianMutation.isPending ||
    updateTechnicianMutation.isPending ||
    deleteTechnicianMutation.isPending ||
    createOfficeStaffMutation.isPending ||
    updateOfficeStaffMutation.isPending ||
    deleteOfficeStaffMutation.isPending;

  const isFleetLoading =
    createVehicleMutation.isPending ||
    updateVehicleMutation.isPending ||
    deleteVehicleMutation.isPending;

  const isExpensesLoading =
    createExpenseMutation.isPending ||
    updateExpenseMutation.isPending ||
    deleteExpenseMutation.isPending;

  const isRatesLoading =
    createJobTypeMutation.isPending ||
    updateJobTypeMutation.isPending ||
    deleteJobTypeMutation.isPending ||
    createMarkupTierMutation.isPending ||
    updateMarkupTierMutation.isPending ||
    deleteMarkupTierMutation.isPending;

  // Calculate metrics from raw data
  const calculations: CalculationResults | null = useMemo(() => {
    if (!data?.settings) return null;

    try {
      return calcFullSummary(
        data.technicians || [],
        data.unproductiveTimeMap || {},
        data.officeStaff || [],
        data.vehicles || [],
        data.expenseCategories || [],
        data.settings
      );
    } catch (err) {
      console.error('Calculation error:', err);
      return null;
    }
  }, [data]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <span className="text-slate-500">Loading pricing data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="p-3 rounded-full bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 mb-1">Failed to load pricing data</h3>
            <p className="text-sm text-slate-500 mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data?.settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="font-semibold text-slate-800 mb-1">No organization data found</h3>
          <p className="text-sm text-slate-500">
            Please set up your organization in the pricing service first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Advanced Pricing System</h1>
          <p className="text-slate-500 text-sm">{data.settings.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Syncing...
            </span>
          )}
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-slate-100 p-1 rounded-xl mb-6 inline-flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
              activeTab === tab.id
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'overview' && (
          <OverviewTab data={data} calculations={calculations} />
        )}
        {activeTab === 'workforce' && (
          <WorkforceTab
            data={data}
            calculations={calculations}
            onCreateTechnician={(formData) => createTechnicianMutation.mutate(formData)}
            onUpdateTechnician={(id, formData) => updateTechnicianMutation.mutate({ id, data: formData })}
            onDeleteTechnician={(id) => deleteTechnicianMutation.mutate(id)}
            onCreateOfficeStaff={(formData) => createOfficeStaffMutation.mutate(formData)}
            onUpdateOfficeStaff={(id, formData) => updateOfficeStaffMutation.mutate({ id, data: formData })}
            onDeleteOfficeStaff={(id) => deleteOfficeStaffMutation.mutate(id)}
            isLoading={isWorkforceLoading}
          />
        )}
        {activeTab === 'fleet' && (
          <FleetTab
            data={data}
            calculations={calculations}
            onCreateVehicle={(formData) => createVehicleMutation.mutate(formData)}
            onUpdateVehicle={(id, formData) => updateVehicleMutation.mutate({ id, data: formData })}
            onDeleteVehicle={(id) => deleteVehicleMutation.mutate(id)}
            isLoading={isFleetLoading}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab
            data={data}
            calculations={calculations}
            onCreateExpense={(formData) => createExpenseMutation.mutate(formData)}
            onUpdateExpense={(id, formData) => updateExpenseMutation.mutate({ id, data: formData })}
            onDeleteExpense={(id) => deleteExpenseMutation.mutate(id)}
            isLoading={isExpensesLoading}
          />
        )}
        {activeTab === 'rates' && (
          <RatesTab
            data={data}
            calculations={calculations}
            onCreateJobType={(formData) => createJobTypeMutation.mutate(formData)}
            onUpdateJobType={(id, formData) => updateJobTypeMutation.mutate({ id, data: formData })}
            onDeleteJobType={(id) => deleteJobTypeMutation.mutate(id)}
            onCreateMarkupTier={(formData) => createMarkupTierMutation.mutate(formData)}
            onUpdateMarkupTier={(id, formData) => updateMarkupTierMutation.mutate({ id, data: formData })}
            onDeleteMarkupTier={(id) => deleteMarkupTierMutation.mutate(id)}
            isLoading={isRatesLoading}
          />
        )}
        {activeTab === 'pl' && (
          <PLTab data={data} calculations={calculations} />
        )}
      </div>
    </div>
  );
}
