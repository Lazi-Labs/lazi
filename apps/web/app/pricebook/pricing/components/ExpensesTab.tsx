'use client';

import { useState } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Building2,
  Shield,
  Laptop,
  Megaphone,
  Calculator,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SectionCard from './shared/SectionCard';
import MetricCard from './shared/MetricCard';
import { ExpenseItemModal } from './modals';
import { formatCurrency, calcExpenseMonthly } from '../lib/calculations';
import type { PricingDataResponse, CalculationResults, ExpenseCategory, ExpenseItem, ExpenseItemFormData } from '../lib/types';

interface ExpensesTabProps {
  data: PricingDataResponse;
  calculations: CalculationResults | null;
  onCreateExpense?: (data: ExpenseItemFormData) => void;
  onUpdateExpense?: (id: string, data: ExpenseItemFormData) => void;
  onDeleteExpense?: (id: string) => void;
  isLoading?: boolean;
}

const iconMap: Record<string, any> = {
  Building2,
  Shield,
  Laptop,
  Megaphone,
  Calculator,
  Receipt,
};

const frequencyLabels: Record<string, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
  quarterly: 'Quarterly',
  weekly: 'Weekly',
  one_time: 'One-time',
};

export default function ExpensesTab({
  data,
  calculations,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
  isLoading = false,
}: ExpensesTabProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);

  const toggleCategory = (id: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedCategories(newSet);
  };

  const categories = data.expenseCategories || [];

  const getCategoryMonthlyTotal = (category: ExpenseCategory) => {
    return (category.items || []).reduce((sum, item) => sum + calcExpenseMonthly(item), 0);
  };

  // Modal handlers
  const handleAddExpense = (categoryId?: string) => {
    setSelectedExpense(null);
    setSelectedCategoryId(categoryId);
    setModalOpen(true);
  };

  const handleEditExpense = (expense: ExpenseItem) => {
    setSelectedExpense(expense);
    setSelectedCategoryId(expense.category_id);
    setModalOpen(true);
  };

  const handleSaveExpense = (formData: ExpenseItemFormData) => {
    if (selectedExpense) {
      onUpdateExpense?.(selectedExpense.id, formData);
    } else {
      onCreateExpense?.(formData);
    }
    setModalOpen(false);
    setSelectedExpense(null);
    setSelectedCategoryId(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Categories"
          value={categories.length}
          subtitle="Expense groups"
          icon={Receipt}
        />
        <MetricCard
          label="Total Items"
          value={categories.reduce((sum, cat) => sum + (cat.items?.length || 0), 0)}
          subtitle="Line items"
          icon={Receipt}
        />
        <MetricCard
          label="Monthly Expenses"
          value={formatCurrency(calculations?.monthlyExpenses || 0)}
          subtitle="Recurring overhead"
          icon={Receipt}
        />
        <MetricCard
          label="Cost/Billable Hour"
          value={formatCurrency(calculations?.overheadPerHour || 0, 2)}
          subtitle="Including office staff"
          icon={Receipt}
          valueClassName="text-orange-600"
        />
      </div>

      {/* Expense Categories */}
      <SectionCard
        title="Expense Categories"
        subtitle="Manage your operating expenses"
        headerActions={
          <Button size="sm" className="gap-1" onClick={() => handleAddExpense()}>
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        }
      >
        {categories.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No expense categories found. Add your first expense to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => {
              const Icon = iconMap[category.icon] || Receipt;
              const isExpanded = expandedCategories.has(category.id);
              const monthlyTotal = getCategoryMonthlyTotal(category);
              const items = category.items || [];

              return (
                <div
                  key={category.id}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  {/* Category Header */}
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: category.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800">{category.name}</div>
                      <div className="text-xs text-slate-500">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-800">
                        {formatCurrency(monthlyTotal)}/mo
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50">
                      {items.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500">
                          No items in this category
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {items.map((item) => {
                            const monthlyAmount = calcExpenseMonthly(item);

                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-3 hover:bg-slate-100"
                              >
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-slate-700">
                                    {item.name}
                                  </div>
                                  {item.vendor && (
                                    <div className="text-xs text-slate-500">{item.vendor}</div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-sm">
                                    {formatCurrency(item.amount)}
                                    <span className="text-xs text-slate-400 ml-1">
                                      {frequencyLabels[item.frequency] || item.frequency}
                                    </span>
                                  </div>
                                  {item.frequency !== 'monthly' && (
                                    <div className="text-xs text-slate-500">
                                      ({formatCurrency(monthlyAmount)}/mo)
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => { e.stopPropagation(); handleEditExpense(item); }}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-500 hover:text-red-600"
                                    onClick={(e) => { e.stopPropagation(); onDeleteExpense?.(item.id); }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Item Button */}
                      <div className="p-2 border-t border-slate-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-slate-500 hover:text-slate-700"
                          onClick={() => handleAddExpense(category.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Item to {category.name}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Total */}
        {categories.length > 0 && (
          <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm font-medium text-orange-800">Total Monthly Overhead</div>
                <div className="text-xs text-orange-600">
                  Expenses + Office Staff ({formatCurrency((calculations?.totalStaffCostAnnual || 0) / 12)})
                </div>
              </div>
              <div className="text-2xl font-bold text-orange-700">
                {formatCurrency(calculations?.monthlyOverhead || 0)}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Expense Modal */}
      <ExpenseItemModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedExpense(null); setSelectedCategoryId(undefined); }}
        onSave={handleSaveExpense}
        expense={selectedExpense}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        isLoading={isLoading}
      />
    </div>
  );
}
