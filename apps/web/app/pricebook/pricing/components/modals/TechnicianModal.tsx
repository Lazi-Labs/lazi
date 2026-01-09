'use client';

import { useState, useEffect } from 'react';
import { User, DollarSign, Clock, Shield, Truck } from 'lucide-react';
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
import type { Technician, TechnicianFormData, Vehicle } from '../../lib/types';

interface TechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TechnicianFormData) => void;
  technician?: Technician | null;
  vehicles?: Vehicle[];
  isLoading?: boolean;
}

const defaultFormData: TechnicianFormData = {
  first_name: '',
  last_name: '',
  role: 'Technician',
  status: 'active',
  pay_type: 'hourly',
  paid_hours_per_day: 8,
  health_insurance_monthly: 0,
  dental_insurance_monthly: 0,
  vision_insurance_monthly: 0,
  life_insurance_monthly: 0,
  retirement_401k_match_percent: 0,
  hsa_contribution_monthly: 0,
  other_benefits_monthly: 0,
  unproductive_time: [],
};

export default function TechnicianModal({
  isOpen,
  onClose,
  onSave,
  technician,
  vehicles = [],
  isLoading = false,
}: TechnicianModalProps) {
  const [formData, setFormData] = useState<TechnicianFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (technician) {
      setFormData({
        first_name: technician.first_name,
        last_name: technician.last_name,
        role: technician.role,
        status: technician.status,
        email: technician.email,
        phone: technician.phone,
        pay_type: technician.pay_type,
        base_pay_rate: technician.base_pay_rate,
        annual_salary: technician.annual_salary,
        paid_hours_per_day: technician.paid_hours_per_day,
        health_insurance_monthly: technician.health_insurance_monthly,
        dental_insurance_monthly: technician.dental_insurance_monthly,
        vision_insurance_monthly: technician.vision_insurance_monthly,
        life_insurance_monthly: technician.life_insurance_monthly,
        retirement_401k_match_percent: technician.retirement_401k_match_percent,
        hsa_contribution_monthly: technician.hsa_contribution_monthly ?? 0,
        other_benefits_monthly: technician.other_benefits_monthly ?? 0,
        assigned_vehicle_id: technician.assigned_vehicle_id,
        unproductive_time: technician.unproductive_time || [],
      });
    } else {
      setFormData(defaultFormData);
    }
    setActiveTab('basic');
  }, [technician, isOpen]);

  const handleChange = (field: keyof TechnicianFormData, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isEditing = !!technician;

  const getAnnualSalary = () => {
    if (formData.pay_type === 'salary') {
      return formData.annual_salary || 0;
    }
    // Hourly: paid_hours_per_day * 5 days * 52 weeks * base_pay_rate
    return (formData.base_pay_rate || 0) * (formData.paid_hours_per_day || 8) * 5 * 52;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? 'Edit Technician' : 'Add Technician'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="compensation">Compensation</TabsTrigger>
              <TabsTrigger value="benefits">Benefits</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleChange('email', e.target.value || undefined)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value || undefined)}
                    placeholder="(555) 123-4567"
                  />
                </div>
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
                      <SelectItem value="Technician">Technician</SelectItem>
                      <SelectItem value="Lead Technician">Lead Technician</SelectItem>
                      <SelectItem value="Senior Technician">Senior Technician</SelectItem>
                      <SelectItem value="Helper">Helper</SelectItem>
                      <SelectItem value="Apprentice">Apprentice</SelectItem>
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

              <div className="space-y-2">
                <Label htmlFor="vehicle">Assigned Vehicle</Label>
                <Select
                  value={formData.assigned_vehicle_id || 'none'}
                  onValueChange={(value) => handleChange('assigned_vehicle_id', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Vehicle Assigned</SelectItem>
                    {vehicles
                      .filter((v) => v.status === 'active' || v.status === 'reserve')
                      .map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Compensation Tab */}
            <TabsContent value="compensation" className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-800 font-medium mb-4">
                  <DollarSign className="h-4 w-4" />
                  Base Compensation
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pay_type">Pay Type</Label>
                    <Select
                      value={formData.pay_type}
                      onValueChange={(value) => handleChange('pay_type', value as 'salary' | 'hourly')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                        <SelectItem value="salary">Annual Salary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.pay_type === 'hourly' ? (
                    <div className="space-y-2">
                      <Label htmlFor="base_pay_rate">Hourly Rate ($)</Label>
                      <Input
                        id="base_pay_rate"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.base_pay_rate || ''}
                        onChange={(e) => handleChange('base_pay_rate', parseFloat(e.target.value) || undefined)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="annual_salary">Annual Salary ($)</Label>
                      <Input
                        id="annual_salary"
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.annual_salary || ''}
                        onChange={(e) => handleChange('annual_salary', parseFloat(e.target.value) || undefined)}
                      />
                    </div>
                  )}
                </div>
                <div className="text-sm text-blue-700 mt-4">
                  Annual Gross: ${getAnnualSalary().toLocaleString()}
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
                    <Label htmlFor="health_insurance_monthly">Health Insurance ($/mo)</Label>
                    <Input
                      id="health_insurance_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.health_insurance_monthly}
                      onChange={(e) => handleChange('health_insurance_monthly', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dental_insurance_monthly">Dental Insurance ($/mo)</Label>
                    <Input
                      id="dental_insurance_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.dental_insurance_monthly}
                      onChange={(e) => handleChange('dental_insurance_monthly', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vision_insurance_monthly">Vision Insurance ($/mo)</Label>
                    <Input
                      id="vision_insurance_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.vision_insurance_monthly}
                      onChange={(e) => handleChange('vision_insurance_monthly', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="life_insurance_monthly">Life Insurance ($/mo)</Label>
                    <Input
                      id="life_insurance_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.life_insurance_monthly}
                      onChange={(e) => handleChange('life_insurance_monthly', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="text-emerald-800 font-medium mb-4">Retirement & Other</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="retirement_401k_match_percent">401k Match (%)</Label>
                    <Input
                      id="retirement_401k_match_percent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.retirement_401k_match_percent}
                      onChange={(e) => handleChange('retirement_401k_match_percent', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hsa_contribution_monthly">HSA Contribution ($/mo)</Label>
                    <Input
                      id="hsa_contribution_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.hsa_contribution_monthly}
                      onChange={(e) => handleChange('hsa_contribution_monthly', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
                <div className="flex items-center gap-2 text-violet-800 font-medium mb-4">
                  <Clock className="h-4 w-4" />
                  Work Schedule
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid_hours_per_day">Paid Hours Per Day</Label>
                  <Input
                    id="paid_hours_per_day"
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    value={formData.paid_hours_per_day}
                    onChange={(e) => handleChange('paid_hours_per_day', parseFloat(e.target.value) || 8)}
                  />
                </div>
                <div className="mt-4 text-sm text-violet-700">
                  Weekly Hours: {(formData.paid_hours_per_day || 8) * 5}h
                  <br />
                  Annual Hours: {(formData.paid_hours_per_day || 8) * 5 * 52}h
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
              {isLoading ? 'Saving...' : isEditing ? 'Update Technician' : 'Add Technician'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
