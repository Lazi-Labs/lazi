'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { apiUrl } from '@/lib/api';
import {
  Users,
  Truck,
  Receipt,
  Calculator,
  BarChart3,
  TrendingUp,
  Target,
  DollarSign,
  Clock,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Building2,
  Shield,
  Laptop,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  role: string;
  status: string;
  pay_type: string;
  base_pay_rate: number | null;
  annual_salary: number | null;
  paid_hours_per_day: number;
  payroll_tax_rate: number | null;
  futa_rate: number | null;
  suta_rate: number | null;
  workers_comp_rate: number | null;
  health_insurance_monthly: number;
  retirement_401k_match_percent: number;
  assigned_vehicle_id: string | null;
}

interface OfficeStaff {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  role: string;
  status: string;
  pay_type: string;
  base_pay_rate: number | null;
  annual_salary: number | null;
  hours_per_week: number;
  payroll_tax_rate: number | null;
  futa_rate: number | null;
  suta_rate: number | null;
  workers_comp_rate: number | null;
  health_insurance_monthly: number;
}

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  status: string;
  assigned_driver_id: string | null;
  loan_balance: number;
  monthly_payment: number;
  market_value: number;
  insurance_monthly: number;
  fuel_monthly: number;
  maintenance_monthly: number;
  calculated_total_monthly_cost: number;
}

interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  calculated_monthly_amount: number;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  items: ExpenseItem[];
  calculated_monthly_total: number;
}

interface PricingData {
  totalTechnicians: number;
  totalOfficeStaff: number;
  avgBurdenPercent: number;
  avgEfficiencyPercent: number;
  avgTrueCostPerHour: number;
  totalBillableHoursPerYear: number;
  totalLaborCostAnnual: number;
  totalVehicles: number;
  activeVehicles: number;
  fleetCostMonthly: number;
  fleetCostPerBillableHour: number;
  overheadMonthly: number;
  overheadAnnual: number;
  overheadPerBillableHour: number;
  officeStaffCostAnnual: number;
  loadedCostPerHour: number;
  jobTypeRates: Array<{
    jobTypeId: string;
    name: string;
    code: string | null;
    hourlyRate: number;
    memberRate: number;
    minInvoice: number;
    targetMargin: number;
  }>;
  projectedRevenue: number;
  materialCost: number;
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  breakEvenMonthly: number;
  breakEvenDaily: number;
  breakEvenAnnual: number;
  revenuePerTechAnnual: number;
  revenuePerTechMonthly: number;
  technicianMetrics: Array<{
    id: string;
    name: string;
    annualBasePay: number;
    totalBurden: number;
    burdenPercent: number;
    billableHoursPerDay: number;
    billableHoursPerYear: number;
    efficiencyPercent: number;
    trueCostPerHour: number;
    assignedVehicleId: string | null;
  }>;
}

// Helpers
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

