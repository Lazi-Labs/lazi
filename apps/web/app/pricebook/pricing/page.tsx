'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { calcFullSummary } from './lib/calculations';
import type { PricingDataResponse, CalculationResults } from './lib/types';

// Tab components (to be implemented)
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
          <WorkforceTab data={data} calculations={calculations} />
        )}
        {activeTab === 'fleet' && (
          <FleetTab data={data} calculations={calculations} />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab data={data} calculations={calculations} />
        )}
        {activeTab === 'rates' && (
          <RatesTab data={data} calculations={calculations} />
        )}
        {activeTab === 'pl' && (
          <PLTab data={data} calculations={calculations} />
        )}
      </div>
    </div>
  );
}
