'use client';

import { useState, useEffect } from 'react';
import { User, DollarSign, Shield } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { OfficeStaff, OfficeStaffFormData } from '../../lib/types';

interface OfficeStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: OfficeStaffFormData) => void;
  staff?: OfficeStaff | null;
  isLoading?: boolean;
}

const defaultFormData: OfficeStaffFormData = {
  first_name: '',
  last_name: '',
  display_name: '',
  role: 'Admin',
  status: 'active',
  salary_type: 'salary',
  amount: 0,
  health_monthly: 0,
  dental_monthly: 0,
  vision_monthly: 0,
  life_monthly: 0,
  retirement_match_percent: 0,
};

export default function OfficeStaffModal({
  isOpen,
  onClose,
  onSave,
  staff,
  isLoading = false,
}: OfficeStaffModalProps) {
  const [formData, setFormData] = useState<OfficeStaffFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (staff) {
      setFormData({
        first_name: staff.first_name,
        last_name: staff.last_name,
        display_name: staff.display_name || '',
        role: staff.role,
        status: staff.status,
        salary_type: staff.salary_type,
        amount: staff.amount,
        health_monthly: staff.health_monthly,
        dental_monthly: staff.dental_monthly,
        vision_monthly: staff.vision_monthly,
        life_monthly: staff.life_monthly,
        retirement_match_percent: staff.retirement_match_percent,
      });
    } else {
      setFormData(defaultFormData);
    }
    setActiveTab('basic');
  }, [staff, isOpen]);

  const handleChange = (field: keyof OfficeStaffFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isEditing = !!staff;

  const getAnnualSalary = () => {
    if (formData.salary_type === 'salary') {
      return formData.amount || 0;
    }
    // Hourly: assume 40 hours/week, 52 weeks/year
    return (formData.amount || 0) * 40 * 52;
  };

  const getMonthlySalary = () => {
    return getAnnualSalary() / 12;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? 'Edit Office Staff' : 'Add Office Staff'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="compensation">Compensation</TabsTrigger>
              <TabsTrigger value="benefits">Benefits</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => handleChange('display_name', e.target.value)}
                  placeholder="Optional - defaults to full name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleChange('role', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Office Manager">Office Manager</SelectItem>
                      <SelectItem value="Dispatcher">Dispatcher</SelectItem>
                      <SelectItem value="CSR">CSR</SelectItem>
                      <SelectItem value="Bookkeeper">Bookkeeper</SelectItem>
                      <SelectItem value="Accountant">Accountant</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value as 'active' | 'inactive' | 'on_leave')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Compensation Tab */}
            <TabsContent value="compensation" className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800 font-medium mb-4">
                  <DollarSign className="h-4 w-4" />
                  Compensation
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salary_type">Pay Type</Label>
                    <Select
                      value={formData.salary_type}
                      onValueChange={(value) => handleChange('salary_type', value as 'salary' | 'hourly')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salary">Annual Salary</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      {formData.salary_type === 'salary' ? 'Annual Salary ($)' : 'Hourly Rate ($)'}
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step={formData.salary_type === 'salary' ? '1000' : '0.01'}
                      value={formData.amount}
                      onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-white rounded border border-blue-100">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Annual:</span>
                      <span className="ml-2 font-semibold text-blue-700">
                        ${getAnnualSalary().toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Monthly:</span>
                      <span className="ml-2 font-semibold text-blue-700">
                        ${getMonthlySalary().toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Benefits Tab */}
            <TabsContent value="benefits" className="space-y-4 mt-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 text-amber-800 font-medium mb-4">
                  <Shield className="h-4 w-4" />
                  Monthly Benefits
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="health_monthly">Health Insurance ($/mo)</Label>
                    <Input
                      id="health_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.health_monthly}
                      onChange={(e) => handleChange('health_monthly', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dental_monthly">Dental Insurance ($/mo)</Label>
                    <Input
                      id="dental_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.dental_monthly}
                      onChange={(e) => handleChange('dental_monthly', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vision_monthly">Vision Insurance ($/mo)</Label>
                    <Input
                      id="vision_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.vision_monthly}
                      onChange={(e) => handleChange('vision_monthly', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="life_monthly">Life Insurance ($/mo)</Label>
                    <Input
                      id="life_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.life_monthly}
                      onChange={(e) => handleChange('life_monthly', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="text-emerald-800 font-medium mb-4">Retirement</div>
                <div className="space-y-2">
                  <Label htmlFor="retirement_match_percent">401k Match (%)</Label>
                  <Input
                    id="retirement_match_percent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.retirement_match_percent}
                    onChange={(e) => handleChange('retirement_match_percent', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Update Staff' : 'Add Staff'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
