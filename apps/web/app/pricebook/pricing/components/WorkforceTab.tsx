'use client';

import { useState } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  User,
  Users,
  Truck,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SectionCard from './shared/SectionCard';
import MetricCard from './shared/MetricCard';
import { TechnicianModal, OfficeStaffModal } from './modals';
import { formatCurrency, formatPercent, formatNumber, calcTechnicianMetrics } from '../lib/calculations';
import type { PricingDataResponse, CalculationResults, Technician, OfficeStaff, TechnicianFormData, OfficeStaffFormData } from '../lib/types';

interface WorkforceTabProps {
  data: PricingDataResponse;
  calculations: CalculationResults | null;
  onCreateTechnician?: (data: TechnicianFormData) => void;
  onUpdateTechnician?: (id: string, data: TechnicianFormData) => void;
  onDeleteTechnician?: (id: string) => void;
  onCreateOfficeStaff?: (data: OfficeStaffFormData) => void;
  onUpdateOfficeStaff?: (id: string, data: OfficeStaffFormData) => void;
  onDeleteOfficeStaff?: (id: string) => void;
  isLoading?: boolean;
}

export default function WorkforceTab({
  data,
  calculations,
  onCreateTechnician,
  onUpdateTechnician,
  onDeleteTechnician,
  onCreateOfficeStaff,
  onUpdateOfficeStaff,
  onDeleteOfficeStaff,
  isLoading = false,
}: WorkforceTabProps) {
  const [expandedTech, setExpandedTech] = useState<string | null>(null);
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<OfficeStaff | null>(null);

  const toggleTech = (id: string) => {
    setExpandedTech(expandedTech === id ? null : id);
  };

  const toggleStaff = (id: string) => {
    setExpandedStaff(expandedStaff === id ? null : id);
  };

  const activeTechnicians = data.technicians?.filter(t => t.status === 'active') || [];
  const activeOfficeStaff = data.officeStaff?.filter(s => s.status === 'active') || [];

  // Technician modal handlers
  const handleAddTechnician = () => {
    setSelectedTechnician(null);
    setTechModalOpen(true);
  };

  const handleEditTechnician = (tech: Technician) => {
    setSelectedTechnician(tech);
    setTechModalOpen(true);
  };

  const handleSaveTechnician = (formData: TechnicianFormData) => {
    if (selectedTechnician) {
      onUpdateTechnician?.(selectedTechnician.id, formData);
    } else {
      onCreateTechnician?.(formData);
    }
    setTechModalOpen(false);
    setSelectedTechnician(null);
  };

  // Office Staff modal handlers
  const handleAddStaff = () => {
    setSelectedStaff(null);
    setStaffModalOpen(true);
  };

  const handleEditStaff = (staff: OfficeStaff) => {
    setSelectedStaff(staff);
    setStaffModalOpen(true);
  };

  const handleSaveStaff = (formData: OfficeStaffFormData) => {
    if (selectedStaff) {
      onUpdateOfficeStaff?.(selectedStaff.id, formData);
    } else {
      onCreateOfficeStaff?.(formData);
    }
    setStaffModalOpen(false);
    setSelectedStaff(null);
  };

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Technicians"
          value={activeTechnicians.length}
          subtitle="Active field staff"
          icon={Users}
        />
        <MetricCard
          label="Avg Burden %"
          value={formatPercent(calculations?.avgBurdenPercent || 0)}
          subtitle="Benefits + taxes"
          icon={DollarSign}
          valueClassName="text-amber-600"
        />
        <MetricCard
          label="Avg Efficiency"
          value={formatPercent(calculations?.avgEfficiencyPercent || 0)}
          subtitle="Billable vs paid hours"
          icon={Clock}
          valueClassName="text-emerald-600"
        />
        <MetricCard
          label="Avg True Cost/Hr"
          value={formatCurrency(calculations?.avgTrueCostPerHour || 0, 2)}
          subtitle="Per billable hour"
          icon={DollarSign}
        />
      </div>

      {/* Technicians Section */}
      <SectionCard
        title="Field Technicians"
        subtitle={`${activeTechnicians.length} active technicians`}
        headerActions={
          <Button size="sm" className="gap-1" onClick={handleAddTechnician}>
            <Plus className="h-4 w-4" />
            Add Technician
          </Button>
        }
      >
        <div className="divide-y divide-slate-100">
          {activeTechnicians.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No technicians added yet. Click "Add Technician" to get started.
            </div>
          ) : (
            activeTechnicians.map((tech) => {
              const unproductive = data.unproductiveTimeMap?.[tech.id] || [];
              const vehicle = data.vehicles?.find(v => v.id === tech.assigned_vehicle_id);
              const metrics = calculations?.technicianMetrics?.find(m => m.id === tech.id);
              const isExpanded = expandedTech === tech.id;

              return (
                <div key={tech.id} className="py-3">
                  {/* Main Row */}
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 -mx-4 px-4 py-2 rounded"
                    onClick={() => toggleTech(tech.id)}
                  >
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800">
                        {tech.display_name || `${tech.first_name} ${tech.last_name}`}
                      </div>
                      <div className="text-xs text-slate-500">{tech.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-800">
                        {formatCurrency(metrics?.trueCostPerHour || 0, 2)}/hr
                      </div>
                      <div className="text-xs text-slate-500">true cost</div>
                    </div>
                    <div className="text-right w-20">
                      <Badge
                        variant="outline"
                        className={`${
                          (metrics?.burdenPercent || 0) > 40
                            ? 'border-amber-300 text-amber-700 bg-amber-50'
                            : 'border-slate-200'
                        }`}
                      >
                        {formatPercent(metrics?.burdenPercent || 0)}
                      </Badge>
                    </div>
                    <div className="text-right w-20">
                      <Badge
                        variant="outline"
                        className={`${
                          (metrics?.efficiencyPercent || 0) < 70
                            ? 'border-red-300 text-red-700 bg-red-50'
                            : 'border-emerald-300 text-emerald-700 bg-emerald-50'
                        }`}
                      >
                        {formatPercent(metrics?.efficiencyPercent || 0)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEditTechnician(tech); }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onDeleteTechnician?.(tech.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && metrics && (
                    <div className="mt-3 ml-12 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Burden Breakdown */}
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                        <div className="text-xs font-medium text-amber-800 mb-2">Burden Breakdown</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Payroll Taxes</span>
                            <span>{formatCurrency(metrics.burdenBreakdown.payrollTaxes)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">FUTA/SUTA</span>
                            <span>{formatCurrency(metrics.burdenBreakdown.futa + metrics.burdenBreakdown.suta)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Workers Comp</span>
                            <span>{formatCurrency(metrics.burdenBreakdown.workersComp)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Benefits</span>
                            <span>
                              {formatCurrency(
                                metrics.burdenBreakdown.healthAnnual +
                                metrics.burdenBreakdown.dentalAnnual +
                                metrics.burdenBreakdown.visionAnnual +
                                metrics.burdenBreakdown.lifeAnnual
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">401k Match</span>
                            <span>{formatCurrency(metrics.burdenBreakdown.retirement)}</span>
                          </div>
                          <div className="flex justify-between font-medium pt-1 border-t border-amber-200">
                            <span>Total Burden</span>
                            <span>{formatCurrency(metrics.totalBurden)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Productivity */}
                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                        <div className="text-xs font-medium text-emerald-800 mb-2">Productivity</div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Paid Hours/Day</span>
                            <span>{tech.paid_hours_per_day}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Unproductive (Paid)</span>
                            <span className="text-red-600">-{metrics.paidUnproductive}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Billable/Day</span>
                            <span className="text-emerald-600">{metrics.billableHoursPerDay.toFixed(1)}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Billable/Year</span>
                            <span>{formatNumber(metrics.billableHoursPerYear)}</span>
                          </div>
                          <div className="flex justify-between font-medium pt-1 border-t border-emerald-200">
                            <span>Efficiency</span>
                            <span>{formatPercent(metrics.efficiencyPercent)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Assignment */}
                      <div className="bg-violet-50 rounded-lg p-3 border border-violet-100">
                        <div className="text-xs font-medium text-violet-800 mb-2">Vehicle Assignment</div>
                        {vehicle ? (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2 mb-2">
                              <Truck className="h-4 w-4 text-violet-600" />
                              <span className="font-medium">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Monthly Cost</span>
                              <span>{formatCurrency(metrics.vehicleMonthlyCost)}</span>
                            </div>
                            <div className="flex justify-between font-medium pt-1 border-t border-violet-200">
                              <span>Cost/Billable Hr</span>
                              <span>{formatCurrency(metrics.vehicleCostPerHour, 2)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic">No vehicle assigned</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SectionCard>

      {/* Office Staff Section */}
      <SectionCard
        title="Office Staff"
        subtitle={`${activeOfficeStaff.length} active staff (flows to overhead)`}
        headerActions={
          <Button size="sm" variant="outline" className="gap-1" onClick={handleAddStaff}>
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        }
      >
        <div className="divide-y divide-slate-100">
          {activeOfficeStaff.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No office staff added yet.
            </div>
          ) : (
            activeOfficeStaff.map((staff) => {
              const isExpanded = expandedStaff === staff.id;
              const monthlyCost = staff.calculated_monthly_cost || 0;

              return (
                <div key={staff.id} className="py-3">
                  <div
                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 -mx-4 px-4 py-2 rounded"
                    onClick={() => toggleStaff(staff.id)}
                  >
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800">
                        {staff.display_name || `${staff.first_name} ${staff.last_name}`}
                      </div>
                      <div className="text-xs text-slate-500">{staff.role}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-800">
                        {formatCurrency(monthlyCost)}/mo
                      </div>
                      <div className="text-xs text-slate-500">total cost</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEditStaff(staff); }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onDeleteOfficeStaff?.(staff.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Office Staff Totals */}
        {activeOfficeStaff.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Total Office Staff Cost (Monthly)</span>
              <span className="text-lg font-bold text-slate-800">
                {formatCurrency(calculations?.totalStaffCostAnnual ? calculations.totalStaffCostAnnual / 12 : 0)}
              </span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Modals */}
      <TechnicianModal
        isOpen={techModalOpen}
        onClose={() => { setTechModalOpen(false); setSelectedTechnician(null); }}
        onSave={handleSaveTechnician}
        technician={selectedTechnician}
        vehicles={data.vehicles}
        isLoading={isLoading}
      />

      <OfficeStaffModal
        isOpen={staffModalOpen}
        onClose={() => { setStaffModalOpen(false); setSelectedStaff(null); }}
        onSave={handleSaveStaff}
        staff={selectedStaff}
        isLoading={isLoading}
      />
    </div>
  );
}
