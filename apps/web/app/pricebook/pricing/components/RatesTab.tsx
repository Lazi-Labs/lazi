'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Calculator, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import SectionCard from './shared/SectionCard';
import MetricCard from './shared/MetricCard';
import { JobTypeModal, MarkupTierModal } from './modals';
import {
  formatCurrency,
  formatPercent,
  calcHourlyRate,
  calcMarkupFromMargin,
  calcMultiplierFromMargin,
  calcMaterialSellPrice,
} from '../lib/calculations';
import type { PricingDataResponse, CalculationResults, JobType, MarkupTier, JobTypeFormData, MarkupTierFormData } from '../lib/types';

interface RatesTabProps {
  data: PricingDataResponse;
  calculations: CalculationResults | null;
  onCreateJobType?: (data: JobTypeFormData) => void;
  onUpdateJobType?: (id: string, data: JobTypeFormData) => void;
  onDeleteJobType?: (id: string) => void;
  onCreateMarkupTier?: (data: MarkupTierFormData) => void;
  onUpdateMarkupTier?: (id: string, data: MarkupTierFormData) => void;
  onDeleteMarkupTier?: (id: string) => void;
  isLoading?: boolean;
}

const gradients = [
  'from-sky-500 to-cyan-500',
  'from-violet-500 to-purple-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-blue-500 to-indigo-500',
];

