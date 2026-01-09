'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Percent, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MarkupTier, MarkupTierFormData } from '../../lib/types';
import { calcMarkupFromMargin, calcMultiplierFromMargin, formatCurrency, formatPercent } from '../../lib/calculations';

interface MarkupTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MarkupTierFormData) => void;
  tier?: MarkupTier | null;
  isLoading?: boolean;
}

const defaultFormData: MarkupTierFormData = {
  min_cost: 0,
  max_cost: 100,
  gross_margin_percent: 50,
};

export default function MarkupTierModal({
  isOpen,
  onClose,
  onSave,
  tier,
  isLoading = false,
}: MarkupTierModalProps) {
  const [formData, setFormData] = useState<MarkupTierFormData>(defaultFormData);
  const [testCost, setTestCost] = useState<string>('');

  useEffect(() => {
    if (tier) {
      setFormData({
        min_cost: tier.min_cost,
        max_cost: tier.max_cost,
        gross_margin_percent: tier.gross_margin_percent,
      });
    } else {
      setFormData(defaultFormData);
    }
    setTestCost('');
  }, [tier, isOpen]);

  const handleChange = (field: keyof MarkupTierFormData, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isEditing = !!tier;

  // Calculations
  const markupPercent = calcMarkupFromMargin(formData.gross_margin_percent);
  const multiplier = calcMultiplierFromMargin(formData.gross_margin_percent);

  // Test calculation
  const testCostNum = parseFloat(testCost) || 0;
  const testSellPrice = testCostNum > 0 ? testCostNum * multiplier : 0;
  const testGrossProfit = testSellPrice - testCostNum;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            {isEditing ? 'Edit Markup Tier' : 'Add Markup Tier'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cost Range */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-slate-700 font-medium mb-4">
              <DollarSign className="h-4 w-4" />
              Cost Range
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_cost">Minimum Cost ($)</Label>
                <Input
                  id="min_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.min_cost}
                  onChange={(e) => handleChange('min_cost', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_cost">Maximum Cost ($)</Label>
                <Input
                  id="max_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.max_cost}
                  onChange={(e) => handleChange('max_cost', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              This tier applies to materials costing between {formatCurrency(formData.min_cost)} and {formatCurrency(formData.max_cost)}
            </div>
          </div>

          {/* Margin Settings */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-700 font-medium mb-4">
              <Percent className="h-4 w-4" />
              Margin Settings
            </div>
            <div className="space-y-2">
              <Label htmlFor="gross_margin_percent">Gross Margin (%)</Label>
              <Input
                id="gross_margin_percent"
                type="number"
                min="0"
                max="99"
                step="0.5"
                value={formData.gross_margin_percent}
                onChange={(e) => handleChange('gross_margin_percent', parseFloat(e.target.value) || 0)}
              />
              <div className="text-xs text-emerald-600">
                Margin = (Sell Price - Cost) / Sell Price
              </div>
            </div>

            {/* Calculated Values */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded border border-emerald-100">
                <div className="text-xs text-slate-500 mb-1">Markup %</div>
                <div className="text-lg font-semibold text-emerald-600">
                  {formatPercent(markupPercent)}
                </div>
                <div className="text-xs text-slate-400">
                  Added to cost
                </div>
              </div>
              <div className="p-3 bg-white rounded border border-emerald-100">
                <div className="text-xs text-slate-500 mb-1">Multiplier</div>
                <div className="text-lg font-semibold text-emerald-600">
                  ×{multiplier.toFixed(3)}
                </div>
                <div className="text-xs text-slate-400">
                  Cost × multiplier = sell price
                </div>
              </div>
            </div>
          </div>

          {/* Test Calculator */}
          <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
            <div className="flex items-center gap-2 text-violet-700 font-medium mb-4">
              <Calculator className="h-4 w-4" />
              Test This Tier
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="test_cost">Enter Material Cost ($)</Label>
                <Input
                  id="test_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={testCost}
                  onChange={(e) => setTestCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {testCostNum > 0 && (
                <div className="p-3 bg-white rounded border border-violet-100">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-xs text-slate-500">Cost</div>
                      <div className="font-medium">{formatCurrency(testCostNum, 2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Sell Price</div>
                      <div className="font-semibold text-violet-600">{formatCurrency(testSellPrice, 2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Gross Profit</div>
                      <div className="font-semibold text-emerald-600">{formatCurrency(testGrossProfit, 2)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Update Tier' : 'Add Tier'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
