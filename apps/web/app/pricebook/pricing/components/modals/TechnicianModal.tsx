'use client';

import { useState, useEffect } from 'react';
import { X, User, DollarSign, Clock, Shield, Truck } from 'lucide-react';
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
  display_name: '',
  role: 'Technician',
  status: 'active',
  hourly_rate: 25,
  paid_hours_per_day: 8,
  work_days_per_week: 5,
  health_monthly: 0,
  dental_monthly: 0,
  vision_monthly: 0,
  life_monthly: 0,
  retirement_match_percent: 0,
  assigned_vehicle_id: undefined,
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
        display_name: technician.display_name || '',
        role: technician.role,
        status: technician.status,
        hourly_rate: technician.hourly_rate,
        paid_hours_per_day: technician.paid_hours_per_day,
        work_days_per_week: technician.work_days_per_week,
        health_monthly: technician.health_monthly,
        dental_monthly: technician.dental_monthly,
        vision_monthly: technician.vision_monthly,
        life_monthly: technician.life_monthly,
        retirement_match_percent: technician.retirement_match_percent,
        assigned_vehicle_id: technician.assigned_vehicle_id,
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
                <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                  <DollarSign className="h-4 w-4" />
                  Base Compensation
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => handleChange('hourly_rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="text-sm text-blue-700">
                    Annual Gross: ${((formData.hourly_rate || 0) * (formData.paid_hours_per_day || 8) * (formData.work_days_per_week || 5) * 52).toLocaleString()}
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

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
                <div className="flex items-center gap-2 text-violet-800 font-medium mb-4">
                  <Clock className="h-4 w-4" />
                  Work Schedule
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="space-y-2">
                    <Label htmlFor="work_days_per_week">Work Days Per Week</Label>
                    <Input
                      id="work_days_per_week"
                      type="number"
                      min="1"
                      max="7"
                      step="1"
                      value={formData.work_days_per_week}
                      onChange={(e) => handleChange('work_days_per_week', parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>
                <div className="mt-4 text-sm text-violet-700">
                  Weekly Hours: {(formData.paid_hours_per_day || 8) * (formData.work_days_per_week || 5)}h
                  <br />
                  Annual Hours: {(formData.paid_hours_per_day || 8) * (formData.work_days_per_week || 5) * 52}h
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