export default function RatesTab({
  data,
  calculations,
  onCreateJobType,
  onUpdateJobType,
  onDeleteJobType,
  onCreateMarkupTier,
  onUpdateMarkupTier,
  onDeleteMarkupTier,
  isLoading = false,
}: RatesTabProps) {
  const [materialCost, setMaterialCost] = useState<string>('');
  const [jobTypeModalOpen, setJobTypeModalOpen] = useState(false);
  const [markupTierModalOpen, setMarkupTierModalOpen] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState<JobType | null>(null);
  const [selectedMarkupTier, setSelectedMarkupTier] = useState<MarkupTier | null>(null);

  const jobTypes = data.jobTypes || [];
  const markupTiers = data.markupTiers || [];
  const loadedCost = calculations?.avgLoadedCostPerHour || 0;

  // Job Type modal handlers
  const handleAddJobType = () => {
    setSelectedJobType(null);
    setJobTypeModalOpen(true);
  };

  const handleEditJobType = (jobType: JobType) => {
    setSelectedJobType(jobType);
    setJobTypeModalOpen(true);
  };

  const handleSaveJobType = (formData: JobTypeFormData) => {
    if (selectedJobType) {
      onUpdateJobType?.(selectedJobType.id, formData);
    } else {
      onCreateJobType?.(formData);
    }
    setJobTypeModalOpen(false);
    setSelectedJobType(null);
  };

  // Markup Tier modal handlers
  const handleAddMarkupTier = () => {
    setSelectedMarkupTier(null);
    setMarkupTierModalOpen(true);
  };

  const handleEditMarkupTier = (tier: MarkupTier) => {
    setSelectedMarkupTier(tier);
    setMarkupTierModalOpen(true);
  };

  const handleSaveMarkupTier = (formData: MarkupTierFormData) => {
    if (selectedMarkupTier) {
      onUpdateMarkupTier?.(selectedMarkupTier.id, formData);
    } else {
      onCreateMarkupTier?.(formData);
    }
    setMarkupTierModalOpen(false);
    setSelectedMarkupTier(null);
  };

  // Calculate material sell price
  const materialCostNum = parseFloat(materialCost) || 0;
  const materialResult = materialCostNum > 0
    ? calcMaterialSellPrice(materialCostNum, markupTiers)
    : null;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Job Types"
          value={jobTypes.length}
          subtitle="Rate cards configured"
          icon={Calculator}
        />
        <MetricCard
          label="Markup Tiers"
          value={markupTiers.length}
          subtitle="Material markup levels"
          icon={DollarSign}
        />
        <MetricCard
          label="Loaded Cost/Hr"
          value={formatCurrency(loadedCost, 2)}
          subtitle="Base for rate calculation"
          icon={DollarSign}
        />
        <MetricCard
          label="Avg Hourly Rate"
          value={formatCurrency(
            jobTypes.length > 0
              ? jobTypes.reduce((sum, jt) => sum + calcHourlyRate(loadedCost, jt.target_gross_margin), 0) / jobTypes.length
              : 0,
            2
          )}
          subtitle="Across all job types"
          icon={DollarSign}
          valueClassName="text-emerald-600"
        />
      </div>

      {/* Job Type Rate Cards */}
      <SectionCard
        title="Job Type Rate Cards"
        subtitle="Hourly rates by job type based on target margins"
        headerActions={
          <Button size="sm" className="gap-1" onClick={handleAddJobType}>
            <Plus className="h-4 w-4" />
            Add Job Type
          </Button>
        }
      >
        {jobTypes.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No job types configured. Add your first job type to see calculated rates.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobTypes.map((jobType, index) => {
              const hourlyRate = calcHourlyRate(loadedCost, jobType.target_gross_margin);
              const memberRate = hourlyRate * (1 - jobType.member_discount_percent / 100);
              const minInvoice = hourlyRate * jobType.min_hours + (jobType.flat_surcharge || 0);
              const gradient = gradients[index % gradients.length];

              return (
                <div
                  key={jobType.id}
                  className="border border-slate-200 rounded-xl overflow-hidden"
                >
                  {/* Gradient Header */}
                  <div className={`bg-gradient-to-r ${gradient} p-4 text-white`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{jobType.name}</div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
                          onClick={() => handleEditJobType(jobType)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/80 hover:text-white hover:bg-red-500/30"
                          onClick={() => onDeleteJobType?.(jobType.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-3xl font-bold">
                      {formatCurrency(hourlyRate, 2)}
                      <span className="text-lg font-normal opacity-80">/hr</span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Target Margin</div>
                        <div className="font-semibold text-emerald-600">
                          {formatPercent(jobType.target_gross_margin)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Member Discount</div>
                        <div className="font-semibold">
                          {formatPercent(jobType.member_discount_percent)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Member Rate</div>
                        <div className="font-semibold text-blue-600">
                          {formatCurrency(memberRate, 2)}/hr
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Min Invoice</div>
                        <div className="font-semibold">
                          {formatCurrency(minInvoice)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Material Margin</span>
                        <span className="font-medium">{formatPercent(jobType.material_gross_margin)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Surcharge</span>
                        <span className="font-medium">{formatCurrency(jobType.flat_surcharge || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Material Markup Tiers */}
      <SectionCard
        title="Material Markup Tiers"
        subtitle="Tiered markup based on material cost"
        headerActions={
          <Button size="sm" variant="outline" className="gap-1" onClick={handleAddMarkupTier}>
            <Plus className="h-4 w-4" />
            Add Tier
          </Button>
        }
      >
        {markupTiers.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No markup tiers configured. Add tiers to calculate material sell prices.
          </div>
        ) : (
          <>
            {/* Tiers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Cost Range</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600">Gross Margin</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600">Markup %</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600">Multiplier</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {markupTiers.map((tier) => {
                    const markupPercent = calcMarkupFromMargin(tier.gross_margin_percent);
                    const multiplier = calcMultiplierFromMargin(tier.gross_margin_percent);

                    return (
                      <tr key={tier.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-3">
                          {formatCurrency(tier.min_cost)} - {formatCurrency(tier.max_cost)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {formatPercent(tier.gross_margin_percent)}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center font-medium">
                          {formatPercent(markupPercent)}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-violet-600">
                          ×{multiplier.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditMarkupTier(tier)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => onDeleteMarkupTier?.(tier.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Material Price Calculator */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <div className="text-sm font-medium text-slate-700 mb-3">Material Price Calculator</div>
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <label className="text-xs text-slate-500 mb-1 block">Enter Material Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <Input
                      type="number"
                      value={materialCost}
                      onChange={(e) => setMaterialCost(e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>
                {materialResult && (
                  <>
                    <div className="text-2xl text-slate-300">→</div>
                    <div className="flex-1">
                      <div className="text-xs text-slate-500 mb-1">Sell Price</div>
                      <div className="text-2xl font-bold text-emerald-600">
                        {formatCurrency(materialResult.sellPrice, 2)}
                      </div>
                      {materialResult.tier && (
                        <div className="text-xs text-slate-500 mt-1">
                          Using {formatPercent(materialResult.tier.gross_margin_percent)} margin tier
                          (Gross Profit: {formatCurrency(materialResult.grossMargin, 2)})
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* Modals */}
      <JobTypeModal
        isOpen={jobTypeModalOpen}
        onClose={() => { setJobTypeModalOpen(false); setSelectedJobType(null); }}
        onSave={handleSaveJobType}
        jobType={selectedJobType}
        loadedCost={loadedCost}
        isLoading={isLoading}
      />

      <MarkupTierModal
        isOpen={markupTierModalOpen}
        onClose={() => { setMarkupTierModalOpen(false); setSelectedMarkupTier(null); }}
        onSave={handleSaveMarkupTier}
        tier={selectedMarkupTier}
        isLoading={isLoading}
      />
    </div>
  );
}
