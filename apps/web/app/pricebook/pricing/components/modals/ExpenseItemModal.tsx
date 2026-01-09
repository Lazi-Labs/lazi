'use client';

import { useState, useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ExpenseItem, ExpenseItemFormData, ExpenseCategory } from '../../lib/types';
import { calcExpenseMonthly } from '../../lib/calculations';

interface ExpenseItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExpenseItemFormData) => void;
  expense?: ExpenseItem | null;
  categories?: ExpenseCategory[];
  selectedCategoryId?: string;
  isLoading?: boolean;
}

const frequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'one_time', label: 'One-time' },
];

const defaultFormData: ExpenseItemFormData = {
  name: '',
  category_id: '',
  amount: 0,
  frequency: 'monthly',
  vendor: '',
};

export default function ExpenseItemModal({
  isOpen,
  onClose,
  onSave,
  expense,
  categories = [],
  selectedCategoryId,
  isLoading = false,
}: ExpenseItemModalProps) {
  const [formData, setFormData] = useState<ExpenseItemFormData>(defaultFormData);

  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name,
        category_id: expense.category_id,
        amount: expense.amount,
        frequency: expense.frequency,
        vendor: expense.vendor || '',
      });
    } else {
      setFormData({
        ...defaultFormData,
        category_id: selectedCategoryId || '',
      });
    }
  }, [expense, selectedCategoryId, isOpen]);

  const handleChange = (field: keyof ExpenseItemFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isEditing = !!expense;

  const getMonthlyEquivalent = () => {
    const mockItem = {
      ...formData,
      id: '',
    } as ExpenseItem;
    return calcExpenseMonthly(mockItem);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {isEditing ? 'Edit Expense' : 'Add Expense'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Expense Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Office Rent, Software Subscription"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Category *</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => handleChange('category_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => handleChange('frequency', value as ExpenseItem['frequency'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor (Optional)</Label>
            <Input
              id="vendor"
              value={formData.vendor}
              onChange={(e) => handleChange('vendor', e.target.value)}
              placeholder="e.g., Company name"
            />
          </div>

          {/* Monthly Equivalent */}
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-800">Monthly Equivalent</span>
              <span className="font-bold text-orange-600">
                ${getMonthlyEquivalent().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-xs text-orange-600 mt-1">
              Annual: ${(getMonthlyEquivalent() * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.category_id}>
              {isLoading ? 'Saving...' : isEditing ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
