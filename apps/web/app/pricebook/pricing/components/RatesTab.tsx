'use client';

import { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Calculator, DollarSign, Truck, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MetricCard from './shared/MetricCard';
import { JobTypeModal, MarkupTierModal } from './modals';
import {
  formatCurrency,
  formatPercent,
  calcHourlyRate,
  calcMarkupFromMargin,
  calcMultiplierFromMargin,
} from '../lib/calculations';
import type {
  PricingDataResponse,
  CalculationResults,
  JobType,
  MarkupTier,
  JobTypeFormData,
  MarkupTierFormData,
} from '../lib/types';

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
  'from-sky-400 to-cyan-500',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
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
  const [materialCost, setMaterialCost] = useState<string>('25');
  const [jobTypeModalOpen, setJobTypeModalOpen] = useState(false);
  const [markupTierModalOpen, setMarkupTierModalOpen] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState<JobType | null>(null);
  const [selectedMarkupTier, setSelectedMarkupTier] = useState<MarkupTier | null>(null);

  // Local state for real-time editing
  const [localJobTypeValues, setLocalJobTypeValues] = useState<
    Record<string, Partial<JobType>>
  >({});
  const [localMarkupValues, setLocalMarkupValues] = useState<
    Record<string, number>
  >({});

  const jobTypes = data.jobTypes || [];
  const markupTiers = data.markupTiers || [];
  const loadedCost = calculations?.avgLoadedCostPerHour || 0;
  const trueCost = calculations?.avgTrueCostPerHour || 0;
  const fleetCost = calculations?.fleetCostPerHour || 0;
  const overheadCost = calculations?.overheadPerHour || 0;

  // Get effective value (local override or original)
  const getJobTypeValue = useCallback(
    (jobType: JobType, field: keyof JobType) => {
      const localValue = localJobTypeValues[jobType.id]?.[field];
      return localValue !== undefined ? localValue : jobType[field];
    },
    [localJobTypeValues]
  );

  // Handle job type field change
  const handleJobTypeFieldChange = useCallback(
    (jobTypeId: string, field: keyof JobType, value: number) => {
      setLocalJobTypeValues((prev) => ({
        ...prev,
        [jobTypeId]: {
          ...prev[jobTypeId],
          [field]: value,
        },
      }));
    },
    []
  );

  // Handle markup tier change
  const handleMarkupChange = useCallback((tierId: string, value: number) => {
    setLocalMarkupValues((prev) => ({
      ...prev,
      [tierId]: value,
    }));
  }, []);

  // Get effective markup value
  const getMarkupValue = useCallback(
    (tier: MarkupTier) => {
      return localMarkupValues[tier.id] ?? tier.gross_margin_percent;
    },
    [localMarkupValues]
  );

  // Calculate material sell price
  const materialCostNum = parseFloat(materialCost) || 0;
  const applicableTier = markupTiers.find(
    (t) => materialCostNum >= t.min_cost && materialCostNum < t.max_cost
  );
  const tierMargin = applicableTier ? getMarkupValue(applicableTier) : 0;
  const multiplier = tierMargin < 100 ? 1 / (1 - tierMargin / 100) : 1;
  const sellPrice = materialCostNum * multiplier;
  const profit = sellPrice - materialCostNum;

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

  const handleSaveMarkupTier = (formData: MarkupTierFormData) => {
    if (selectedMarkupTier) {
      onUpdateMarkupTier?.(selectedMarkupTier.id, formData);
    } else {
      onCreateMarkupTier?.(formData);
    }
    setMarkupTierModalOpen(false);
    setSelectedMarkupTier(null);
  };

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Loaded Cost/Hr"
          value={formatCurrency(loadedCost, 2)}
          subtitle="Base for rate calculation"
          icon={Calculator}
        />
        <MetricCard
          label="Avg. True Cost/Hr"
          value={formatCurrency(trueCost, 2)}
          subtitle="Labor cost only"
          icon={DollarSign}
        />
        <MetricCard
          label="Fleet/Hr"
          value={formatCurrency(fleetCost, 2)}
          subtitle="Vehicle allocation"
          icon={Truck}
        />
        <MetricCard
          label="Overhead/Hr"
          value={formatCurrency(overheadCost, 2)}
          subtitle="Fixed cost allocation"
          icon={Receipt}
        />
      </div>

      {/* Job Type Rate Cards - Full Width Stacked */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Job Type Rate Cards</h3>
          <p className="text-sm text-slate-500">Edit margins and see calculated rates in real-time</p>
        </div>
        <div className="p-4 space-y-6">
          {jobTypes.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No job types configured. Click "Add Job Type" to get started.
            </div>
          ) : (
            jobTypes.map((jobType, index) => {
              const targetMargin = getJobTypeValue(jobType, 'target_gross_margin') as number;
              const memberDiscount = getJobTypeValue(jobType, 'member_discount_percent') as number;
              const materialMargin = getJobTypeValue(jobType, 'material_gross_margin') as number;
              const surcharge = (getJobTypeValue(jobType, 'flat_surcharge') as number) || 0;
              const minHours = jobType.min_hours || 1;
              const maxHours = jobType.max_hours || minHours + 2;

              const hourlyRate = calcHourlyRate(loadedCost, targetMargin);
              const memberRate = hourlyRate * (1 - memberDiscount / 100);
              const minInvoice = hourlyRate * minHours + surcharge;
              const gradient = gradients[index % gradients.length];

              return (
                <div
                  key={jobType.id}
                  className="rounded-xl overflow-hidden border border-slate-200 shadow-sm"
                >
                  {/* Gradient Header */}
                  <div className={`bg-gradient-to-r ${gradient} text-white p-4`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{jobType.name}</h4>
                        <p className="text-white/80 text-sm">
                          {minHours}-{maxHours} Hours
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{formatCurrency(hourlyRate, 2)}</div>
                        <div className="text-white/80 text-sm">per hour</div>
                      </div>
                    </div>
                  </div>

                  {/* Editable Fields */}
                  <div className="p-4 bg-slate-50">
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      {/* Target Margin */}
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Target Margin</label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            max="99"
                            value={targetMargin}
                            onChange={(e) =>
                              handleJobTypeFieldChange(
                                jobType.id,
                                'target_gross_margin',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="pr-8 text-lg font-medium"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            %
                          </span>
                        </div>
                      </div>

                      {/* Member Discount */}
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Member Discount</label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            max="50"
                            value={memberDiscount}
                            onChange={(e) =>
                              handleJobTypeFieldChange(
                                jobType.id,
                                'member_discount_percent',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="pr-8 text-lg font-medium"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            %
                          </span>
                        </div>
                      </div>

                      {/* Material Margin */}
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Material Margin</label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            max="90"
                            value={materialMargin}
                            onChange={(e) =>
                              handleJobTypeFieldChange(
                                jobType.id,
                                'material_gross_margin',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="pr-8 text-lg font-medium"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            %
                          </span>
                        </div>
                      </div>

                      {/* Surcharge */}
                      <div>
                        <label className="block text-sm text-slate-600 mb-1">Surcharge</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            $
                          </span>
                          <Input
                            type="number"
                            step="5"
                            min="0"
                            value={surcharge}
                            onChange={(e) =>
                              handleJobTypeFieldChange(
                                jobType.id,
                                'flat_surcharge',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="pl-8 text-lg font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Calculated Values */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-sm text-slate-500">Member Rate</div>
                        <div className="text-xl font-bold text-emerald-600">
                          {formatCurrency(memberRate, 2)}
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="text-sm text-slate-500">Min Invoice</div>
                        <div className="text-xl font-bold">{formatCurrency(minInvoice, 2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Material Markup Tiers */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-slate-800">Material Markup Tiers</h3>
            <p className="text-sm text-slate-500">Tiered markup structure for materials/parts</p>
          </div>
          <Button size="sm" className="gap-1" onClick={handleAddMarkupTier}>
            <Plus className="h-4 w-4" />
            Add Tier
          </Button>
        </div>
        <div className="p-4">
          {markupTiers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No markup tiers configured. Add tiers to calculate material sell prices.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">Cost Range</th>
                  <th className="px-4 py-3 text-right">Gross Margin</th>
                  <th className="px-4 py-3 text-right">Markup %</th>
                  <th className="px-4 py-3 text-right">Multiplier</th>
                  <th className="px-4 py-3 text-right">$10 → Sell</th>
                  <th className="px-4 py-3 text-right">$100 → Sell</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {markupTiers.map((tier) => {
                  const margin = getMarkupValue(tier);
                  const markup = calcMarkupFromMargin(margin);
                  const mult = calcMultiplierFromMargin(margin);

                  return (
                    <tr key={tier.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {formatCurrency(tier.min_cost)} -{' '}
                        {tier.max_cost >= 999999 ? '∞' : formatCurrency(tier.max_cost)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center">
                          <Input
                            type="number"
                            value={margin}
                            min={1}
                            max={99}
                            step={1}
                            onChange={(e) =>
                              handleMarkupChange(tier.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 px-2 py-1 text-right h-8"
                          />
                          <span className="ml-1">%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                        {formatPercent(markup, 0)}
                      </td>
                      <td className="px-4 py-3 text-right">{mult.toFixed(2)}×</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(10 * mult, 2)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(100 * mult, 2)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-100"
                          onClick={() => onDeleteMarkupTier?.(tier.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Material Price Calculator */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <h4 className="font-medium text-slate-700 mb-3">Material Price Calculator</h4>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm text-slate-600">Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  type="number"
                  value={materialCost}
                  step="0.01"
                  min="0"
                  onChange={(e) => setMaterialCost(e.target.value)}
                  className="w-32 pl-8"
                />
              </div>
            </div>
            <div className="text-2xl text-slate-400">→</div>
            <div>
              <label className="text-sm text-slate-600">Sell Price</label>
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(sellPrice, 2)}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-600">Margin</label>
              <div className="text-lg font-medium text-slate-700">
                {applicableTier ? `${tierMargin}%` : 'N/A'}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-600">Profit</label>
              <div className="text-lg font-medium text-emerald-600">
                {formatCurrency(profit, 2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <JobTypeModal
        isOpen={jobTypeModalOpen}
        onClose={() => {
          setJobTypeModalOpen(false);
          setSelectedJobType(null);
        }}
        onSave={handleSaveJobType}
        jobType={selectedJobType}
        loadedCost={loadedCost}
        isLoading={isLoading}
      />

      <MarkupTierModal
        isOpen={markupTierModalOpen}
        onClose={() => {
          setMarkupTierModalOpen(false);
          setSelectedMarkupTier(null);
        }}
        onSave={handleSaveMarkupTier}
        tier={selectedMarkupTier}
        isLoading={isLoading}
      />
    </div>
  );
}
