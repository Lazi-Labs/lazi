'use client';

import {
  Users,
  Truck,
  DollarSign,
  TrendingUp,
  Target,
  Clock,
  Percent,
  Calculator,
} from 'lucide-react';
import MetricCard from './shared/MetricCard';
import SectionCard from './shared/SectionCard';
import { formatCurrency, formatPercent, formatNumber } from '../lib/calculations';
import type { PricingDataResponse, CalculationResults } from '../lib/types';

interface OverviewTabProps {
  data: PricingDataResponse;
  calculations: CalculationResults | null;
}

export default function OverviewTab({ data, calculations }: OverviewTabProps) {
  if (!calculations) {
    return (
      <div className="text-center py-12 text-slate-500">
        Unable to calculate metrics. Please check your data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Technicians"
          value={calculations.techCount}
          subtitle={`${calculations.staffCount} office staff`}
          icon={Users}
        />
        <MetricCard
          label="Fleet Vehicles"
          value={calculations.activeVehicles}
          subtitle={`${formatCurrency(calculations.totalEquity)} equity`}
          icon={Truck}
        />
        <MetricCard
          label="Loaded Cost/Hr"
          value={formatCurrency(calculations.avgLoadedCostPerHour, 2)}
          subtitle="Average across all techs"
          icon={DollarSign}
        />
        <MetricCard
          label="Target Revenue"
          value={formatCurrency(calculations.projectedRevenue)}
          subtitle={`${formatCurrency(calculations.revenuePerTechAnnual)}/tech`}
          icon={Target}
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Workforce Summary */}
        <SectionCard title="Workforce Summary">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Avg Burden %</span>
              <span className="font-semibold text-amber-600">
                {formatPercent(calculations.avgBurdenPercent)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Avg Efficiency</span>
              <span className="font-semibold text-emerald-600">
                {formatPercent(calculations.avgEfficiencyPercent)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">True Cost/Hr</span>
              <span className="font-semibold">
                {formatCurrency(calculations.avgTrueCostPerHour, 2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Billable Hrs/Year</span>
              <span className="font-semibold">
                {formatNumber(calculations.totalBillableHoursPerYear)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Total Tech Cost</span>
                <span className="font-bold text-slate-800">
                  {formatCurrency(calculations.totalTechCostAnnual)}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Fleet Summary */}
        <SectionCard title="Fleet Summary">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Monthly Cost</span>
              <span className="font-semibold">
                {formatCurrency(calculations.fleetCostMonthly)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Cost/Billable Hr</span>
              <span className="font-semibold text-violet-600">
                {formatCurrency(calculations.fleetCostPerHour, 2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Total Equity</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(calculations.totalEquity)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Annual Fleet Cost</span>
                <span className="font-bold text-slate-800">
                  {formatCurrency(calculations.fleetCostMonthly * 12)}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Overhead Summary */}
        <SectionCard title="Overhead Summary">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Monthly Expenses</span>
              <span className="font-semibold">
                {formatCurrency(calculations.monthlyExpenses)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Office Staff</span>
              <span className="font-semibold">
                {formatCurrency(calculations.totalStaffCostAnnual / 12)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Overhead/Hr</span>
              <span className="font-semibold text-orange-600">
                {formatCurrency(calculations.overheadPerHour, 2)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Total Monthly Overhead</span>
                <span className="font-bold text-slate-800">
                  {formatCurrency(calculations.monthlyOverhead)}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Break-Even & P&L Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Break-Even */}
        <SectionCard title="Break-Even Analysis">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(calculations.breakEvenDaily)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Daily</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-2xl font-bold text-amber-700">
                {formatCurrency(calculations.breakEvenMonthly)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Monthly</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-800">
                {formatCurrency(calculations.breakEvenAnnual)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Annual</div>
            </div>
          </div>
        </SectionCard>

        {/* P&L Quick Look */}
        <SectionCard title="P&L Quick Look">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Projected Revenue</span>
              <span className="font-semibold">
                {formatCurrency(calculations.projectedRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Materials Cost</span>
              <span className="font-semibold text-red-600">
                ({formatCurrency(calculations.materialsCost)})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Gross Profit</span>
              <span className="font-semibold">
                {formatCurrency(calculations.grossProfit)}{' '}
                <span className="text-xs text-slate-400">
                  ({formatPercent(calculations.grossMarginPercent)})
                </span>
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Net Profit</span>
                <span
                  className={`font-bold ${
                    calculations.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(calculations.netProfit)}{' '}
                  <span className="text-xs">
                    ({formatPercent(calculations.netMarginPercent)})
                  </span>
                </span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Cost Build-Up Visual */}
      <SectionCard title="Loaded Cost Build-Up (per billable hour)">
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          {/* True Cost */}
          <div className="flex-shrink-0 text-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-lg font-bold text-blue-700">
                {formatCurrency(calculations.avgTrueCostPerHour, 0)}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-2">True Cost</div>
          </div>

          <div className="text-2xl text-slate-300">+</div>

          {/* Fleet Cost */}
          <div className="flex-shrink-0 text-center">
            <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center">
              <span className="text-lg font-bold text-violet-700">
                {formatCurrency(calculations.fleetCostPerHour, 0)}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-2">Fleet</div>
          </div>

          <div className="text-2xl text-slate-300">+</div>

          {/* Overhead */}
          <div className="flex-shrink-0 text-center">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-lg font-bold text-orange-700">
                {formatCurrency(calculations.overheadPerHour, 0)}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-2">Overhead</div>
          </div>

          <div className="text-2xl text-slate-300">=</div>

          {/* Total Loaded */}
          <div className="flex-shrink-0 text-center">
            <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-emerald-500">
              <span className="text-xl font-bold text-emerald-700">
                {formatCurrency(
                  calculations.avgTrueCostPerHour +
                    calculations.fleetCostPerHour +
                    calculations.overheadPerHour,
                  0
                )}
              </span>
            </div>
            <div className="text-xs font-medium text-slate-600 mt-2">Loaded Cost</div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
