'use client';

import { useState } from 'react';
import {
  Plus,
  ChevronDown,
  Edit2,
  Trash2,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SectionCard from './shared/SectionCard';
import MetricCard from './shared/MetricCard';
import { TechnicianModal, OfficeStaffModal } from './modals';
import { formatCurrency, formatPercent, formatNumber } from '../lib/calculations';
import type {
  PricingDataResponse,
  CalculationResults,
  Technician,
  OfficeStaff,
  TechnicianFormData,
  OfficeStaffFormData,
} from '../lib/types';

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
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
  const [techModalOpen, setTechModalOpen] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<OfficeStaff | null>(null);

  const toggleTech = (id: string) => {
    setExpandedTech(expandedTech === id ? null : id);
  };

  const activeTechnicians = data.technicians?.filter((t) => t.status === 'active') || [];
  const activeOfficeStaff = data.officeStaff?.filter((s) => s.status === 'active') || [];

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
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total Technicians"
          value={calculations?.techCount || 0}
          subtitle="Active field technicians"
        />
        <MetricCard
          label="Office Staff"
          value={calculations?.staffCount || 0}
          subtitle="Non-billable employees"
        />
        <MetricCard
          label="Total Billable Hours"
          value={formatNumber(calculations?.totalBillableHoursPerYear || 0)}
          subtitle="Annual capacity"
        />
        <MetricCard
          label="Total Labor Cost"
          value={formatCurrency(calculations?.totalTechCostAnnual || 0)}
          subtitle="Annual (base + burden)"
        />
      </div>

      {/* Technicians Section */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-slate-800">Technician Metrics</h3>
            <p className="text-sm text-slate-500">Individual cost and efficiency breakdown</p>
          </div>
          <Button size="sm" className="gap-1" onClick={handleAddTechnician}>
            <Plus className="h-4 w-4" />
            Add Technician
          </Button>
        </div>
        <div className="divide-y divide-slate-100">
          {activeTechnicians.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No technicians added yet. Click "Add Technician" to get started.
            </div>
          ) : (
            activeTechnicians.map((tech) => {
              const unproductive = data.unproductiveTimeMap?.[tech.id] || [];
              const vehicle = data.vehicles?.find((v) => v.id === tech.assigned_vehicle_id);
              const metrics = calculations?.technicianMetrics?.find((m) => m.id === tech.id);
              const isExpanded = expandedTech === tech.id;
              const displayName = tech.display_name || `${tech.first_name} ${tech.last_name}`;

              return (
                <div key={tech.id} className="tech-row">
                  {/* Collapsed Row */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                    onClick={() => toggleTech(tech.id)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Gradient Avatar with Initials */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-semibold">
                        {getInitials(displayName)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{displayName}</div>
                        <div className="text-sm text-slate-500">
                          {tech.role} • {formatCurrency(tech.base_pay_rate || 0, 2)}/hr
                        </div>
                      </div>
                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          tech.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tech.status}
                      </span>
                    </div>

                    {/* 4-Column Metrics */}
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <div className="text-xs text-slate-500">Burden</div>
                        <div className="font-semibold text-amber-600">
                          {formatPercent(metrics?.burdenPercent || 0)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500">Efficiency</div>
                        <div className="font-semibold text-emerald-600">
                          {formatPercent(metrics?.efficiencyPercent || 0)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500">True Cost</div>
                        <div className="font-semibold">
                          {formatCurrency(metrics?.trueCostPerHour || 0, 2)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500">Loaded</div>
                        <div className="font-semibold text-indigo-600">
                          {formatCurrency(metrics?.loadedCostPerHour || 0, 2)}
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && metrics && (
                    <div className="bg-slate-50">
                      <div className="p-4 grid grid-cols-3 gap-4">
                        {/* AMBER: Annual Burden Breakdown */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <h4 className="font-medium text-amber-800 mb-3">Annual Burden Breakdown</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Base Pay</span>
                              <span className="font-medium">{formatCurrency(metrics.annualBasePay)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Payroll Taxes (FICA)</span>
                              <span>{formatCurrency(metrics.burdenBreakdown.payrollTaxes)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>FUTA</span>
                              <span>{formatCurrency(metrics.burdenBreakdown.futa)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>SUTA</span>
                              <span>{formatCurrency(metrics.burdenBreakdown.suta)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Workers Comp</span>
                              <span>{formatCurrency(metrics.burdenBreakdown.workersComp)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Health Insurance</span>
                              <span>{formatCurrency(metrics.burdenBreakdown.healthAnnual)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Dental/Vision</span>
                              <span>
                                {formatCurrency(
                                  metrics.burdenBreakdown.dentalAnnual + metrics.burdenBreakdown.visionAnnual
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>401k Match</span>
                              <span>{formatCurrency(metrics.burdenBreakdown.retirement)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Other Benefits</span>
                              <span>{formatCurrency(metrics.burdenBreakdown.otherAnnual)}</span>
                            </div>
                            <div className="border-t border-amber-300 pt-2 flex justify-between font-semibold">
                              <span>Total Burden</span>
                              <span>{formatCurrency(metrics.totalBurden)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-amber-700">
                              <span>Total Annual Cost</span>
                              <span>{formatCurrency(metrics.totalCostAnnual)}</span>
                            </div>
                          </div>
                        </div>

                        {/* EMERALD: Productivity Summary */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                          <h4 className="font-medium text-emerald-800 mb-3">Productivity Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Paid Hours/Day</span>
                              <span className="font-medium">{tech.paid_hours_per_day} hrs</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Paid Unproductive</span>
                              <span className="text-red-500">-{metrics.paidUnproductive} hrs</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Unpaid Time</span>
                              <span className="text-slate-500">{metrics.unpaidTime} hrs</span>
                            </div>
                            <div className="border-t border-emerald-300 pt-2 flex justify-between font-semibold">
                              <span>Billable Hours/Day</span>
                              <span>{metrics.billableHoursPerDay.toFixed(1)} hrs</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Billable Hours/Year</span>
                              <span>{formatNumber(metrics.billableHoursPerYear)} hrs</span>
                            </div>
                            <div className="flex justify-between font-bold text-emerald-700">
                              <span>Efficiency</span>
                              <span>{formatPercent(metrics.efficiencyPercent)}</span>
                            </div>

                            {/* Unproductive Time Breakdown */}
                            {unproductive.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-emerald-300">
                                <div className="text-xs text-emerald-600 mb-2">Unproductive Time:</div>
                                {unproductive.map((ut, idx) => (
                                  <div key={idx} className="flex justify-between text-xs">
                                    <span>{ut.name}</span>
                                    <span>
                                      {ut.hours_per_day}hr {ut.is_paid ? '(paid)' : '(unpaid)'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* VIOLET: Vehicle Assignment */}
                        <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                          <h4 className="font-medium text-violet-800 mb-3">Vehicle Assignment</h4>
                          <div className="space-y-2 text-sm">
                            {vehicle ? (
                              <>
                                <div className="flex justify-between">
                                  <span>Vehicle</span>
                                  <span className="font-medium">
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>VIN</span>
                                  <span className="text-slate-500 text-xs">{vehicle.vin || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Monthly Cost</span>
                                  <span>{formatCurrency(metrics.vehicleMonthlyCost)}</span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                  <span>Cost/Billable Hr</span>
                                  <span>{formatCurrency(metrics.vehicleCostPerHour, 2)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="text-slate-500 italic">No vehicle assigned</div>
                            )}

                            {/* Total Cost Summary */}
                            <div className="mt-4 pt-4 border-t border-violet-300">
                              <h4 className="font-medium text-violet-800 mb-3">Total Cost Summary</h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span>True Cost/Hr</span>
                                  <span className="font-medium">
                                    {formatCurrency(metrics.trueCostPerHour, 2)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Vehicle Cost/Hr</span>
                                  <span>+{formatCurrency(metrics.vehicleCostPerHour, 2)}</span>
                                </div>
                                <div className="border-t border-violet-300 pt-2 flex justify-between font-bold text-violet-700">
                                  <span>Loaded Cost/Hr</span>
                                  <span>{formatCurrency(metrics.loadedCostPerHour, 2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons Footer */}
                      <div className="px-4 pb-4 flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTechnician(tech);
                          }}
                        >
                          <Edit2 className="w-4 h-4 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTechnician?.(tech.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Office Staff Section */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-slate-800">Office Staff</h3>
            <p className="text-sm text-slate-500">Non-billable employee costs (flows to overhead)</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1" onClick={handleAddStaff}>
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-right">Pay</th>
                <th className="px-4 py-3 text-right">Burden %</th>
                <th className="px-4 py-3 text-right">Annual Cost</th>
                <th className="px-4 py-3 text-right">Monthly</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeOfficeStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No office staff added yet.
                  </td>
                </tr>
              ) : (
                activeOfficeStaff.map((staff) => {
                  const displayName = staff.display_name || `${staff.first_name} ${staff.last_name}`;
                  const monthlyCost = staff.calculated_monthly_cost || 0;
                  const annualCost = monthlyCost * 12;
                  const basePay =
                    staff.pay_type === 'salary'
                      ? staff.annual_salary || 0
                      : (staff.base_pay_rate || 0) * (staff.hours_per_week || 40) * 52;
                  const burdenPercent = basePay > 0 ? ((annualCost - basePay) / basePay) * 100 : 0;

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-semibold">
                            {getInitials(displayName)}
                          </div>
                          <span className="font-medium">{displayName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{staff.role}</td>
                      <td className="px-4 py-3 text-right">
                        {staff.pay_type === 'salary'
                          ? `${formatCurrency(staff.annual_salary || 0)}/yr`
                          : `${formatCurrency(staff.base_pay_rate || 0, 2)}/hr`}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600">
                        {formatPercent(burdenPercent)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(annualCost)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(monthlyCost)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditStaff(staff)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-100"
                          onClick={() => onDeleteOfficeStaff?.(staff.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {activeOfficeStaff.length > 0 && (
              <tfoot className="bg-slate-100 font-semibold">
                <tr>
                  <td className="px-4 py-3" colSpan={4}>
                    Total Office Staff Cost
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(calculations?.totalStaffCostAnnual || 0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency((calculations?.totalStaffCostAnnual || 0) / 12)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modals */}
      <TechnicianModal
        isOpen={techModalOpen}
        onClose={() => {
          setTechModalOpen(false);
          setSelectedTechnician(null);
        }}
        onSave={handleSaveTechnician}
        technician={selectedTechnician}
        vehicles={data.vehicles}
        isLoading={isLoading}
      />

      <OfficeStaffModal
        isOpen={staffModalOpen}
        onClose={() => {
          setStaffModalOpen(false);
          setSelectedStaff(null);
        }}
        onSave={handleSaveStaff}
        staff={selectedStaff}
        isLoading={isLoading}
      />
    </div>
  );
}