const iconMap: Record<string, React.ElementType> = {
  Building2,
  Shield,
  Laptop,
  Megaphone,
  Calculator,
  Receipt,
};

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Technician Form Dialog
function TechnicianFormDialog({
  open,
  onOpenChange,
  technician,
  vehicles,
  onSave,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technician: Technician | null;
  vehicles: Vehicle[];
  onSave: (data: Partial<Technician>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<Technician>>(
    technician || {
      first_name: '',
      last_name: '',
      role: 'Technician',
      status: 'active',
      pay_type: 'hourly',
      base_pay_rate: 0,
      paid_hours_per_day: 8,
      payroll_tax_rate: 7.65,
      futa_rate: 0.6,
      suta_rate: 2.7,
      workers_comp_rate: 8.5,
      health_insurance_monthly: 0,
      retirement_401k_match_percent: 0,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{technician ? 'Edit Technician' : 'Add Technician'}</DialogTitle>
          <DialogDescription>
            {technician ? 'Update technician details and burden rates.' : 'Add a new field technician to your workforce.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name || ''}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name || ''}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={formData.role || ''}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay_type">Pay Type</Label>
              <Select
                value={formData.pay_type || 'hourly'}
                onValueChange={(v) => setFormData({ ...formData, pay_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_pay_rate">Hourly Rate ($)</Label>
              <Input
                id="base_pay_rate"
                type="number"
                step="0.01"
                value={formData.base_pay_rate || 0}
                onChange={(e) => setFormData({ ...formData, base_pay_rate: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid_hours_per_day">Paid Hours/Day</Label>
              <Input
                id="paid_hours_per_day"
                type="number"
                step="0.5"
                value={formData.paid_hours_per_day || 8}
                onChange={(e) => setFormData({ ...formData, paid_hours_per_day: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Burden Rates</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payroll_tax_rate">FICA (%)</Label>
                <Input
                  id="payroll_tax_rate"
                  type="number"
                  step="0.01"
                  value={formData.payroll_tax_rate || 7.65}
                  onChange={(e) => setFormData({ ...formData, payroll_tax_rate: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="futa_rate">FUTA (%)</Label>
                <Input
                  id="futa_rate"
                  type="number"
                  step="0.01"
                  value={formData.futa_rate || 0.6}
                  onChange={(e) => setFormData({ ...formData, futa_rate: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suta_rate">SUTA (%)</Label>
                <Input
                  id="suta_rate"
                  type="number"
                  step="0.01"
                  value={formData.suta_rate || 2.7}
                  onChange={(e) => setFormData({ ...formData, suta_rate: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workers_comp_rate">Workers Comp (%)</Label>
                <Input
                  id="workers_comp_rate"
                  type="number"
                  step="0.01"
                  value={formData.workers_comp_rate || 8.5}
                  onChange={(e) => setFormData({ ...formData, workers_comp_rate: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Benefits</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="health_insurance_monthly">Health Insurance ($/mo)</Label>
                <Input
                  id="health_insurance_monthly"
                  type="number"
                  step="1"
                  value={formData.health_insurance_monthly || 0}
                  onChange={(e) => setFormData({ ...formData, health_insurance_monthly: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retirement_401k_match_percent">401k Match (%)</Label>
                <Input
                  id="retirement_401k_match_percent"
                  type="number"
                  step="0.5"
                  value={formData.retirement_401k_match_percent || 0}
                  onChange={(e) => setFormData({ ...formData, retirement_401k_match_percent: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="assigned_vehicle_id">Assigned Vehicle</Label>
              <Select
                value={formData.assigned_vehicle_id || 'none'}
                onValueChange={(v) => setFormData({ ...formData, assigned_vehicle_id: v === 'none' ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No vehicle assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No vehicle assigned</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model} - {v.vin?.slice(-6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Vehicle Form Dialog
function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
  technicians,
  onSave,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  technicians: Technician[];
  onSave: (data: Partial<Vehicle>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<Vehicle>>(
    vehicle || {
      year: new Date().getFullYear(),
      make: 'Ford',
      model: 'Transit 250',
      vin: '',
      status: 'reserve',
      loan_balance: 0,
      monthly_payment: 0,
      market_value: 0,
      insurance_monthly: 0,
      fuel_monthly: 0,
      maintenance_monthly: 0,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
          <DialogDescription>
            {vehicle ? 'Update vehicle details and costs.' : 'Add a new vehicle to your fleet.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={formData.year || new Date().getFullYear()}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                value={formData.make || ''}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                value={formData.vin || ''}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || 'reserve'}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="reserve">Reserve</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Financial</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loan_balance">Loan Balance ($)</Label>
                <Input
                  id="loan_balance"
                  type="number"
                  step="0.01"
                  value={formData.loan_balance || 0}
                  onChange={(e) => setFormData({ ...formData, loan_balance: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthly_payment">Monthly Payment ($)</Label>
                <Input
                  id="monthly_payment"
                  type="number"
                  step="0.01"
                  value={formData.monthly_payment || 0}
                  onChange={(e) => setFormData({ ...formData, monthly_payment: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="market_value">Market Value ($)</Label>
                <Input
                  id="market_value"
                  type="number"
                  step="0.01"
                  value={formData.market_value || 0}
                  onChange={(e) => setFormData({ ...formData, market_value: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Monthly Operating Costs</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insurance_monthly">Insurance ($)</Label>
                <Input
                  id="insurance_monthly"
                  type="number"
                  step="0.01"
                  value={formData.insurance_monthly || 0}
                  onChange={(e) => setFormData({ ...formData, insurance_monthly: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel_monthly">Fuel ($)</Label>
                <Input
                  id="fuel_monthly"
                  type="number"
                  step="0.01"
                  value={formData.fuel_monthly || 0}
                  onChange={(e) => setFormData({ ...formData, fuel_monthly: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance_monthly">Maintenance ($)</Label>
                <Input
                  id="maintenance_monthly"
                  type="number"
                  step="0.01"
                  value={formData.maintenance_monthly || 0}
                  onChange={(e) => setFormData({ ...formData, maintenance_monthly: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="assigned_driver_id">Assigned Driver</Label>
              <Select
                value={formData.assigned_driver_id || 'none'}
                onValueChange={(v) => setFormData({ ...formData, assigned_driver_id: v === 'none' ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No driver assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No driver assigned</SelectItem>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.display_name} - {t.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Expense Item Form Dialog
function ExpenseItemFormDialog({
  open,
  onOpenChange,
  item,
  categoryId,
  onSave,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ExpenseItem | null;
  categoryId: string;
  onSave: (data: Partial<ExpenseItem> & { category_id: string }) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<ExpenseItem>>(
    item || {
      name: '',
      amount: 0,
      frequency: 'monthly',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...formData, category_id: categoryId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount || 0}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={formData.frequency || 'monthly'}
                onValueChange={(v) => setFormData({ ...formData, frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Main Component
export function PricingBuilderPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const queryClient = useQueryClient();

  // Dialog states
  const [techDialogOpen, setTechDialogOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [expenseCategoryId, setExpenseCategoryId] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // Queries
  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['pricing-calculations'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/pricing'));
      if (!res.ok) throw new Error('Failed to fetch pricing data');
      const json = await res.json();
      return json.data as PricingData;
    },
    staleTime: 30000,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['pricing-technicians'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/pricing/technicians'));
      const json = await res.json();
      return (json.data || []) as Technician[];
    },
  });

  const { data: officeStaff = [] } = useQuery({
    queryKey: ['pricing-office-staff'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/pricing/office-staff'));
      const json = await res.json();
      return (json.data || []) as OfficeStaff[];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['pricing-vehicles'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/pricing/vehicles'));
      const json = await res.json();
      return (json.data || []) as Vehicle[];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['pricing-expenses'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/pricebook/pricing/expenses'));
      const json = await res.json();
      return (json.data || []) as ExpenseCategory[];
    },
  });

  // Mutations
  const saveTechMutation = useMutation({
    mutationFn: async (data: Partial<Technician>) => {
      const url = editingTech
        ? apiUrl(`/api/pricebook/pricing/technicians/${editingTech.id}`)
        : apiUrl('/api/pricebook/pricing/technicians');
      const method = editingTech ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-technicians'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-calculations'] });
      setTechDialogOpen(false);
      setEditingTech(null);
    },
  });

  const saveVehicleMutation = useMutation({
    mutationFn: async (data: Partial<Vehicle>) => {
      const url = editingVehicle
        ? apiUrl(`/api/pricebook/pricing/vehicles/${editingVehicle.id}`)
        : apiUrl('/api/pricebook/pricing/vehicles');
      const method = editingVehicle ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-calculations'] });
      setVehicleDialogOpen(false);
      setEditingVehicle(null);
    },
  });

  const saveExpenseMutation = useMutation({
    mutationFn: async (data: Partial<ExpenseItem> & { category_id: string }) => {
      const url = editingExpense
        ? apiUrl(`/api/pricebook/pricing/expenses/${editingExpense.id}`)
        : apiUrl('/api/pricebook/pricing/expenses');
      const method = editingExpense ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-calculations'] });
      setExpenseDialogOpen(false);
      setEditingExpense(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const endpoint = type === 'technician' ? 'technicians' : type === 'vehicle' ? 'vehicles' : 'expenses';
      const res = await fetch(apiUrl(`/api/pricebook/pricing/${endpoint}/${id}`), {
        method: 'DELETE',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-technicians'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-calculations'] });
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    },
  });

  const toggleCategory = (id: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  if (pricingLoading) {
    return <LoadingSkeleton />;
  }

  const data = pricingData || {} as PricingData;

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-6 py-3">
          <TabsList className="grid w-full max-w-3xl grid-cols-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="workforce" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Workforce</span>
            </TabsTrigger>
            <TabsTrigger value="fleet" className="gap-2">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Fleet</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="rates" className="gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Rates</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">P&L</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Total Technicians" value={data.totalTechnicians?.toString() || '0'} subtitle="Active field technicians" icon={Users} />
              <StatCard title="Avg. True Cost/Hr" value={formatCurrency(data.avgTrueCostPerHour || 0)} subtitle="Per billable hour" icon={DollarSign} />
              <StatCard title="Avg. Efficiency" value={formatPercent(data.avgEfficiencyPercent || 0)} subtitle="Billable vs paid hours" icon={Clock} />
              <StatCard title="Avg. Burden" value={formatPercent(data.avgBurdenPercent || 0)} subtitle="Above base pay" icon={TrendingUp} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Fleet Cost" value={formatCurrency(data.fleetCostMonthly || 0)} subtitle="Monthly total" icon={Truck} />
              <StatCard title="Overhead" value={formatCurrency(data.overheadMonthly || 0)} subtitle="Monthly fixed costs" icon={Receipt} />
              <StatCard title="Loaded Cost/Hr" value={formatCurrency(data.loadedCostPerHour || 0)} subtitle="Labor + vehicle allocation" icon={Calculator} />
              <StatCard title="Break-Even" value={formatCurrency(data.breakEvenMonthly || 0)} subtitle="Monthly target" icon={Target} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>P&L Projections</CardTitle>
                  <CardDescription>Annual financial summary</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Projected Revenue</span>
                    <span className="font-semibold">{formatCurrency(data.projectedRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Gross Profit</span>
                    <span className="font-semibold text-green-600">{formatCurrency(data.grossProfit || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Gross Margin</span>
                    <Badge variant="outline">{formatPercent(data.grossMargin || 0)}</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Net Margin</span>
                    <Badge variant={(data.netMargin || 0) >= 15 ? 'default' : 'destructive'}>
                      {formatPercent(data.netMargin || 0)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Job Type Rates</CardTitle>
                  <CardDescription>Calculated hourly rates by job type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(data.jobTypeRates || []).map((jt) => (
                      <div key={jt.jobTypeId} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <div className="font-medium">{jt.name}</div>
                          <div className="text-xs text-muted-foreground">Target: {formatPercent(jt.targetMargin)} margin</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(jt.hourlyRate)}/hr</div>
                          <div className="text-xs text-muted-foreground">Member: {formatCurrency(jt.memberRate)}/hr</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Workforce Tab */}
          <TabsContent value="workforce" className="mt-0 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Workforce Management</h2>
                <p className="text-muted-foreground">Manage technicians and office staff</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { setEditingTech(null); setTechDialogOpen(true); }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Technician
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Total Technicians" value={technicians.length.toString()} subtitle="Active field technicians" icon={Users} />
              <StatCard title="Office Staff" value={officeStaff.length.toString()} subtitle="Non-billable employees" icon={Users} />
              <StatCard title="Total Billable Hours" value={(data.totalBillableHoursPerYear || 0).toLocaleString()} subtitle="Annual capacity" icon={Clock} />
              <StatCard title="Total Labor Cost" value={formatCurrency(data.totalLaborCostAnnual || 0)} subtitle="Annual (base + burden)" icon={DollarSign} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Technicians</CardTitle>
                <CardDescription>Field technicians and their cost metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {technicians.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No technicians configured. Click "Add Technician" to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Name</th>
                          <th className="text-left py-2 px-2">Role</th>
                          <th className="text-right py-2 px-2">Rate</th>
                          <th className="text-right py-2 px-2">Health Ins.</th>
                          <th className="text-right py-2 px-2">True Cost/Hr</th>
                          <th className="text-right py-2 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {technicians.map((tech) => {
                          const metrics = (data.technicianMetrics || []).find((m) => m.id === tech.id);
                          return (
                            <tr key={tech.id} className="border-b last:border-0">
                              <td className="py-2 px-2 font-medium">{tech.display_name}</td>
                              <td className="py-2 px-2">{tech.role}</td>
                              <td className="text-right py-2 px-2">${tech.base_pay_rate}/hr</td>
                              <td className="text-right py-2 px-2">${tech.health_insurance_monthly}/mo</td>
                              <td className="text-right py-2 px-2 font-semibold">
                                {formatCurrency(metrics?.trueCostPerHour || 0)}
                              </td>
                              <td className="text-right py-2 px-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setEditingTech(tech); setTechDialogOpen(true); }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setDeleteTarget({ type: 'technician', id: tech.id, name: tech.display_name });
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Office Staff</CardTitle>
                <CardDescription>Non-billable administrative employees</CardDescription>
              </CardHeader>
              <CardContent>
                {officeStaff.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No office staff configured.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Name</th>
                          <th className="text-left py-2 px-2">Role</th>
                          <th className="text-right py-2 px-2">Pay</th>
                          <th className="text-right py-2 px-2">Hours/Wk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {officeStaff.map((staff) => (
                          <tr key={staff.id} className="border-b last:border-0">
                            <td className="py-2 px-2 font-medium">{staff.display_name}</td>
                            <td className="py-2 px-2">{staff.role}</td>
                            <td className="text-right py-2 px-2">
                              {staff.pay_type === 'salary'
                                ? `${formatCurrency(staff.annual_salary || 0)}/yr`
                                : `$${staff.base_pay_rate}/hr`}
                            </td>
                            <td className="text-right py-2 px-2">{staff.hours_per_week}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fleet Tab */}
          <TabsContent value="fleet" className="mt-0 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Fleet Management</h2>
                <p className="text-muted-foreground">Manage vehicles and costs</p>
              </div>
              <Button onClick={() => { setEditingVehicle(null); setVehicleDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Total Vehicles" value={vehicles.length.toString()} subtitle="In fleet" icon={Truck} />
              <StatCard title="Active Vehicles" value={vehicles.filter((v) => v.status === 'active').length.toString()} subtitle="In service" icon={Truck} />
              <StatCard title="Monthly Fleet Cost" value={formatCurrency(data.fleetCostMonthly || 0)} subtitle="All vehicle expenses" icon={DollarSign} />
              <StatCard title="Cost Per Billable Hour" value={formatCurrency(data.fleetCostPerBillableHour || 0)} subtitle="Fleet allocation" icon={Calculator} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Vehicles</CardTitle>
                <CardDescription>Fleet inventory and costs</CardDescription>
              </CardHeader>
              <CardContent>
                {vehicles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No vehicles configured. Click "Add Vehicle" to get started.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Vehicle</th>
                          <th className="text-left py-2 px-2">VIN</th>
                          <th className="text-center py-2 px-2">Status</th>
                          <th className="text-right py-2 px-2">Payment</th>
                          <th className="text-right py-2 px-2">Total/Mo</th>
                          <th className="text-right py-2 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicles.map((v) => (
                          <tr key={v.id} className="border-b last:border-0">
                            <td className="py-2 px-2 font-medium">
                              {v.year} {v.make} {v.model}
                            </td>
                            <td className="py-2 px-2 text-muted-foreground">{v.vin?.slice(-6) || '-'}</td>
                            <td className="text-center py-2 px-2">
                              <Badge
                                variant={
                                  v.status === 'active'
                                    ? 'default'
                                    : v.status === 'maintenance'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {v.status}
                              </Badge>
                            </td>
                            <td className="text-right py-2 px-2">{formatCurrency(v.monthly_payment)}</td>
                            <td className="text-right py-2 px-2 font-semibold">
                              {formatCurrency(v.calculated_total_monthly_cost || 0)}
                            </td>
                            <td className="text-right py-2 px-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditingVehicle(v); setVehicleDialogOpen(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeleteTarget({ type: 'vehicle', id: v.id, name: `${v.year} ${v.make} ${v.model}` });
                                  setDeleteConfirmOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="mt-0 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Expense Management</h2>
                <p className="text-muted-foreground">Track overhead and operating costs</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Monthly Overhead" value={formatCurrency(data.overheadMonthly || 0)} subtitle="Fixed operating costs" icon={Receipt} />
              <StatCard title="Annual Overhead" value={formatCurrency(data.overheadAnnual || 0)} subtitle="Yearly total" icon={Receipt} />
              <StatCard title="Overhead/Billable Hr" value={formatCurrency(data.overheadPerBillableHour || 0)} subtitle="Allocation per hour" icon={Calculator} />
              <StatCard title="Office Staff Cost" value={formatCurrency(data.officeStaffCostAnnual || 0)} subtitle="Annual total" icon={Users} />
            </div>

            <div className="space-y-4">
              {expenses.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-muted-foreground">
                      No expense categories configured.
                    </div>
                  </CardContent>
                </Card>
              ) : (
                expenses.map((category) => {
                  const IconComponent = iconMap[category.icon] || Receipt;
                  const isExpanded = expandedCategories.has(category.id);
                  return (
                    <Card key={category.id}>
                      <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(category.id)}>
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-muted/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                <IconComponent className="h-5 w-5 text-muted-foreground" />
                                <div>
                                  <CardTitle className="text-base">{category.name}</CardTitle>
                                  {category.description && (
                                    <CardDescription>{category.description}</CardDescription>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">
                                  {formatCurrency(category.calculated_monthly_total || 0)}/mo
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {(category.items || []).length} items
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <CardContent>
                            <div className="space-y-2">
                              {(category.items || []).map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                                >
                                  <div>
                                    <div className="font-medium">{item.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {formatCurrency(item.amount)} / {item.frequency}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="font-semibold">
                                        {formatCurrency(item.calculated_monthly_amount || 0)}/mo
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setEditingExpense(item);
                                          setExpenseCategoryId(category.id);
                                          setExpenseDialogOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setDeleteTarget({ type: 'expense', id: item.id, name: item.name });
                                          setDeleteConfirmOpen(true);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-2"
                                onClick={() => {
                                  setEditingExpense(null);
                                  setExpenseCategoryId(category.id);
                                  setExpenseDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                              </Button>
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Rates Tab */}
          <TabsContent value="rates" className="mt-0 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Loaded Cost/Hr" value={formatCurrency(data.loadedCostPerHour || 0)} subtitle="Base for rate calculation" icon={Calculator} />
              <StatCard title="Avg. True Cost/Hr" value={formatCurrency(data.avgTrueCostPerHour || 0)} subtitle="Labor cost only" icon={DollarSign} />
              <StatCard title="Fleet/Hr" value={formatCurrency(data.fleetCostPerBillableHour || 0)} subtitle="Vehicle allocation" icon={Truck} />
              <StatCard title="Overhead/Hr" value={formatCurrency(data.overheadPerBillableHour || 0)} subtitle="Fixed cost allocation" icon={Receipt} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Job Type Rate Cards</CardTitle>
                <CardDescription>Calculated rates based on cost structure and target margins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(data.jobTypeRates || []).map((jt) => (
                    <Card key={jt.jobTypeId} className="border-2">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{jt.name}</CardTitle>
                          {jt.code && <Badge variant="outline">{jt.code}</Badge>}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Standard Rate</span>
                          <span className="text-xl font-bold">{formatCurrency(jt.hourlyRate)}/hr</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Member Rate</span>
                          <span className="font-semibold text-green-600">{formatCurrency(jt.memberRate)}/hr</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Min Invoice</span>
                          <span className="font-medium">{formatCurrency(jt.minInvoice)}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Target Margin</span>
                            <Badge>{formatPercent(jt.targetMargin)}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="mt-0 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Projected Revenue" value={formatCurrency(data.projectedRevenue || 0)} subtitle="Annual target" icon={Target} />
              <StatCard title="Gross Profit" value={formatCurrency(data.grossProfit || 0)} subtitle={`${formatPercent(data.grossMargin || 0)} margin`} icon={TrendingUp} />
              <StatCard title="Net Profit" value={formatCurrency(data.netProfit || 0)} subtitle={`${formatPercent(data.netMargin || 0)} margin`} icon={DollarSign} />
              <StatCard title="Break-Even" value={formatCurrency(data.breakEvenAnnual || 0)} subtitle="Annual minimum" icon={Target} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Break-Even Analysis</CardTitle>
                  <CardDescription>Revenue targets to cover all costs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Daily Break-Even</span>
                    <span className="font-semibold">{formatCurrency(data.breakEvenDaily || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Monthly Break-Even</span>
                    <span className="font-semibold">{formatCurrency(data.breakEvenMonthly || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Annual Break-Even</span>
                    <span className="font-bold text-lg">{formatCurrency(data.breakEvenAnnual || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Per-Technician Metrics</CardTitle>
                  <CardDescription>Revenue and production targets</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Revenue/Tech (Annual)</span>
                    <span className="font-semibold">{formatCurrency(data.revenuePerTechAnnual || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Revenue/Tech (Monthly)</span>
                    <span className="font-semibold">{formatCurrency(data.revenuePerTechMonthly || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Total Billable Hours</span>
                    <span className="font-bold">{(data.totalBillableHoursPerYear || 0).toLocaleString()} hrs/yr</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialogs */}
      <TechnicianFormDialog
        open={techDialogOpen}
        onOpenChange={setTechDialogOpen}
        technician={editingTech}
        vehicles={vehicles}
        onSave={(data) => saveTechMutation.mutate(data)}
        isLoading={saveTechMutation.isPending}
      />

      <VehicleFormDialog
        open={vehicleDialogOpen}
        onOpenChange={setVehicleDialogOpen}
        vehicle={editingVehicle}
        technicians={technicians}
        onSave={(data) => saveVehicleMutation.mutate(data)}
        isLoading={saveVehicleMutation.isPending}
      />

      <ExpenseItemFormDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        item={editingExpense}
        categoryId={expenseCategoryId}
        onSave={(data) => saveExpenseMutation.mutate(data)}
        isLoading={saveExpenseMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
