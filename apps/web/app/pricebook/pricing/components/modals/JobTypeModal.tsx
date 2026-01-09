'use client';

import { useState, useEffect } from 'react';
import { Calculator, DollarSign, Target, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { JobType, JobTypeFormData } from '../../lib/types';
import { calcHourlyRate, formatCurrency, formatPercent } from '../../lib/calculations';

interface JobTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: JobTypeFormData) => void;
  jobType?: JobType | null;
  loadedCost?: number;
  isLoading?: boolean;
}

const defaultFormData: JobTypeFormData = {
  name: '',
  target_gross_margin: 55,
  material_gross_margin: 40,
  member_discount_percent: 15,
  min_hours: 1,
  max_hours: 8,
  flat_surcharge: 0,
  color: '#3b82f6',
};

export default function JobTypeModal({
  isOpen,
  onClose,
  onSave,
  jobType,
  loadedCost = 0,
  isLoading = false,
}: JobTypeModalProps) {
  const [formData, setFormData] = useState<JobTypeFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('margins');

  useEffect(() => {
    if (jobType) {
      setFormData({
        name: jobType.name,
        target_gross_margin: jobType.target_gross_margin,
        material_gross_margin: jobType.material_gross_margin,
        member_discount_percent: jobType.member_discount_percent,
        min_hours: jobType.min_hours,
        max_hours: jobType.max_hours ?? 8,
        flat_surcharge: jobType.flat_surcharge || 0,
        color: jobType.color || '#3b82f6',
      });
    } else {
      setFormData(defaultFormData);
    }
    setActiveTab('margins');
  }, [jobType, isOpen]);

  const handleChange = (field: keyof JobTypeFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isEditing = !!jobType;

  // Calculations for preview
  const hourlyRate = calcHourlyRate(loadedCost, formData.target_gross_margin);
  const memberRate = hourlyRate * (1 - (formData.member_discount_percent || 0) / 100);
  const minInvoice = hourlyRate * (formData.min_hours || 1) + (formData.flat_surcharge || 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {isEditing ? 'Edit Job Type' : 'Add Job Type'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="margins">Margins</TabsTrigger>
              <TabsTrigger value="member">Member Pricing</TabsTrigger>
              <TabsTrigger value="minimums">Minimums</TabsTrigger>
            </TabsList>

            {/* Margins Tab */}
            <TabsContent value="margins" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Job Type Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Repair, Install, Maintenance"
                  required
                />
              </div>

              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-800 font-medium mb-4">
                  <Target className="h-4 w-4" />
                  Target Margins
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target_gross_margin">Labor Gross Margin (%)</Label>
                    <Input
                      id="target_gross_margin"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.target_gross_margin}
                      onChange={(e) => handleChange('target_gross_margin', parseFloat(e.target.value) || 0)}
                    />
                    <div className="text-xs text-emerald-600">
                      Higher margin = higher hourly rate
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="material_gross_margin">Material Gross Margin (%)</Label>
                    <Input
                      id="material_gross_margin"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.material_gross_margin}
                      onChange={(e) => handleChange('material_gross_margin', parseFloat(e.target.value) || 0)}
                    />
                    <div className="text-xs text-emerald-600">
                      Applied to materials on this job type
                    </div>
                  </div>
                </div>
              </div>

              {/* Rate Preview */}
              {loadedCost > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-medium text-blue-800 mb-3">Rate Calculation Preview</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-600">Loaded Cost/Hr:</span>
                      <span className="ml-2 font-medium">{formatCurrency(loadedCost, 2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600">Target Margin:</span>
                      <span className="ml-2 font-medium">{formatPercent(formData.target_gross_margin)}</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-800 font-medium">Calculated Hourly Rate:</span>
                      <span className="text-2xl font-bold text-blue-600">{formatCurrency(hourlyRate, 2)}/hr</span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Member Pricing Tab */}
            <TabsContent value="member" className="space-y-4 mt-4">
              <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
                <div className="flex items-center gap-2 text-violet-800 font-medium mb-4">
                  <Users className="h-4 w-4" />
                  Member Program Pricing
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member_discount_percent">Member Discount (%)</Label>
                  <Input
                    id="member_discount_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.member_discount_percent}
                    onChange={(e) => handleChange('member_discount_percent', parseFloat(e.target.value) || 0)}
                  />
                  <div className="text-xs text-violet-600">
                    Discount applied to member customers
                  </div>
                </div>
              </div>

              {loadedCost > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-sm font-medium text-slate-700 mb-3">Member Rate Preview</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded border">
                      <div className="text-xs text-slate-500 mb-1">Standard Rate</div>
                      <div className="text-lg font-semibold">{formatCurrency(hourlyRate, 2)}/hr</div>
                    </div>
                    <div className="p-3 bg-violet-100 rounded border border-violet-200">
                      <div className="text-xs text-violet-600 mb-1">Member Rate</div>
                      <div className="text-lg font-semibold text-violet-700">{formatCurrency(memberRate, 2)}/hr</div>
                      <div className="text-xs text-violet-500">
                        Saves {formatCurrency(hourlyRate - memberRate, 2)}/hr
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Minimums Tab */}
            <TabsContent value="minimums" className="space-y-4 mt-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 text-amber-800 font-medium mb-4">
                  <DollarSign className="h-4 w-4" />
                  Invoice Minimums
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_hours">Minimum Hours</Label>
                    <Input
                      id="min_hours"
                      type="number"
                      min="0"
                      step="0.25"
                      value={formData.min_hours}
                      onChange={(e) => handleChange('min_hours', parseFloat(e.target.value) || 0)}
                    />
                    <div className="text-xs text-amber-600">
                      Minimum hours billed per call
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="flat_surcharge">Flat Surcharge ($)</Label>
                    <Input
                      id="flat_surcharge"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.flat_surcharge}
                      onChange={(e) => handleChange('flat_surcharge', parseFloat(e.target.value) || 0)}
                    />
                    <div className="text-xs text-amber-600">
                      Added to every job (dispatch fee, etc.)
                    </div>
                  </div>
                </div>
              </div>

              {loadedCost > 0 && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-sm font-medium text-slate-700 mb-3">Minimum Invoice Preview</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Minimum Hours</span>
                      <span>{formData.min_hours} hrs × {formatCurrency(hourlyRate, 2)} = {formatCurrency(hourlyRate * (formData.min_hours || 0), 2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Flat Surcharge</span>
                      <span>+ {formatCurrency(formData.flat_surcharge || 0, 2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 font-medium">
                      <span className="text-slate-800">Minimum Invoice</span>
                      <span className="text-lg text-amber-600">{formatCurrency(minInvoice, 2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Update Job Type' : 'Add Job Type'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
