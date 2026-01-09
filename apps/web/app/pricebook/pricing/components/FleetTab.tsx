'use client';

import { useState } from 'react';
import {
  Plus,
  Truck,
  Edit2,
  Trash2,
  User,
  DollarSign,
  Fuel,
  Wrench,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SectionCard from './shared/SectionCard';
import MetricCard from './shared/MetricCard';
import { formatCurrency } from '../lib/calculations';
import { VehicleModal } from './modals';
import type { PricingDataResponse, CalculationResults, Vehicle, VehicleFormData } from '../lib/types';

interface FleetTabProps {
  data: PricingDataResponse;
  calculations: CalculationResults | null;
  onCreateVehicle?: (data: VehicleFormData) => void;
  onUpdateVehicle?: (id: string, data: VehicleFormData) => void;
  onDeleteVehicle?: (id: string) => void;
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  reserve: 'bg-blue-100 text-blue-700 border-blue-200',
  maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
  sold: 'bg-slate-100 text-slate-700 border-slate-200',
  totaled: 'bg-red-100 text-red-700 border-red-200',
};

export default function FleetTab({
  data,
  calculations,
  onCreateVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  isLoading = false,
}: FleetTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const vehicles = data.vehicles || [];

  // Modal handlers
  const handleAddVehicle = () => {
    setSelectedVehicle(null);
    setModalOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setModalOpen(true);
  };

  const handleSaveVehicle = (formData: VehicleFormData) => {
    if (selectedVehicle) {
      onUpdateVehicle?.(selectedVehicle.id, formData);
    } else {
      onCreateVehicle?.(formData);
    }
    setModalOpen(false);
    setSelectedVehicle(null);
  };
  const activeVehicles = vehicles.filter(v => ['active', 'reserve', 'maintenance'].includes(v.status));

  const getAssignedTechnician = (vehicleId: string) => {
    return data.technicians?.find(t => t.assigned_vehicle_id === vehicleId);
  };

  const getVehicleMonthlyCost = (vehicle: Vehicle) => {
    return (vehicle.monthly_payment || 0) +
      (vehicle.insurance_monthly || 0) +
      (vehicle.fuel_monthly || 0) +
      (vehicle.maintenance_monthly || 0);
  };

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Vehicles"
          value={vehicles.length}
          subtitle={`${activeVehicles.length} active/reserve`}
          icon={Truck}
        />
        <MetricCard
          label="Monthly Fleet Cost"
          value={formatCurrency(calculations?.fleetCostMonthly || 0)}
          subtitle="Payments + insurance + fuel + maint"
          icon={DollarSign}
        />
        <MetricCard
          label="Cost/Billable Hour"
          value={formatCurrency(calculations?.fleetCostPerHour || 0, 2)}
          subtitle="Allocated to labor rate"
          icon={DollarSign}
          valueClassName="text-violet-600"
        />
        <MetricCard
          label="Total Equity"
          value={formatCurrency(calculations?.totalEquity || 0)}
          subtitle="Market value - loans"
          icon={DollarSign}
          valueClassName={calculations?.totalEquity && calculations.totalEquity >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
      </div>

      {/* Vehicles List */}
      <SectionCard
        title="Fleet Vehicles"
        subtitle={`${vehicles.length} total vehicles`}
        headerActions={
          <Button size="sm" className="gap-1" onClick={handleAddVehicle}>
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Button>
        }
      >
        {vehicles.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No vehicles added yet. Click "Add Vehicle" to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((vehicle) => {
              const assignedTech = getAssignedTechnician(vehicle.id);
              const monthlyCost = getVehicleMonthlyCost(vehicle);
              const equity = (vehicle.market_value || 0) - (vehicle.loan_balance || 0);

              return (
                <div
                  key={vehicle.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-violet-600" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {vehicle.year} {vehicle.make}
                        </div>
                        <div className="text-sm text-slate-500">{vehicle.model} {vehicle.trim}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className={statusColors[vehicle.status] || statusColors.active}>
                      {vehicle.status}
                    </Badge>
                  </div>

                  {/* Assignment */}
                  {assignedTech && (
                    <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-slate-50 rounded text-sm">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">
                        Assigned to {assignedTech.first_name} {assignedTech.last_name}
                      </span>
                    </div>
                  )}

                  {/* Cost Breakdown */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Payment
                      </span>
                      <span>{formatCurrency(vehicle.monthly_payment || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Insurance
                      </span>
                      <span>{formatCurrency(vehicle.insurance_monthly || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Fuel className="h-3 w-3" />
                        Fuel
                      </span>
                      <span>{formatCurrency(vehicle.fuel_monthly || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        Maintenance
                      </span>
                      <span>{formatCurrency(vehicle.maintenance_monthly || 0)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100 font-medium">
                      <span className="text-slate-700">Monthly Total</span>
                      <span className="text-violet-600">{formatCurrency(monthlyCost)}</span>
                    </div>
                  </div>

                  {/* Equity */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Market Value</span>
                      <span>{formatCurrency(vehicle.market_value || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Loan Balance</span>
                      <span className="text-red-600">({formatCurrency(vehicle.loan_balance || 0)})</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium mt-1">
                      <span className="text-slate-700">Equity</span>
                      <span className={equity >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {formatCurrency(equity)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-slate-100">
                    <Button variant="ghost" size="sm" onClick={() => handleEditVehicle(vehicle)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => onDeleteVehicle?.(vehicle.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Fleet Totals */}
        {vehicles.length > 0 && calculations?.fleetMetrics && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <div className="text-sm font-medium text-slate-700 mb-3">Fleet Totals</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Monthly Payments</div>
                <div className="font-semibold">{formatCurrency(calculations.fleetMetrics.totalPayments)}</div>
              </div>
              <div>
                <div className="text-slate-500">Monthly Insurance</div>
                <div className="font-semibold">{formatCurrency(calculations.fleetMetrics.totalInsurance)}</div>
              </div>
              <div>
                <div className="text-slate-500">Monthly Fuel</div>
                <div className="font-semibold">{formatCurrency(calculations.fleetMetrics.totalFuel)}</div>
              </div>
              <div>
                <div className="text-slate-500">Monthly Maintenance</div>
                <div className="font-semibold">{formatCurrency(calculations.fleetMetrics.totalMaintenance)}</div>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Vehicle Modal */}
      <VehicleModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedVehicle(null); }}
        onSave={handleSaveVehicle}
        vehicle={selectedVehicle}
        isLoading={isLoading}
      />
    </div>
  );
}
