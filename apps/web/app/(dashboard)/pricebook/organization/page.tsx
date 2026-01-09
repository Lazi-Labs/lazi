'use client';

import React, { useState } from 'react';
import { Package, AlertTriangle, CheckCircle2, Upload, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PricebookHealthDashboard } from '@/components/pricebook/organization/PricebookHealthDashboard';
import { EntityBreakdown } from '@/components/pricebook/organization/EntityBreakdown';
import { IssueCardsGrid } from '@/components/pricebook/organization/IssueCards';
import { PendingSyncBadge, PendingSyncIndicator } from '@/components/pricebook/organization/PendingSyncBadge';
import { PendingSyncPanel } from '@/components/pricebook/organization/PendingSyncPanel';
import { usePricebookHealth, usePendingSyncCounts, useNeedsAttention } from '@/hooks/usePricebookOrganization';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function PricebookOrganizationPage() {
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = usePricebookHealth();
  const { data: syncCounts } = usePendingSyncCounts();
  const { data: needsAttention } = useNeedsAttention({ limit: 5 });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pricebook Organization</h1>
          <p className="text-gray-500 dark:text-gray-400">Clean up, organize, and improve your pricebook data quality</p>
        </div>
        <div className="flex items-center gap-3">
          <PendingSyncBadge onClick={() => setShowSyncPanel(true)} />
          <Button
            onClick={() => refetchHealth()}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Items"
          value={((health?.stats.materials?.total || 0) + (health?.stats.services?.total || 0)).toLocaleString()}
          subtext={`${health?.stats.materials?.total || 0} materials · ${health?.stats.services?.total || 0} services`}
          icon={<Package className="h-4 w-4" />}
          loading={healthLoading}
        />
        <StatCard
          label="Needs Attention"
          value={(health?.totalIssues || 0).toLocaleString()}
          subtext="Issues to resolve"
          icon={<AlertTriangle className="h-4 w-4" />}
          color="yellow"
          loading={healthLoading}
        />
        <StatCard
          label="Reviewed"
          value={((health?.stats.materials?.reviewed || 0) + (health?.stats.services?.reviewed || 0)).toLocaleString()}
          subtext={`${Math.round(((health?.stats.materials?.reviewed || 0) + (health?.stats.services?.reviewed || 0)) / ((health?.stats.materials?.active || 1) + (health?.stats.services?.active || 1)) * 100)}% complete`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="green"
          loading={healthLoading}
        />
        <StatCard
          label="Pending Sync"
          value={(syncCounts?.totalPending || 0).toString()}
          subtext={`${syncCounts?.totalErrors || 0} with errors`}
          icon={<Upload className="h-4 w-4" />}
          color="orange"
          loading={healthLoading}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Health Dashboard */}
        <div className="lg:col-span-1 space-y-4">
          <PricebookHealthDashboard />
          <EntityBreakdown
            onEntityClick={(type) => {
              window.location.href = `/pricebook?section=${type}`;
            }}
          />
        </div>

        {/* Issues Breakdown */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Issues by Type</h3>
            <IssueCardsGrid
              onIssueClick={(issueType) => {
                // Navigate to services with filter
                window.location.href = `/pricebook?section=services&filter=${issueType}`;
              }}
            />
          </div>
        </div>
      </div>

      {/* Needs Attention Preview */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 shadow-sm">
        <div className="px-4 py-3 border-b dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Needs Attention</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Items sorted by priority score</p>
          </div>
          <Link
            href="/pricebook?section=services"
            className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
          >
            View All
          </Link>
        </div>
        <div className="divide-y dark:divide-gray-800">
          {needsAttention?.items?.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>All items look good!</p>
            </div>
          ) : (
            needsAttention?.items?.slice(0, 5).map((item) => (
              <div
                key={`${item.entity_type}-${item.st_id}`}
                className="px-4 py-3 flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => {
                  const section = item.entity_type === 'material' ? 'materials' : 'services';
                  window.location.href = `/pricebook/${section}/${item.st_id}`;
                }}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{item.code}</div>
                </div>
                <div className="flex items-center gap-2">
                  {item.issues?.map((issue: string) => (
                    <span
                      key={issue}
                      className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-400 rounded text-[10px] font-medium"
                    >
                      {issue.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending Sync Panel */}
      <PendingSyncPanel
        open={showSyncPanel}
        onClose={() => setShowSyncPanel(false)}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  color?: 'gray' | 'yellow' | 'green' | 'orange';
  loading?: boolean;
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  color = 'gray',
  loading,
}: StatCardProps) {
  const colors = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 shadow-sm p-4 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors[color])}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{subtext}</div>
    </div>
  );
}
