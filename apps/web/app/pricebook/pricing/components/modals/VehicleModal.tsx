'use client';

import { useState, useEffect } from 'react';
import { Truck, DollarSign, Shield, Fuel, Wrench } from 'lucide-react';
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
import type { Vehicle, VehicleFormData } from '../../lib/types';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: VehicleFormData) => void;
  vehicle?: Vehicle | null;
  isLoading?: boolean;
}

const currentYear = new Date().getFullYear();

const defaultFormData: VehicleFormData = {
  year: currentYear,
  make: '',
  model: '',
  trim: '',
  status: 'active',
  monthly_payment: 0,
  insurance_monthly: 0,
  fuel_monthly: 0,
  maintenance_monthly: 0,
  market_value: 0,
  loan_balance: 0,
  registration_annual: 0,
  fuel_type: 'gasoline',
};

export default function VehicleModal({
  isOpen,
  onClose,
  onSave,
  vehicle,
  isLoading = false,
}: VehicleModalProps) {
  const [formData, setFormData] = useState<VehicleFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (vehicle) {
      setFormData({
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim || '',
        status: vehicle.status,
        monthly_payment: vehicle.monthly_payment,
        insurance_monthly: vehicle.insurance_monthly,
        fuel_monthly: vehicle.fuel_monthly,
        maintenance_monthly: vehicle.maintenance_monthly,
        market_value: vehicle.market_value || 0,
        loan_balance: vehicle.loan_balance || 0,
        registration_annual: vehicle.registration_annual ?? 0,
        fuel_type: vehicle.fuel_type || 'gasoline',
      });
    } else {
      setFormData(defaultFormData);
    }
    setActiveTab('info');
  }, [vehicle, isOpen]);

  const handleChange = (field: keyof VehicleFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isEditing = !!vehicle;

  const getMonthlyCost = () => {
    return (formData.monthly_payment || 0) +
      (formData.insurance_monthly || 0) +
      (formData.fuel_monthly || 0) +
      (formData.maintenance_monthly || 0);
  };

  const getEquity = () => {
    return (formData.market_value || 0) - (formData.loan_balance || 0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {isEditing ? 'Edit Vehicle' : 'Add Vehicle'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Vehicle Info</TabsTrigger>
              <TabsTrigger value="costs">Monthly Costs</TabsTrigger>
              <TabsTrigger value="value">Value & Equity</TabsTrigger>
            </TabsList>

            {/* Vehicle Info Tab */}
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Year *</Label>
                  <Select
                    value={(formData.year || currentYear).toString()}
                    onValueChange={(value) => handleChange('year', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 30 }, (_, i) => currentYear + 1 - i).map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value as Vehicle['status'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="reserve">Reserve</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="totaled">Totaled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Make *</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) => handleChange('make', e.target.value)}
                    placeholder="e.g., Ford, Chevrolet, Ram"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    placeholder="e.g., F-150, Silverado"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trim">Trim (Optional)</Label>
                <Input
                  id="trim"
                  value={formData.trim}
                  onChange={(e) => handleChange('trim', e.target.value)}
                  placeholder="e.g., XLT, LT, Big Horn"
                />
              </div>

              <div className="p-3 bg-violet-50 rounded-lg border border-violet-200 mt-4">
                <div className="text-sm font-medium text-violet-800">
                  {formData.year} {formData.make} {formData.model} {formData.trim}
                </div>
              </div>
            </TabsContent>

            {/* Monthly Costs Tab */}
            <TabsContent value="costs" className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 text-slate-800 font-medium mb-4">
                  <DollarSign className="h-4 w-4" />
                  Monthly Operating Costs
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthly_payment" className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3 text-slate-500" />
                      Payment ($/mo)
                    </Label>
                    <Input
                      id="monthly_payment"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.monthly_payment}
                      onChange={(e) => handleChange('monthly_payment', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insurance_monthly" className="flex items-center gap-2">
                      <Shield className="h-3 w-3 text-slate-500" />
                      Insurance ($/mo)
                    </Label>
                    <Input
                      id="insurance_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.insurance_monthly}
                      onChange={(e) => handleChange('insurance_monthly', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuel_monthly" className="flex items-center gap-2">
                      <Fuel className="h-3 w-3 text-slate-500" />
                      Fuel ($/mo)
                    </Label>
                    <Input
                      id="fuel_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.fuel_monthly}
                      onChange={(e) => handleChange('fuel_monthly', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance_monthly" className="flex items-center gap-2">
                      <Wrench className="h-3 w-3 text-slate-500" />
                      Maintenance ($/mo)
                    </Label>
                    <Input
                      id="maintenance_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.maintenance_monthly}
                      onChange={(e) => handleChange('maintenance_monthly', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-violet-800">Total Monthly Cost</span>
                  <span className="text-2xl font-bold text-violet-600">
                    ${getMonthlyCost().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-sm text-violet-600 mt-1">
                  Annual: ${(getMonthlyCost() * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </TabsContent>

            {/* Value & Equity Tab */}
            <TabsContent value="value" className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-800 font-medium mb-4">Asset Value</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="market_value">Market Value ($)</Label>
                    <Input
                      id="market_value"
                      type="number"
                      min="0"
                      step="100"
                      value={formData.market_value}
                      onChange={(e) => handleChange('market_value', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loan_balance">Loan Balance ($)</Label>
                    <Input
                      id="loan_balance"
                      type="number"
                      min="0"
                      step="100"
                      value={formData.loan_balance}
                      onChange={(e) => handleChange('loan_balance', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${getEquity() >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex justify-between items-center">
                  <span className={`font-medium ${getEquity() >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                    Equity
                  </span>
                  <span className={`text-2xl font-bold ${getEquity() >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ${getEquity().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-sm mt-2 text-slate-600">
                  {getEquity() >= 0
                    ? 'You have positive equity in this vehicle'
                    : 'This vehicle is underwater (loan exceeds value)'}
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
              {isLoading ? 'Saving...' : isEditing ? 'Update Vehicle' : 'Add Vehicle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
