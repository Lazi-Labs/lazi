'use client';

import { TrendingUp, TrendingDown, DollarSign, Target, AlertTriangle } from 'lucide-react';
import SectionCard from './shared/SectionCard';
import MetricCard from './shared/MetricCard';
import { formatCurrency, formatPercent } from '../lib/calculations';
import type { PricingDataResponse, CalculationResults } from '../lib/types';

interface PLTabProps {
  data: PricingDataResponse;
  calculations: CalculationResults | null;
}

export default function PLTab({ data, calculations }: PLTabProps) {
  if (!calculations) {
    return (
      <div className="text-center py-12 text-slate-500">
        Unable to calculate P&L projections. Please check your data.
      </div>
    );
  }

  const {
    projectedRevenue,
    materialsCost,
    totalTechCostAnnual,
    grossProfit,
    grossMarginPercent,
    monthlyOverhead,
    netProfit,
    netMarginPercent,
    breakEvenMonthly,
    breakEvenDaily,
    breakEvenAnnual,
    revenuePerTechAnnual,
    revenuePerTechMonthly,
    techCount,
  } = calculations;

  const totalCOGS = materialsCost + totalTechCostAnnual;
  const annualOverhead = monthlyOverhead * 12;
  const isProfit = netProfit >= 0;
  const revenueVsBreakEven = projectedRevenue - breakEvenAnnual;

  return (
    <div className="space-y-6">
      {/* Key P&L Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Projected Revenue"
          value={formatCurrency(projectedRevenue)}
          subtitle={`${formatCurrency(projectedRevenue / 12)}/month`}
          icon={Target}
        />
        <MetricCard
          label="Gross Profit"
          value={formatCurrency(grossProfit)}
          subtitle={`${formatPercent(grossMarginPercent)} margin`}
          icon={DollarSign}
        />
        <MetricCard
          label="Net Profit"
          value={formatCurrency(netProfit)}
          subtitle={`${formatPercent(netMarginPercent)} margin`}
          icon={isProfit ? TrendingUp : TrendingDown}
          valueClassName={isProfit ? 'text-emerald-600' : 'text-red-600'}
        />
        <MetricCard
          label="Break-Even"
          value={formatCurrency(breakEvenMonthly)}
          subtitle="Monthly minimum"
          icon={AlertTriangle}
          valueClassName="text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P&L Statement */}
        <SectionCard title="Projected P&L Statement" subtitle="Annual projections">
          <div className="space-y-4">
            {/* Revenue */}
            <div className="flex justify-between items-center text-lg font-semibold">
              <span className="text-slate-800">Revenue</span>
              <span className="text-slate-800">{formatCurrency(projectedRevenue)}</span>
            </div>

            {/* COGS */}
            <div className="pl-4 space-y-2 border-l-2 border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Materials Cost ({formatPercent(data.settings?.material_cost_percent || 0)})</span>
                <span className="text-red-600">({formatCurrency(materialsCost)})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Direct Labor (Technicians)</span>
                <span className="text-red-600">({formatCurrency(totalTechCostAnnual)})</span>
              </div>
              <div className="flex justify-between text-sm font-medium pt-1 border-t border-slate-100">
                <span className="text-slate-700">Total COGS</span>
                <span className="text-red-600">({formatCurrency(totalCOGS)})</span>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between items-center py-2 border-y border-slate-200">
              <span className="font-semibold text-slate-800">Gross Profit</span>
              <div className="text-right">
                <span className="font-semibold text-slate-800">{formatCurrency(grossProfit)}</span>
                <span className="text-sm text-slate-500 ml-2">({formatPercent(grossMarginPercent)})</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="pl-4 space-y-2 border-l-2 border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Office Staff</span>
                <span className="text-red-600">({formatCurrency(calculations.totalStaffCostAnnual)})</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Other Operating Expenses</span>
                <span className="text-red-600">({formatCurrency(calculations.monthlyExpenses * 12)})</span>
              </div>
              <div className="flex justify-between text-sm font-medium pt-1 border-t border-slate-100">
                <span className="text-slate-700">Total Overhead</span>
                <span className="text-red-600">({formatCurrency(annualOverhead)})</span>
              </div>
            </div>

            {/* Net Profit */}
            <div className={`flex justify-between items-center py-3 px-4 rounded-lg ${isProfit ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <span className={`font-bold ${isProfit ? 'text-emerald-800' : 'text-red-800'}`}>Net Profit</span>
              <div className="text-right">
                <span className={`text-xl font-bold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(netProfit)}
                </span>
                <span className={`text-sm ml-2 ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                  ({formatPercent(netMarginPercent)})
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Break-Even Analysis */}
        <SectionCard title="Break-Even Analysis" subtitle="Revenue needed to cover costs">
          <div className="space-y-6">
            {/* Break-Even Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">
                  {formatCurrency(breakEvenDaily)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Daily</div>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                <div className="text-2xl font-bold text-amber-700">
                  {formatCurrency(breakEvenMonthly)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Monthly</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-800">
                  {formatCurrency(breakEvenAnnual)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Annual</div>
              </div>
            </div>

            {/* Revenue vs Break-Even */}
            <div className={`p-4 rounded-lg ${revenueVsBreakEven >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {revenueVsBreakEven >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${revenueVsBreakEven >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                  {revenueVsBreakEven >= 0 ? 'Above Break-Even' : 'Below Break-Even'}
                </span>
              </div>
              <div className={`text-2xl font-bold ${revenueVsBreakEven >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {revenueVsBreakEven >= 0 ? '+' : ''}{formatCurrency(revenueVsBreakEven)}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {revenueVsBreakEven >= 0
                  ? 'Projected profit margin above break-even'
                  : 'Additional revenue needed to reach break-even'}
              </div>
            </div>

            {/* Per-Tech Metrics */}
            {techCount > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-blue-800 mb-3">Revenue Per Technician</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(revenuePerTechAnnual)}
                    </div>
                    <div className="text-xs text-slate-500">Annual target</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(revenuePerTechMonthly)}
                    </div>
                    <div className="text-xs text-slate-500">Monthly target</div>
                  </div>
                </div>
                <div className="text-xs text-blue-600 mt-3">
                  Based on {techCount} active technician{techCount !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Visual P&L Breakdown */}
      <SectionCard title="Revenue Allocation" subtitle="Where your money goes">
        <div className="relative h-12 rounded-lg overflow-hidden flex">
          {/* Materials */}
          <div
            className="bg-red-400 flex items-center justify-center text-white text-xs font-medium"
            style={{ width: `${(materialsCost / projectedRevenue) * 100}%` }}
          >
            {(materialsCost / projectedRevenue) * 100 > 10 && 'Materials'}
          </div>
          {/* Labor */}
          <div
            className="bg-amber-400 flex items-center justify-center text-white text-xs font-medium"
            style={{ width: `${(totalTechCostAnnual / projectedRevenue) * 100}%` }}
          >
            {(totalTechCostAnnual / projectedRevenue) * 100 > 10 && 'Labor'}
          </div>
          {/* Overhead */}
          <div
            className="bg-orange-400 flex items-center justify-center text-white text-xs font-medium"
            style={{ width: `${(annualOverhead / projectedRevenue) * 100}%` }}
          >
            {(annualOverhead / projectedRevenue) * 100 > 10 && 'Overhead'}
          </div>
          {/* Profit */}
          <div
            className={`${isProfit ? 'bg-emerald-500' : 'bg-slate-300'} flex items-center justify-center text-white text-xs font-medium`}
            style={{ width: `${Math.max(0, (netProfit / projectedRevenue) * 100)}%` }}
          >
            {(netProfit / projectedRevenue) * 100 > 10 && 'Profit'}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-400" />
            <span className="text-slate-600">Materials ({formatPercent((materialsCost / projectedRevenue) * 100)})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-400" />
            <span className="text-slate-600">Labor ({formatPercent((totalTechCostAnnual / projectedRevenue) * 100)})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-400" />
            <span className="text-slate-600">Overhead ({formatPercent((annualOverhead / projectedRevenue) * 100)})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${isProfit ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span className="text-slate-600">Net Profit ({formatPercent(netMarginPercent)})</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
