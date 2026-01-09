import React, { useState, useMemo, useCallback } from 'react';
import { 
  Calculator, DollarSign, Percent, Clock, Users, TrendingUp, Settings, ChevronDown, ChevronRight, 
  Info, Save, RotateCcw, Layers, Target, Zap, Building2, Wrench, BarChart3, PieChart, AlertCircle, 
  CheckCircle2, Plus, Trash2, Copy, Edit3, Lock, Unlock, Package, Cpu, Link2, Unlink, ArrowRight, 
  FlipHorizontal, TestTube, Sparkles, HelpCircle, GripVertical, Truck, Fuel, Shield, CreditCard,
  FileText, TrendingDown, AlertTriangle, Check, X, ChevronUp, MoreHorizontal, Home, Monitor,
  Megaphone, GraduationCap, Landmark, Receipt, Calendar, MapPin, Hash, Car, CircleDollarSign,
  PiggyBank, Wallet, ArrowUpRight, ArrowDownRight, Eye, EyeOff, Moon, Sun, Bell, Database,
  Download, Upload, RefreshCw, Activity, Timer, Briefcase, UserPlus, UserCog, Coffee, 
  Route, ClipboardList, Phone, Mail, Award, Heart, Umbrella, BadgeDollarSign, UserCircle,
  Users2, HardHat, Headphones, Building, CarFront, CircleUser, Banknote, PauseCircle, PlayCircle
} from 'lucide-react';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num || 0);
const formatCurrencyShort = (num) => {
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return formatCurrency(num);
};
const formatPercent = (num) => `${(num || 0).toFixed(2)}%`;
const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);

// Calculation helpers
const calcBurdenedRate = (base, burdenPct) => base * (1 + burdenPct / 100);
const calcEfficiencyAdjusted = (rate, effPct) => rate / (effPct / 100);
const calcHourlyRate = (adjusted, marginPct) => adjusted / (1 - marginPct / 100);
const calcMarkupFromMargin = (margin) => margin / (100 - margin) * 100;
const calcMarginFromMarkup = (markup) => markup / (100 + markup) * 100;
const calcMultiplierFromMargin = (margin) => 1 / (1 - margin / 100);
const calcSellPrice = (cost, margin) => cost / (1 - margin / 100);

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialTechnicians = [
  {
    id: 1,
    name: 'Mike Johnson',
    role: 'Lead Technician',
    status: 'active',
    hireDate: '2022-03-15',
    email: 'mike@perfectcatch.com',
    phone: '(555) 123-4567',
    assignedVehicleId: 1,
    // Pay Structure
    payType: 'hourly', // 'hourly' or 'salary'
    basePayRate: 35.00,
    annualSalary: null,
    // Burden Components
    payrollTaxRate: 7.65, // FICA (Social Security 6.2% + Medicare 1.45%)
    futaRate: 0.6, // Federal Unemployment
    sutaRate: 2.7, // State Unemployment (varies by state)
    workersCompRate: 8.5, // Workers comp % (high for trades)
    healthInsurance: 450, // Monthly employer contribution
    dentalVision: 75, // Monthly
    retirement401k: 3, // % match
    otherBenefits: 50, // Monthly (life insurance, etc.)
    // Unproductive Time (hours per day)
    paidHoursPerDay: 8,
    unproductiveTime: [
      { id: 1, name: 'Morning Meeting', hours: 0.5, paid: true },
      { id: 2, name: 'Drive Time', hours: 1.5, paid: true },
      { id: 3, name: 'Lunch Break', hours: 0.5, paid: false },
      { id: 4, name: 'Paperwork/Admin', hours: 0.5, paid: true },
    ],
  },
  {
    id: 2,
    name: 'David Rodriguez',
    role: 'Lead Technician',
    status: 'active',
    hireDate: '2021-08-01',
    email: 'david@perfectcatch.com',
    phone: '(555) 234-5678',
    assignedVehicleId: 2,
    payType: 'hourly',
    basePayRate: 35.00,
    annualSalary: null,
    payrollTaxRate: 7.65,
    futaRate: 0.6,
    sutaRate: 2.7,
    workersCompRate: 8.5,
    healthInsurance: 450,
    dentalVision: 75,
    retirement401k: 3,
    otherBenefits: 50,
    paidHoursPerDay: 8,
    unproductiveTime: [
      { id: 1, name: 'Morning Meeting', hours: 0.5, paid: true },
      { id: 2, name: 'Drive Time', hours: 1.5, paid: true },
      { id: 3, name: 'Lunch Break', hours: 0.5, paid: false },
      { id: 4, name: 'Paperwork/Admin', hours: 0.5, paid: true },
    ],
  },
  {
    id: 3,
    name: 'Chris Thompson',
    role: 'Lead Technician',
    status: 'active',
    hireDate: '2023-01-10',
    email: 'chris@perfectcatch.com',
    phone: '(555) 345-6789',
    assignedVehicleId: 3,
    payType: 'hourly',
    basePayRate: 32.00,
    annualSalary: null,
    payrollTaxRate: 7.65,
    futaRate: 0.6,
    sutaRate: 2.7,
    workersCompRate: 8.5,
    healthInsurance: 450,
    dentalVision: 75,
    retirement401k: 3,
    otherBenefits: 50,
    paidHoursPerDay: 8,
    unproductiveTime: [
      { id: 1, name: 'Morning Meeting', hours: 0.5, paid: true },
      { id: 2, name: 'Drive Time', hours: 2.0, paid: true },
      { id: 3, name: 'Lunch Break', hours: 0.5, paid: false },
      { id: 4, name: 'Paperwork/Admin', hours: 0.5, paid: true },
    ],
  },
  {
    id: 4,
    name: 'Alex Martinez',
    role: 'Helper/Apprentice',
    status: 'active',
    hireDate: '2023-06-15',
    email: 'alex@perfectcatch.com',
    phone: '(555) 456-7890',
    assignedVehicleId: 5,
    payType: 'hourly',
    basePayRate: 22.00,
    annualSalary: null,
    payrollTaxRate: 7.65,
    futaRate: 0.6,
    sutaRate: 2.7,
    workersCompRate: 8.5,
    healthInsurance: 300,
    dentalVision: 50,
    retirement401k: 3,
    otherBenefits: 25,
    paidHoursPerDay: 8,
    unproductiveTime: [
      { id: 1, name: 'Morning Meeting', hours: 0.5, paid: true },
      { id: 2, name: 'Drive Time', hours: 1.0, paid: true },
      { id: 3, name: 'Lunch Break', hours: 0.5, paid: false },
      { id: 4, name: 'Training', hours: 1.0, paid: true },
    ],
  },
];

const initialOfficeStaff = [
  {
    id: 1,
    name: 'Sarah Wilson',
    role: 'Office Manager',
    status: 'active',
    hireDate: '2020-05-01',
    email: 'sarah@perfectcatch.com',
    phone: '(555) 567-8901',
    payType: 'salary',
    basePayRate: null,
    annualSalary: 55000,
    hoursPerWeek: 40,
    payrollTaxRate: 7.65,
    futaRate: 0.6,
    sutaRate: 2.7,
    workersCompRate: 0.5, // Much lower for office work
    healthInsurance: 500,
    dentalVision: 75,
    retirement401k: 4,
    otherBenefits: 50,
  },
  {
    id: 2,
    name: 'Jennifer Lee',
    role: 'Dispatcher/CSR',
    status: 'active',
    hireDate: '2022-09-15',
    email: 'jennifer@perfectcatch.com',
    phone: '(555) 678-9012',
    payType: 'hourly',
    basePayRate: 20.00,
    annualSalary: null,
    hoursPerWeek: 40,
    payrollTaxRate: 7.65,
    futaRate: 0.6,
    sutaRate: 2.7,
    workersCompRate: 0.5,
    healthInsurance: 400,
    dentalVision: 50,
    retirement401k: 3,
    otherBenefits: 25,
  },
  {
    id: 3,
    name: 'Yanni (Owner)',
    role: 'Owner/Operator',
    status: 'active',
    hireDate: '2018-01-01',
    email: 'yanni@perfectcatch.com',
    phone: '(555) 789-0123',
    payType: 'salary',
    basePayRate: null,
    annualSalary: 96000, // $8k/month draw
    hoursPerWeek: 50,
    payrollTaxRate: 0, // Self-employment handled differently
    futaRate: 0,
    sutaRate: 0,
    workersCompRate: 0,
    healthInsurance: 600,
    dentalVision: 100,
    retirement401k: 0,
    otherBenefits: 100,
  },
];

const initialVehicles = [
  { id: 1, year: 2024, make: 'Ford', model: 'T250', vin: '1FTBR3X8XRKB27688', status: 'active', assignedDriverId: 1, loanBalance: 71048, monthlyPayment: 1527.70, marketValue: 38500, insurance: 200, fuel: 550, maintenance: 75 },
  { id: 2, year: 2024, make: 'Ford', model: 'T250', vin: '1FTBR3X80RKA00562', status: 'active', assignedDriverId: 2, loanBalance: 66699, monthlyPayment: 1549.67, marketValue: 38500, insurance: 200, fuel: 550, maintenance: 75 },
  { id: 3, year: 2024, make: 'Ford', model: 'T250', vin: '1FTBR3X87RKB27552', status: 'active', assignedDriverId: 3, loanBalance: 67533, monthlyPayment: 1508.83, marketValue: 38500, insurance: 200, fuel: 550, maintenance: 75 },
  { id: 4, year: 2023, make: 'Ford', model: 'T250', vin: '1FTBR1C87PKB49980', status: 'reserve', assignedDriverId: null, loanBalance: 49715, monthlyPayment: 1338.71, marketValue: 34000, insurance: 200, fuel: 0, maintenance: 0 },
  { id: 5, year: 2024, make: 'Ford', model: 'T250', vin: '1FTBR3XG2RKB53953', status: 'active', assignedDriverId: 4, loanBalance: 70655, monthlyPayment: 1580.00, marketValue: 36000, insurance: 200, fuel: 0, maintenance: 0 },
  { id: 6, year: 2023, make: 'Ford', model: 'F250', vin: '1FT8W2BM9PEC20408', status: 'active', assignedDriverId: null, loanBalance: 60527, monthlyPayment: 1863.45, marketValue: 0, insurance: 200, fuel: 550, maintenance: 75 },
  { id: 7, year: 2018, make: 'Ford', model: 'T250', vin: '1FTYR1ZM8JKA64488', status: 'maintenance', assignedDriverId: null, loanBalance: 18188, monthlyPayment: 552.70, marketValue: 12850, insurance: 200, fuel: 550, maintenance: 150 },
  { id: 8, year: 2019, make: 'Ford', model: 'T250', vin: '1FTYE1cmxKKA32101', status: 'reserve', assignedDriverId: null, loanBalance: 0, monthlyPayment: 0, marketValue: 18500, insurance: 200, fuel: 0, maintenance: 0 },
];

const initialExpenseCategories = [
  {
    id: 'facility', name: 'Facility & Office', icon: 'Building2', color: 'blue', collapsed: true,
    items: [
      { id: 'rent', name: 'Rent/Lease', amount: 2500, frequency: 'monthly' },
      { id: 'utilities', name: 'Utilities', amount: 450, frequency: 'monthly' },
      { id: 'internet', name: 'Internet/Phone', amount: 275, frequency: 'monthly' },
      { id: 'supplies', name: 'Office Supplies', amount: 150, frequency: 'monthly' },
      { id: 'equipment', name: 'Equipment Lease', amount: 350, frequency: 'monthly' },
    ]
  },
  {
    id: 'insurance', name: 'Business Insurance', icon: 'Shield', color: 'emerald', collapsed: true,
    items: [
      { id: 'gl', name: 'General Liability', amount: 14400, frequency: 'annual' },
      { id: 'eo', name: 'Professional Liability', amount: 3000, frequency: 'annual' },
      { id: 'bond', name: 'Bonding', amount: 1800, frequency: 'annual' },
      { id: 'licenses', name: 'Licenses & Permits', amount: 1200, frequency: 'annual' },
    ]
  },
  {
    id: 'software', name: 'Software & Technology', icon: 'Monitor', color: 'violet', collapsed: true,
    items: [
      { id: 'servicetitan', name: 'ServiceTitan', amount: 1500, frequency: 'monthly' },
      { id: 'quickbooks', name: 'QuickBooks', amount: 150, frequency: 'monthly' },
      { id: 'lazi', name: 'LAZI AI', amount: 299, frequency: 'monthly' },
      { id: 'gsuite', name: 'Google Workspace', amount: 120, frequency: 'monthly' },
      { id: 'other', name: 'Other SaaS', amount: 200, frequency: 'monthly' },
    ]
  },
  {
    id: 'marketing', name: 'Marketing & Advertising', icon: 'Megaphone', color: 'rose', collapsed: true,
    items: [
      { id: 'ppc', name: 'Google Ads / PPC', amount: 2000, frequency: 'monthly' },
      { id: 'seo', name: 'SEO Services', amount: 500, frequency: 'monthly' },
      { id: 'social', name: 'Social Media', amount: 300, frequency: 'monthly' },
      { id: 'print', name: 'Print/Direct Mail', amount: 200, frequency: 'monthly' },
      { id: 'referral', name: 'Referral Program', amount: 250, frequency: 'monthly' },
    ]
  },
  {
    id: 'financial', name: 'Financial & Professional', icon: 'Landmark', color: 'slate', collapsed: true,
    items: [
      { id: 'accounting', name: 'Accounting/Bookkeeping', amount: 500, frequency: 'monthly' },
      { id: 'legal', name: 'Legal Retainer', amount: 200, frequency: 'monthly' },
      { id: 'merchant', name: 'Merchant Processing', amount: 450, frequency: 'monthly' },
      { id: 'loans', name: 'Business Loans', amount: 1200, frequency: 'monthly' },
    ]
  },
  {
    id: 'tools', name: 'Tools & Equipment', icon: 'Wrench', color: 'orange', collapsed: true,
    items: [
      { id: 'replacement', name: 'Tool Replacement', amount: 300, frequency: 'monthly' },
      { id: 'safety', name: 'Safety Equipment', amount: 100, frequency: 'monthly' },
      { id: 'uniforms', name: 'Uniforms', amount: 150, frequency: 'monthly' },
      { id: 'small', name: 'Small Equipment', amount: 200, frequency: 'monthly' },
    ]
  },
  {
    id: 'training', name: 'Training & Development', icon: 'GraduationCap', color: 'teal', collapsed: true,
    items: [
      { id: 'certs', name: 'Certifications', amount: 1800, frequency: 'annual' },
      { id: 'programs', name: 'Training Programs', amount: 2400, frequency: 'annual' },
      { id: 'memberships', name: 'Industry Memberships', amount: 1200, frequency: 'annual' },
    ]
  },
  {
    id: 'misc', name: 'Miscellaneous', icon: 'MoreHorizontal', color: 'gray', collapsed: true,
    items: [
      { id: 'contingency', name: 'Contingency Buffer', amount: 1500, frequency: 'monthly' },
      { id: 'other', name: 'Other Expenses', amount: 500, frequency: 'monthly' },
    ]
  },
];

const initialJobTypes = [
  { id: 'service', name: 'Service Call', description: '4 Hours or Less', minHours: 0, maxHours: 4, targetMargin: 60, memberDiscount: 0, materialMargin: 40, surcharge: 0, active: true },
  { id: 'halfday', name: 'Half Day', description: '4-6 Hours', minHours: 4, maxHours: 6, targetMargin: 60, memberDiscount: 10, materialMargin: 60, surcharge: 0, active: true },
  { id: 'install', name: 'Full/Multi Day Install', description: '6+ Hours', minHours: 6, maxHours: 40, targetMargin: 60, memberDiscount: 10, materialMargin: 65, surcharge: 195, active: true },
];

const initialMarkupTiers = [
  { id: 1, minCost: 0, maxCost: 20, grossMargin: 80 },
  { id: 2, minCost: 20.01, maxCost: 50, grossMargin: 78 },
  { id: 3, minCost: 50.01, maxCost: 1000, grossMargin: 75 },
  { id: 4, minCost: 1000.01, maxCost: 999000, grossMargin: 70 },
];

const defaultUnproductiveTimeTemplates = [
  { id: 'morning', name: 'Morning Meeting', hours: 0.5, paid: true, icon: 'Coffee' },
  { id: 'drive', name: 'Drive Time', hours: 1.5, paid: true, icon: 'Route' },
  { id: 'lunch', name: 'Lunch Break', hours: 0.5, paid: false, icon: 'Coffee' },
  { id: 'paperwork', name: 'Paperwork/Admin', hours: 0.5, paid: true, icon: 'ClipboardList' },
  { id: 'training', name: 'Training', hours: 0, paid: true, icon: 'GraduationCap' },
  { id: 'warehouse', name: 'Warehouse/Parts', hours: 0.25, paid: true, icon: 'Package' },
  { id: 'breaks', name: 'Breaks', hours: 0.25, paid: true, icon: 'PauseCircle' },
];

const initialSettings = {
  companyName: 'Perfect Catch & Pools',
  workingDaysPerYear: 260,
  weeksPerYear: 52,
  targetAnnualRevenue: 2205000,
  materialCostPercent: 20,
  showVehicleCostInRate: true,
  darkMode: false,
  autoSave: true,
  currency: 'USD',
};

// ============================================================================
// ICON MAPPER
// ============================================================================

const IconMap = {
  Building2, Shield, Monitor, Megaphone, Users, Landmark, Wrench, GraduationCap, MoreHorizontal, Truck,
  Coffee, Route, ClipboardList, Package, PauseCircle, UserCircle, HardHat, Headphones
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdvancedPricingSystem() {
  // State
  const [activeTab, setActiveTab] = useState('workforce');
  const [workforceSubTab, setWorkforceSubTab] = useState('technicians');
  const [technicians, setTechnicians] = useState(initialTechnicians);
  const [officeStaff, setOfficeStaff] = useState(initialOfficeStaff);
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [expenseCategories, setExpenseCategories] = useState(initialExpenseCategories);
  const [jobTypes, setJobTypes] = useState(initialJobTypes);
  const [markupTiers, setMarkupTiers] = useState(initialMarkupTiers);
  const [settings, setSettings] = useState(initialSettings);
  const [scenarios, setScenarios] = useState([]);
  const [activeScenario, setActiveScenario] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // UI State
  const [expandedTechId, setExpandedTechId] = useState(null);
  const [expandedStaffId, setExpandedStaffId] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [testCalculator, setTestCalculator] = useState({ isOpen: false, cost: 75, quantity: 1 });
  const [linkEquipmentToMaterials, setLinkEquipmentToMaterials] = useState(true);
  
  // ============================================================================
  // TECHNICIAN CALCULATIONS
  // ============================================================================
  
  const technicianCalculations = useMemo(() => {
    return technicians.map(tech => {
      const hoursPerYear = tech.paidHoursPerDay * settings.workingDaysPerYear;
      const hoursPerWeek = tech.paidHoursPerDay * 5;
      const annualBasePay = tech.basePayRate * hoursPerYear;
      
      // Calculate burden costs (annual)
      const payrollTaxes = annualBasePay * (tech.payrollTaxRate / 100);
      const futa = Math.min(annualBasePay, 7000) * (tech.futaRate / 100); // FUTA only on first $7k
      const suta = annualBasePay * (tech.sutaRate / 100);
      const workersComp = annualBasePay * (tech.workersCompRate / 100);
      const healthInsuranceAnnual = tech.healthInsurance * 12;
      const dentalVisionAnnual = tech.dentalVision * 12;
      const retirement401kAnnual = annualBasePay * (tech.retirement401k / 100);
      const otherBenefitsAnnual = tech.otherBenefits * 12;
      
      const totalBurdenAnnual = payrollTaxes + futa + suta + workersComp + healthInsuranceAnnual + dentalVisionAnnual + retirement401kAnnual + otherBenefitsAnnual;
      const totalCostAnnual = annualBasePay + totalBurdenAnnual;
      const burdenPercent = (totalBurdenAnnual / annualBasePay) * 100;
      const burdenedHourlyRate = totalCostAnnual / hoursPerYear;
      
      // Calculate unproductive time
      const paidUnproductiveHours = tech.unproductiveTime
        .filter(t => t.paid)
        .reduce((sum, t) => sum + t.hours, 0);
      const unpaidUnproductiveHours = tech.unproductiveTime
        .filter(t => !t.paid)
        .reduce((sum, t) => sum + t.hours, 0);
      const totalUnproductiveHours = paidUnproductiveHours + unpaidUnproductiveHours;
      const billableHoursPerDay = tech.paidHoursPerDay - paidUnproductiveHours;
      const billableHoursPerYear = billableHoursPerDay * settings.workingDaysPerYear;
      const efficiencyPercent = (billableHoursPerDay / tech.paidHoursPerDay) * 100;
      
      // True cost per billable hour
      const trueCostPerBillableHour = totalCostAnnual / billableHoursPerYear;
      
      // Get assigned vehicle
      const assignedVehicle = vehicles.find(v => v.id === tech.assignedVehicleId);
      const vehicleCostMonthly = assignedVehicle 
        ? (assignedVehicle.monthlyPayment || 0) + (assignedVehicle.insurance || 0) + (assignedVehicle.fuel || 0) + (assignedVehicle.maintenance || 0)
        : 0;
      const vehicleCostPerBillableHour = vehicleCostMonthly / (billableHoursPerDay * (settings.workingDaysPerYear / 12));
      
      // Total loaded cost per billable hour (labor + vehicle)
      const totalLoadedCostPerHour = trueCostPerBillableHour + vehicleCostPerBillableHour;
      
      return {
        ...tech,
        // Pay
        hoursPerYear,
        hoursPerWeek,
        annualBasePay,
        // Burden breakdown
        payrollTaxes,
        futa,
        suta,
        workersComp,
        healthInsuranceAnnual,
        dentalVisionAnnual,
        retirement401kAnnual,
        otherBenefitsAnnual,
        totalBurdenAnnual,
        totalCostAnnual,
        burdenPercent,
        burdenedHourlyRate,
        // Productivity
        paidUnproductiveHours,
        unpaidUnproductiveHours,
        totalUnproductiveHours,
        billableHoursPerDay,
        billableHoursPerYear,
        efficiencyPercent,
        trueCostPerBillableHour,
        // Vehicle
        assignedVehicle,
        vehicleCostMonthly,
        vehicleCostPerBillableHour,
        // Total
        totalLoadedCostPerHour,
        monthlyCost: totalCostAnnual / 12,
      };
    });
  }, [technicians, vehicles, settings]);
  
  // Office staff calculations
  const officeStaffCalculations = useMemo(() => {
    return officeStaff.map(staff => {
      const hoursPerYear = staff.hoursPerWeek * settings.weeksPerYear;
      const annualBasePay = staff.payType === 'salary' ? staff.annualSalary : staff.basePayRate * hoursPerYear;
      const hourlyEquivalent = staff.payType === 'salary' ? staff.annualSalary / hoursPerYear : staff.basePayRate;
      
      const payrollTaxes = annualBasePay * (staff.payrollTaxRate / 100);
      const futa = Math.min(annualBasePay, 7000) * (staff.futaRate / 100);
      const suta = annualBasePay * (staff.sutaRate / 100);
      const workersComp = annualBasePay * (staff.workersCompRate / 100);
      const healthInsuranceAnnual = staff.healthInsurance * 12;
      const dentalVisionAnnual = staff.dentalVision * 12;
      const retirement401kAnnual = annualBasePay * (staff.retirement401k / 100);
      const otherBenefitsAnnual = staff.otherBenefits * 12;
      
      const totalBurdenAnnual = payrollTaxes + futa + suta + workersComp + healthInsuranceAnnual + dentalVisionAnnual + retirement401kAnnual + otherBenefitsAnnual;
      const totalCostAnnual = annualBasePay + totalBurdenAnnual;
      const burdenPercent = (totalBurdenAnnual / annualBasePay) * 100;
      
      return {
        ...staff,
        hoursPerYear,
        annualBasePay,
        hourlyEquivalent,
        payrollTaxes,
        futa,
        suta,
        workersComp,
        healthInsuranceAnnual,
        dentalVisionAnnual,
        retirement401kAnnual,
        otherBenefitsAnnual,
        totalBurdenAnnual,
        totalCostAnnual,
        burdenPercent,
        monthlyCost: totalCostAnnual / 12,
      };
    });
  }, [officeStaff, settings]);
  
  // Workforce summary
  const workforceSummary = useMemo(() => {
    const activeTechs = technicianCalculations.filter(t => t.status === 'active');
    const activeStaff = officeStaffCalculations.filter(s => s.status === 'active');
    
    const totalTechCostAnnual = activeTechs.reduce((sum, t) => sum + t.totalCostAnnual, 0);
    const totalStaffCostAnnual = activeStaff.reduce((sum, s) => sum + s.totalCostAnnual, 0);
    const totalWorkforceCostAnnual = totalTechCostAnnual + totalStaffCostAnnual;
    
    const avgTechBurdenPercent = activeTechs.length > 0 
      ? activeTechs.reduce((sum, t) => sum + t.burdenPercent, 0) / activeTechs.length 
      : 0;
    const avgTechEfficiency = activeTechs.length > 0 
      ? activeTechs.reduce((sum, t) => sum + t.efficiencyPercent, 0) / activeTechs.length 
      : 0;
    const avgTrueCostPerHour = activeTechs.length > 0 
      ? activeTechs.reduce((sum, t) => sum + t.trueCostPerBillableHour, 0) / activeTechs.length 
      : 0;
    const totalBillableHoursPerYear = activeTechs.reduce((sum, t) => sum + t.billableHoursPerYear, 0);
    
    return {
      totalTechnicians: technicians.length,
      activeTechnicians: activeTechs.length,
      totalOfficeStaff: officeStaff.length,
      activeOfficeStaff: activeStaff.length,
      totalTechCostAnnual,
      totalTechCostMonthly: totalTechCostAnnual / 12,
      totalStaffCostAnnual,
      totalStaffCostMonthly: totalStaffCostAnnual / 12,
      totalWorkforceCostAnnual,
      totalWorkforceCostMonthly: totalWorkforceCostAnnual / 12,
      avgTechBurdenPercent,
      avgTechEfficiency,
      avgTrueCostPerHour,
      totalBillableHoursPerYear,
    };
  }, [technicianCalculations, officeStaffCalculations, technicians, officeStaff]);
  
  // Fleet calculations
  const fleetSummary = useMemo(() => {
    const activeVehicles = vehicles.filter(v => v.status === 'active');
    const totalPayments = vehicles.reduce((sum, v) => sum + (v.monthlyPayment || 0), 0);
    const totalInsurance = vehicles.reduce((sum, v) => sum + (v.insurance || 0), 0);
    const totalFuel = vehicles.reduce((sum, v) => sum + (v.fuel || 0), 0);
    const totalMaintenance = vehicles.reduce((sum, v) => sum + (v.maintenance || 0), 0);
    const totalMonthly = totalPayments + totalInsurance + totalFuel + totalMaintenance;
    const totalLoanBalance = vehicles.reduce((sum, v) => sum + (v.loanBalance || 0), 0);
    const totalMarketValue = vehicles.reduce((sum, v) => sum + (v.marketValue || 0), 0);
    
    const activeTechs = technicianCalculations.filter(t => t.status === 'active');
    const totalBillableHoursPerMonth = activeTechs.reduce((sum, t) => sum + (t.billableHoursPerDay * (settings.workingDaysPerYear / 12)), 0);
    
    return {
      totalVehicles: vehicles.length,
      activeVehicles: activeVehicles.length,
      reserveVehicles: vehicles.filter(v => v.status === 'reserve').length,
      totalPayments,
      totalInsurance,
      totalFuel,
      totalMaintenance,
      totalMonthly,
      totalYearly: totalMonthly * 12,
      totalLoanBalance,
      totalMarketValue,
      totalEquity: totalMarketValue - totalLoanBalance,
      vehiclesUpsideDown: vehicles.filter(v => v.loanBalance > v.marketValue).length,
      costPerBillableHour: totalBillableHoursPerMonth > 0 ? totalMonthly / totalBillableHoursPerMonth : 0,
    };
  }, [vehicles, technicianCalculations, settings]);
  
  // Expense calculations (excluding payroll which comes from workforce)
  const expenseSummary = useMemo(() => {
    const categoryTotals = expenseCategories.map(cat => {
      const catMonthly = cat.items.reduce((sum, item) => {
        const monthly = item.frequency === 'annual' ? item.amount / 12 : 
                       item.frequency === 'quarterly' ? item.amount / 3 : item.amount;
        return sum + monthly;
      }, 0);
      return { id: cat.id, name: cat.name, monthly: catMonthly };
    });
    
    const nonPayrollExpenses = categoryTotals.reduce((sum, cat) => sum + cat.monthly, 0);
    const totalMonthly = nonPayrollExpenses + fleetSummary.totalMonthly + workforceSummary.totalStaffCostMonthly;
    
    return {
      fleetMonthly: fleetSummary.totalMonthly,
      nonPayrollExpenses,
      officeStaffMonthly: workforceSummary.totalStaffCostMonthly,
      totalMonthly,
      totalYearly: totalMonthly * 12,
      categoryTotals,
      overheadPercent: settings.targetAnnualRevenue > 0 ? (totalMonthly * 12 / settings.targetAnnualRevenue) * 100 : 0,
    };
  }, [expenseCategories, fleetSummary, workforceSummary, settings.targetAnnualRevenue]);
  
  // Job type calculations using workforce data
  const jobTypeCalculations = useMemo(() => {
    const avgTrueCost = workforceSummary.avgTrueCostPerHour;
    const vehicleCostPerHour = fleetSummary.costPerBillableHour;
    
    return jobTypes.map(job => {
      const totalCostPerHour = avgTrueCost + vehicleCostPerHour;
      const hourlyRate = totalCostPerHour / (1 - job.targetMargin / 100);
      const memberRate = hourlyRate * (1 - job.memberDiscount / 100);
      const materialMarkup = calcMarkupFromMargin(job.materialMargin);
      const minInvoice = hourlyRate * job.minHours + job.surcharge;
      
      return {
        ...job,
        avgTrueCost,
        vehicleCostPerHour,
        totalCostPerHour,
        hourlyRate,
        memberRate,
        materialMarkup,
        minInvoice,
      };
    });
  }, [jobTypes, workforceSummary, fleetSummary]);
  
  // Revenue projections
  const revenueProjections = useMemo(() => {
    const yearlyRevenue = settings.targetAnnualRevenue;
    const materialsCost = yearlyRevenue * (settings.materialCostPercent / 100);
    const laborCost = workforceSummary.totalTechCostAnnual;
    const grossProfit = yearlyRevenue - materialsCost - laborCost;
    const grossProfitPercent = yearlyRevenue > 0 ? (grossProfit / yearlyRevenue) * 100 : 0;
    const overhead = expenseSummary.totalYearly;
    const overheadPercent = yearlyRevenue > 0 ? (overhead / yearlyRevenue) * 100 : 0;
    const netProfit = grossProfit - overhead;
    const netProfitPercent = yearlyRevenue > 0 ? (netProfit / yearlyRevenue) * 100 : 0;
    
    const laborPercent = yearlyRevenue > 0 ? (laborCost / yearlyRevenue) * 100 : 0;
    const monthlyBreakEven = (expenseSummary.totalMonthly + (laborCost / 12)) / (1 - settings.materialCostPercent / 100);
    const activeTechs = technicianCalculations.filter(t => t.status === 'active').length;
    
    return {
      totalBillableHoursPerYear: workforceSummary.totalBillableHoursPerYear,
      yearlyRevenue,
      monthlyRevenue: yearlyRevenue / 12,
      weeklyRevenue: yearlyRevenue / 52,
      materialsCost,
      materialsPercent: settings.materialCostPercent,
      laborCost,
      laborPercent,
      grossProfit,
      grossProfitPercent,
      overhead,
      overheadPercent,
      netProfit,
      netProfitPercent,
      revenuePerTech: activeTechs > 0 ? yearlyRevenue / activeTechs : 0,
      monthlyBreakEven,
      dailyBreakEven: monthlyBreakEven / (settings.workingDaysPerYear / 12),
    };
  }, [settings, workforceSummary, expenseSummary, technicianCalculations]);
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const updateTechnician = (id, field, value) => {
    setTechnicians(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    setUnsavedChanges(true);
  };
  
  const updateTechUnproductiveTime = (techId, timeId, field, value) => {
    setTechnicians(prev => prev.map(t => 
      t.id === techId 
        ? { ...t, unproductiveTime: t.unproductiveTime.map(ut => ut.id === timeId ? { ...ut, [field]: value } : ut) }
        : t
    ));
    setUnsavedChanges(true);
  };
  
  const addTechUnproductiveTime = (techId) => {
    const newTime = { id: Date.now(), name: 'New Activity', hours: 0, paid: true };
    setTechnicians(prev => prev.map(t => 
      t.id === techId 
        ? { ...t, unproductiveTime: [...t.unproductiveTime, newTime] }
        : t
    ));
    setUnsavedChanges(true);
  };
  
  const deleteTechUnproductiveTime = (techId, timeId) => {
    setTechnicians(prev => prev.map(t => 
      t.id === techId 
        ? { ...t, unproductiveTime: t.unproductiveTime.filter(ut => ut.id !== timeId) }
        : t
    ));
    setUnsavedChanges(true);
  };
  
  const addTechnician = () => {
    const newTech = {
      id: Date.now(),
      name: 'New Technician',
      role: 'Technician',
      status: 'active',
      hireDate: new Date().toISOString().split('T')[0],
      email: '',
      phone: '',
      assignedVehicleId: null,
      payType: 'hourly',
      basePayRate: 25.00,
      annualSalary: null,
      payrollTaxRate: 7.65,
      futaRate: 0.6,
      sutaRate: 2.7,
      workersCompRate: 8.5,
      healthInsurance: 400,
      dentalVision: 50,
      retirement401k: 3,
      otherBenefits: 25,
      paidHoursPerDay: 8,
      unproductiveTime: [
        { id: 1, name: 'Morning Meeting', hours: 0.5, paid: true },
        { id: 2, name: 'Drive Time', hours: 1.5, paid: true },
        { id: 3, name: 'Lunch Break', hours: 0.5, paid: false },
      ],
    };
    setTechnicians(prev => [...prev, newTech]);
    setExpandedTechId(newTech.id);
    setUnsavedChanges(true);
  };
  
  const deleteTechnician = (id) => {
    setTechnicians(prev => prev.filter(t => t.id !== id));
    // Unassign vehicle
    setVehicles(prev => prev.map(v => v.assignedDriverId === id ? { ...v, assignedDriverId: null } : v));
    setUnsavedChanges(true);
  };
  
  const updateOfficeStaff = (id, field, value) => {
    setOfficeStaff(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    setUnsavedChanges(true);
  };
  
  const addOfficeStaff = () => {
    const newStaff = {
      id: Date.now(),
      name: 'New Staff Member',
      role: 'Office Staff',
      status: 'active',
      hireDate: new Date().toISOString().split('T')[0],
      email: '',
      phone: '',
      payType: 'hourly',
      basePayRate: 18.00,
      annualSalary: null,
      hoursPerWeek: 40,
      payrollTaxRate: 7.65,
      futaRate: 0.6,
      sutaRate: 2.7,
      workersCompRate: 0.5,
      healthInsurance: 350,
      dentalVision: 50,
      retirement401k: 3,
      otherBenefits: 25,
    };
    setOfficeStaff(prev => [...prev, newStaff]);
    setExpandedStaffId(newStaff.id);
    setUnsavedChanges(true);
  };
  
  const deleteOfficeStaff = (id) => {
    setOfficeStaff(prev => prev.filter(s => s.id !== id));
    setUnsavedChanges(true);
  };
  
  const updateVehicle = (id, field, value) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
    setUnsavedChanges(true);
  };
  
  const addVehicle = () => {
    const newVehicle = {
      id: Date.now(),
      year: new Date().getFullYear(),
      make: 'Ford',
      model: 'Transit',
      vin: '',
      status: 'reserve',
      assignedDriverId: null,
      loanBalance: 0,
      monthlyPayment: 0,
      marketValue: 0,
      insurance: 200,
      fuel: 0,
      maintenance: 0,
    };
    setVehicles(prev => [...prev, newVehicle]);
    setEditingVehicle(newVehicle.id);
    setUnsavedChanges(true);
  };
  
  const deleteVehicle = (id) => {
    // Unassign from technicians
    setTechnicians(prev => prev.map(t => t.assignedVehicleId === id ? { ...t, assignedVehicleId: null } : t));
    setVehicles(prev => prev.filter(v => v.id !== id));
    setUnsavedChanges(true);
  };
  
  const assignVehicleToTech = (vehicleId, techId) => {
    // Remove previous assignment
    setVehicles(prev => prev.map(v => ({ ...v, assignedDriverId: v.id === vehicleId ? techId : (v.assignedDriverId === techId ? null : v.assignedDriverId) })));
    setTechnicians(prev => prev.map(t => ({ ...t, assignedVehicleId: t.id === techId ? vehicleId : (t.assignedVehicleId === vehicleId ? null : t.assignedVehicleId) })));
    setUnsavedChanges(true);
  };
  
  const updateExpenseItem = (categoryId, itemId, field, value) => {
    setExpenseCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { ...cat, items: cat.items.map(item => item.id === itemId ? { ...item, [field]: value } : item) }
        : cat
    ));
    setUnsavedChanges(true);
  };
  
  const addExpenseItem = (categoryId) => {
    const newItem = { id: `new-${Date.now()}`, name: 'New Expense', amount: 0, frequency: 'monthly' };
    setExpenseCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, items: [...cat.items, newItem] } : cat
    ));
    setUnsavedChanges(true);
  };
  
  const deleteExpenseItem = (categoryId, itemId) => {
    setExpenseCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, items: cat.items.filter(item => item.id !== itemId) } : cat
    ));
    setUnsavedChanges(true);
  };
  
  const updateJobType = (id, field, value) => {
    setJobTypes(prev => prev.map(j => j.id === id ? { ...j, [field]: value } : j));
    setUnsavedChanges(true);
  };
  
  const updateMarkupTier = (id, field, value) => {
    setMarkupTiers(prev => prev.map(t => t.id === id ? { ...t, [field]: parseFloat(value) || 0 } : t));
    setUnsavedChanges(true);
  };
  
  const addMarkupTier = () => {
    const lastTier = markupTiers[markupTiers.length - 1];
    setMarkupTiers(prev => [...prev, {
      id: Date.now(),
      minCost: lastTier.maxCost + 0.01,
      maxCost: lastTier.maxCost + 1000,
      grossMargin: Math.max(lastTier.grossMargin - 5, 20),
    }]);
    setUnsavedChanges(true);
  };
  
  const deleteMarkupTier = (id) => {
    if (markupTiers.length > 1) {
      setMarkupTiers(prev => prev.filter(t => t.id !== id));
      setUnsavedChanges(true);
    }
  };
  
  const updateSettings = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };
  
  const saveScenario = () => {
    const scenario = {
      id: Date.now(),
      name: `Scenario ${scenarios.length + 1}`,
      timestamp: new Date().toISOString(),
      technicians: JSON.parse(JSON.stringify(technicians)),
      officeStaff: JSON.parse(JSON.stringify(officeStaff)),
      vehicles: JSON.parse(JSON.stringify(vehicles)),
      expenseCategories: JSON.parse(JSON.stringify(expenseCategories)),
      jobTypes: JSON.parse(JSON.stringify(jobTypes)),
      markupTiers: JSON.parse(JSON.stringify(markupTiers)),
      settings: { ...settings },
      summary: {
        techCount: technicianCalculations.filter(t => t.status === 'active').length,
        avgTrueCost: workforceSummary.avgTrueCostPerHour,
        avgEfficiency: workforceSummary.avgTechEfficiency,
        fleetCost: fleetSummary.totalMonthly,
        totalOverhead: expenseSummary.totalMonthly,
        avgHourlyRate: jobTypeCalculations[0]?.hourlyRate || 0,
        netProfit: revenueProjections.netProfit,
      }
    };
    setScenarios(prev => [...prev, scenario]);
    setActiveScenario(scenario.id);
    setUnsavedChanges(false);
  };
  
  const loadScenario = (scenario) => {
    setTechnicians(scenario.technicians);
    setOfficeStaff(scenario.officeStaff);
    setVehicles(scenario.vehicles);
    setExpenseCategories(scenario.expenseCategories);
    setJobTypes(scenario.jobTypes);
    setMarkupTiers(scenario.markupTiers);
    setSettings(scenario.settings);
    setActiveScenario(scenario.id);
    setUnsavedChanges(false);
  };
  
  // ============================================================================
  // COMPONENTS
  // ============================================================================
  
  const TabButton = ({ id, icon: Icon, label, badge }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
        activeTab === id 
          ? 'border-sky-500 text-sky-600 bg-sky-50/50' 
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge && (
        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
          activeTab === id ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
  
  const SubTabButton = ({ id, icon: Icon, label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        active 
          ? 'bg-white text-sky-600 shadow-sm' 
          : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
  
  const MetricCard = ({ label, value, subValue, icon: Icon, color = 'sky', trend, className = '' }) => {
    const colors = {
      sky: 'bg-sky-50 text-sky-700 border-sky-200',
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      amber: 'bg-amber-50 text-amber-700 border-amber-200',
      violet: 'bg-violet-50 text-violet-700 border-violet-200',
      rose: 'bg-rose-50 text-rose-700 border-rose-200',
      slate: 'bg-slate-50 text-slate-700 border-slate-200',
      teal: 'bg-teal-50 text-teal-700 border-teal-200',
    };
    
    return (
      <div className={`p-4 rounded-xl border ${colors[color]} ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium opacity-70 truncate">{label}</p>
            <p className="text-xl font-bold mt-1 truncate">{value}</p>
            {subValue && <p className="text-xs opacity-60 mt-0.5 truncate">{subValue}</p>}
          </div>
          {Icon && <Icon className="w-5 h-5 opacity-40 flex-shrink-0 ml-2" />}
        </div>
      </div>
    );
  };
  
  const SectionCard = ({ title, icon: Icon, children, collapsible = false, defaultExpanded = true, badge, actions, className = '' }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    
    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
        <div 
          className={`flex items-center justify-between p-4 ${collapsible ? 'cursor-pointer hover:bg-slate-50' : ''} transition-colors`}
          onClick={() => collapsible && setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 bg-slate-100 rounded-lg">
                <Icon className="w-5 h-5 text-slate-600" />
              </div>
            )}
            <h3 className="font-semibold text-slate-800">{title}</h3>
            {badge && (
              <span className="px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-700 rounded-full">{badge}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {collapsible && (
              expanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
        {(!collapsible || expanded) && (
          <div className="px-4 pb-4">
            {children}
          </div>
        )}
      </div>
    );
  };
  
  const InputField = ({ label, value, onChange, prefix, suffix, type = 'number', disabled, className = '', tooltip, step }) => (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
          {label}
          {tooltip && (
            <div className="group relative">
              <Info className="w-3 h-3 text-slate-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                {tooltip}
              </div>
            </div>
          )}
        </label>
      )}
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
          disabled={disabled}
          step={step}
          className={`w-full px-3 py-2 ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-10' : ''} bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{suffix}</span>}
      </div>
    </div>
  );
  
  const Toggle = ({ value, onChange, label }) => (
    <div className="flex items-center justify-between">
      {label && <span className="text-sm text-slate-600">{label}</span>}
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-sky-500' : 'bg-slate-300'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
  
  // ============================================================================
  // TAB: WORKFORCE
  // ============================================================================
  
  const WorkforceTab = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard label="Technicians" value={workforceSummary.activeTechnicians} subValue={`of ${workforceSummary.totalTechnicians} total`} icon={HardHat} color="sky" />
        <MetricCard label="Office Staff" value={workforceSummary.activeOfficeStaff} subValue={`of ${workforceSummary.totalOfficeStaff} total`} icon={Headphones} color="violet" />
        <MetricCard label="Avg Burden %" value={formatPercent(workforceSummary.avgTechBurdenPercent)} subValue="Tech labor burden" icon={Percent} color="amber" />
        <MetricCard label="Avg Efficiency" value={formatPercent(workforceSummary.avgTechEfficiency)} subValue="Billable vs paid hours" icon={Target} color="emerald" />
        <MetricCard label="True Cost/Hr" value={formatCurrency(workforceSummary.avgTrueCostPerHour)} subValue="Per billable hour" icon={DollarSign} color="rose" />
        <MetricCard label="Monthly Payroll" value={formatCurrencyShort(workforceSummary.totalWorkforceCostMonthly)} subValue="All staff fully loaded" icon={Banknote} color="teal" />
      </div>
      
      {/* Sub-tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <SubTabButton id="technicians" icon={HardHat} label="Technicians" active={workforceSubTab === 'technicians'} onClick={() => setWorkforceSubTab('technicians')} />
        <SubTabButton id="office" icon={Headphones} label="Office Staff" active={workforceSubTab === 'office'} onClick={() => setWorkforceSubTab('office')} />
        <SubTabButton id="summary" icon={BarChart3} label="Cost Summary" active={workforceSubTab === 'summary'} onClick={() => setWorkforceSubTab('summary')} />
      </div>
      
      {/* Technicians Sub-Tab */}
      {workforceSubTab === 'technicians' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Field Technicians</h3>
            <button onClick={addTechnician} className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors">
              <UserPlus className="w-4 h-4" /> Add Technician
            </button>
          </div>
          
          {technicianCalculations.map(tech => {
            const isExpanded = expandedTechId === tech.id;
            const assignedVehicle = vehicles.find(v => v.id === tech.assignedVehicleId);
            
            return (
              <div key={tech.id} className={`border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-sky-300 ring-2 ring-sky-100' : 'border-slate-200'}`}>
                {/* Header */}
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors ${tech.status !== 'active' ? 'bg-slate-50' : 'bg-white'}`}
                  onClick={() => setExpandedTechId(isExpanded ? null : tech.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${tech.status === 'active' ? 'bg-sky-100' : 'bg-slate-200'}`}>
                      <HardHat className={`w-6 h-6 ${tech.status === 'active' ? 'text-sky-600' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">{tech.name}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          tech.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}>{tech.status}</span>
                      </div>
                      <p className="text-sm text-slate-500">{tech.role} • {formatCurrency(tech.basePayRate)}/hr base</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-slate-500">Burden</p>
                      <p className="font-bold text-amber-600">{formatPercent(tech.burdenPercent)}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-slate-500">Efficiency</p>
                      <p className="font-bold text-emerald-600">{formatPercent(tech.efficiencyPercent)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">True Cost/Hr</p>
                      <p className="font-bold text-sky-600">{formatCurrency(tech.trueCostPerBillableHour)}</p>
                    </div>
                    <div className="text-right hidden lg:block">
                      <p className="text-xs text-slate-500">Loaded Cost/Hr</p>
                      <p className="font-bold text-violet-600">{formatCurrency(tech.totalLoadedCostPerHour)}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>
                
                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-200">
                    {/* Basic Info */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                      <h5 className="text-sm font-medium text-slate-600 mb-3">Basic Information</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <InputField label="Name" type="text" value={tech.name} onChange={(v) => updateTechnician(tech.id, 'name', v)} />
                        <InputField label="Role" type="text" value={tech.role} onChange={(v) => updateTechnician(tech.id, 'role', v)} />
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-500">Status</label>
                          <select 
                            value={tech.status}
                            onChange={(e) => updateTechnician(tech.id, 'status', e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="terminated">Terminated</option>
                          </select>
                        </div>
                        <InputField label="Email" type="text" value={tech.email} onChange={(v) => updateTechnician(tech.id, 'email', v)} />
                        <InputField label="Phone" type="text" value={tech.phone} onChange={(v) => updateTechnician(tech.id, 'phone', v)} />
                        <InputField label="Hire Date" type="date" value={tech.hireDate} onChange={(v) => updateTechnician(tech.id, 'hireDate', v)} />
                      </div>
                    </div>
                    
                    {/* Pay & Burden */}
                    <div className="p-4 border-b border-slate-200">
                      <h5 className="text-sm font-medium text-slate-600 mb-3">Pay Structure & Labor Burden</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <InputField label="Base Pay Rate" prefix="$" suffix="/hr" value={tech.basePayRate} onChange={(v) => updateTechnician(tech.id, 'basePayRate', v)} />
                        <InputField label="Paid Hours/Day" value={tech.paidHoursPerDay} onChange={(v) => updateTechnician(tech.id, 'paidHoursPerDay', v)} />
                        <InputField label="Payroll Tax (FICA)" suffix="%" value={tech.payrollTaxRate} onChange={(v) => updateTechnician(tech.id, 'payrollTaxRate', v)} tooltip="Social Security 6.2% + Medicare 1.45%" />
                        <InputField label="FUTA" suffix="%" value={tech.futaRate} onChange={(v) => updateTechnician(tech.id, 'futaRate', v)} tooltip="Federal Unemployment" />
                        <InputField label="SUTA" suffix="%" value={tech.sutaRate} onChange={(v) => updateTechnician(tech.id, 'sutaRate', v)} tooltip="State Unemployment" />
                        <InputField label="Workers Comp" suffix="%" value={tech.workersCompRate} onChange={(v) => updateTechnician(tech.id, 'workersCompRate', v)} tooltip="Rate varies by trade" />
                        <InputField label="Health Insurance" prefix="$" suffix="/mo" value={tech.healthInsurance} onChange={(v) => updateTechnician(tech.id, 'healthInsurance', v)} />
                        <InputField label="Dental/Vision" prefix="$" suffix="/mo" value={tech.dentalVision} onChange={(v) => updateTechnician(tech.id, 'dentalVision', v)} />
                        <InputField label="401k Match" suffix="%" value={tech.retirement401k} onChange={(v) => updateTechnician(tech.id, 'retirement401k', v)} />
                        <InputField label="Other Benefits" prefix="$" suffix="/mo" value={tech.otherBenefits} onChange={(v) => updateTechnician(tech.id, 'otherBenefits', v)} />
                      </div>
                      
                      {/* Burden Breakdown */}
                      <div className="mt-4 p-4 bg-amber-50 rounded-xl">
                        <h6 className="text-sm font-medium text-amber-700 mb-3">Annual Burden Breakdown</h6>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                          <div><span className="text-amber-600">Base Pay:</span> <span className="font-medium">{formatCurrency(tech.annualBasePay)}</span></div>
                          <div><span className="text-amber-600">Payroll Taxes:</span> <span className="font-medium">{formatCurrency(tech.payrollTaxes)}</span></div>
                          <div><span className="text-amber-600">FUTA:</span> <span className="font-medium">{formatCurrency(tech.futa)}</span></div>
                          <div><span className="text-amber-600">SUTA:</span> <span className="font-medium">{formatCurrency(tech.suta)}</span></div>
                          <div><span className="text-amber-600">Workers Comp:</span> <span className="font-medium">{formatCurrency(tech.workersComp)}</span></div>
                          <div><span className="text-amber-600">Health Ins:</span> <span className="font-medium">{formatCurrency(tech.healthInsuranceAnnual)}</span></div>
                          <div><span className="text-amber-600">Dental/Vision:</span> <span className="font-medium">{formatCurrency(tech.dentalVisionAnnual)}</span></div>
                          <div><span className="text-amber-600">401k Match:</span> <span className="font-medium">{formatCurrency(tech.retirement401kAnnual)}</span></div>
                          <div><span className="text-amber-600">Other:</span> <span className="font-medium">{formatCurrency(tech.otherBenefitsAnnual)}</span></div>
                          <div className="font-bold"><span className="text-amber-700">Total Burden:</span> <span>{formatCurrency(tech.totalBurdenAnnual)}</span></div>
                          <div className="font-bold"><span className="text-amber-700">Burden %:</span> <span>{formatPercent(tech.burdenPercent)}</span></div>
                          <div className="font-bold"><span className="text-amber-700">Burdened Rate:</span> <span>{formatCurrency(tech.burdenedHourlyRate)}/hr</span></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Unproductive Time */}
                    <div className="p-4 border-b border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-medium text-slate-600">Unproductive Time (Hours per Day)</h5>
                        <button 
                          onClick={() => addTechUnproductiveTime(tech.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-sky-600 hover:bg-sky-50 rounded transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add Time
                        </button>
                      </div>
                      <div className="space-y-2">
                        {tech.unproductiveTime.map(time => (
                          <div key={time.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg group">
                            <input
                              type="text"
                              value={time.name}
                              onChange={(e) => updateTechUnproductiveTime(tech.id, time.id, 'name', e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded"
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={time.hours}
                                onChange={(e) => updateTechUnproductiveTime(tech.id, time.id, 'hours', parseFloat(e.target.value) || 0)}
                                step="0.25"
                                className="w-16 px-2 py-1 text-sm border border-slate-200 rounded text-center"
                              />
                              <span className="text-xs text-slate-500">hrs</span>
                            </div>
                            <label className="flex items-center gap-1.5 text-sm">
                              <input
                                type="checkbox"
                                checked={time.paid}
                                onChange={(e) => updateTechUnproductiveTime(tech.id, time.id, 'paid', e.target.checked)}
                                className="rounded border-slate-300"
                              />
                              <span className={time.paid ? 'text-emerald-600' : 'text-slate-500'}>Paid</span>
                            </label>
                            <button 
                              onClick={() => deleteTechUnproductiveTime(tech.id, time.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {/* Productivity Summary */}
                      <div className="mt-4 p-4 bg-emerald-50 rounded-xl">
                        <h6 className="text-sm font-medium text-emerald-700 mb-3">Productivity Summary</h6>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div><span className="text-emerald-600">Paid Hours/Day:</span> <span className="font-medium">{tech.paidHoursPerDay}</span></div>
                          <div><span className="text-emerald-600">Paid Unproductive:</span> <span className="font-medium">{tech.paidUnproductiveHours} hrs</span></div>
                          <div><span className="text-emerald-600">Unpaid Time:</span> <span className="font-medium">{tech.unpaidUnproductiveHours} hrs</span></div>
                          <div className="font-bold"><span className="text-emerald-700">Billable Hours/Day:</span> <span>{tech.billableHoursPerDay}</span></div>
                          <div><span className="text-emerald-600">Billable Hours/Year:</span> <span className="font-medium">{formatNumber(tech.billableHoursPerYear)}</span></div>
                          <div className="font-bold"><span className="text-emerald-700">Efficiency:</span> <span>{formatPercent(tech.efficiencyPercent)}</span></div>
                          <div className="font-bold col-span-2"><span className="text-emerald-700">True Cost Per Billable Hour:</span> <span className="text-lg">{formatCurrency(tech.trueCostPerBillableHour)}</span></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Vehicle Assignment */}
                    <div className="p-4 border-b border-slate-200">
                      <h5 className="text-sm font-medium text-slate-600 mb-3">Vehicle Assignment</h5>
                      <div className="flex items-center gap-4">
                        <select
                          value={tech.assignedVehicleId || ''}
                          onChange={(e) => assignVehicleToTech(parseInt(e.target.value) || null, tech.id)}
                          className="flex-1 max-w-md px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="">No vehicle assigned</option>
                          {vehicles.map(v => (
                            <option key={v.id} value={v.id} disabled={v.assignedDriverId && v.assignedDriverId !== tech.id}>
                              {v.year} {v.make} {v.model} - {v.vin?.slice(-6) || 'No VIN'} {v.assignedDriverId && v.assignedDriverId !== tech.id ? '(Assigned)' : ''}
                            </option>
                          ))}
                        </select>
                        {assignedVehicle && (
                          <div className="p-3 bg-violet-50 rounded-lg">
                            <p className="text-xs text-violet-600">Vehicle Cost</p>
                            <p className="font-bold text-violet-700">{formatCurrency(tech.vehicleCostMonthly)}/mo</p>
                            <p className="text-xs text-violet-600">{formatCurrency(tech.vehicleCostPerBillableHour)}/billable hr</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Total Cost Summary */}
                    <div className="p-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sky-100 text-xs">Annual Total Cost</p>
                          <p className="text-2xl font-bold">{formatCurrency(tech.totalCostAnnual)}</p>
                        </div>
                        <div>
                          <p className="text-sky-100 text-xs">Monthly Cost</p>
                          <p className="text-2xl font-bold">{formatCurrency(tech.monthlyCost)}</p>
                        </div>
                        <div>
                          <p className="text-sky-100 text-xs">Cost Per Billable Hour</p>
                          <p className="text-2xl font-bold">{formatCurrency(tech.trueCostPerBillableHour)}</p>
                        </div>
                        <div>
                          <p className="text-sky-100 text-xs">Fully Loaded Cost/Hr</p>
                          <p className="text-2xl font-bold">{formatCurrency(tech.totalLoadedCostPerHour)}</p>
                          <p className="text-sky-200 text-xs">Incl. vehicle</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="p-4 bg-slate-50 flex justify-end gap-2">
                      <button 
                        onClick={() => deleteTechnician(tech.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Office Staff Sub-Tab */}
      {workforceSubTab === 'office' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">Office Staff</h3>
            <button onClick={addOfficeStaff} className="flex items-center gap-1.5 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors">
              <UserPlus className="w-4 h-4" /> Add Staff Member
            </button>
          </div>
          
          {officeStaffCalculations.map(staff => {
            const isExpanded = expandedStaffId === staff.id;
            
            return (
              <div key={staff.id} className={`border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200'}`}>
                {/* Header */}
                <div 
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors ${staff.status !== 'active' ? 'bg-slate-50' : 'bg-white'}`}
                  onClick={() => setExpandedStaffId(isExpanded ? null : staff.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${staff.status === 'active' ? 'bg-violet-100' : 'bg-slate-200'}`}>
                      <Headphones className={`w-6 h-6 ${staff.status === 'active' ? 'text-violet-600' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">{staff.name}</h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          staff.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}>{staff.status}</span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {staff.role} • {staff.payType === 'salary' ? formatCurrency(staff.annualSalary) + '/yr' : formatCurrency(staff.basePayRate) + '/hr'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-slate-500">Burden %</p>
                      <p className="font-bold text-amber-600">{formatPercent(staff.burdenPercent)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Monthly Cost</p>
                      <p className="font-bold text-violet-600">{formatCurrency(staff.monthlyCost)}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>
                
                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-200">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                      <h5 className="text-sm font-medium text-slate-600 mb-3">Basic Information</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <InputField label="Name" type="text" value={staff.name} onChange={(v) => updateOfficeStaff(staff.id, 'name', v)} />
                        <InputField label="Role" type="text" value={staff.role} onChange={(v) => updateOfficeStaff(staff.id, 'role', v)} />
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-500">Status</label>
                          <select 
                            value={staff.status}
                            onChange={(e) => updateOfficeStaff(staff.id, 'status', e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="terminated">Terminated</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-slate-500">Pay Type</label>
                          <select 
                            value={staff.payType}
                            onChange={(e) => updateOfficeStaff(staff.id, 'payType', e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                          >
                            <option value="hourly">Hourly</option>
                            <option value="salary">Salary</option>
                          </select>
                        </div>
                        {staff.payType === 'hourly' ? (
                          <InputField label="Hourly Rate" prefix="$" value={staff.basePayRate || 0} onChange={(v) => updateOfficeStaff(staff.id, 'basePayRate', v)} />
                        ) : (
                          <InputField label="Annual Salary" prefix="$" value={staff.annualSalary || 0} onChange={(v) => updateOfficeStaff(staff.id, 'annualSalary', v)} />
                        )}
                        <InputField label="Hours/Week" value={staff.hoursPerWeek} onChange={(v) => updateOfficeStaff(staff.id, 'hoursPerWeek', v)} />
                      </div>
                    </div>
                    
                    <div className="p-4 border-b border-slate-200">
                      <h5 className="text-sm font-medium text-slate-600 mb-3">Benefits & Burden</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        <InputField label="Payroll Tax" suffix="%" value={staff.payrollTaxRate} onChange={(v) => updateOfficeStaff(staff.id, 'payrollTaxRate', v)} />
                        <InputField label="FUTA" suffix="%" value={staff.futaRate} onChange={(v) => updateOfficeStaff(staff.id, 'futaRate', v)} />
                        <InputField label="SUTA" suffix="%" value={staff.sutaRate} onChange={(v) => updateOfficeStaff(staff.id, 'sutaRate', v)} />
                        <InputField label="Workers Comp" suffix="%" value={staff.workersCompRate} onChange={(v) => updateOfficeStaff(staff.id, 'workersCompRate', v)} />
                        <InputField label="Health Insurance" prefix="$" suffix="/mo" value={staff.healthInsurance} onChange={(v) => updateOfficeStaff(staff.id, 'healthInsurance', v)} />
                        <InputField label="Dental/Vision" prefix="$" suffix="/mo" value={staff.dentalVision} onChange={(v) => updateOfficeStaff(staff.id, 'dentalVision', v)} />
                        <InputField label="401k Match" suffix="%" value={staff.retirement401k} onChange={(v) => updateOfficeStaff(staff.id, 'retirement401k', v)} />
                        <InputField label="Other Benefits" prefix="$" suffix="/mo" value={staff.otherBenefits} onChange={(v) => updateOfficeStaff(staff.id, 'otherBenefits', v)} />
                      </div>
                    </div>
                    
                    {/* Cost Summary */}
                    <div className="p-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-violet-100 text-xs">Base Pay (Annual)</p>
                          <p className="text-xl font-bold">{formatCurrency(staff.annualBasePay)}</p>
                        </div>
                        <div>
                          <p className="text-violet-100 text-xs">Total Burden</p>
                          <p className="text-xl font-bold">{formatCurrency(staff.totalBurdenAnnual)}</p>
                        </div>
                        <div>
                          <p className="text-violet-100 text-xs">Annual Total Cost</p>
                          <p className="text-xl font-bold">{formatCurrency(staff.totalCostAnnual)}</p>
                        </div>
                        <div>
                          <p className="text-violet-100 text-xs">Monthly Cost</p>
                          <p className="text-xl font-bold">{formatCurrency(staff.monthlyCost)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50 flex justify-end gap-2">
                      <button 
                        onClick={() => deleteOfficeStaff(staff.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Cost Summary Sub-Tab */}
      {workforceSubTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Technician Costs */}
            <SectionCard title="Technician Labor Costs" icon={HardHat}>
              <div className="space-y-3 mt-2">
                {technicianCalculations.filter(t => t.status === 'active').map(tech => (
                  <div key={tech.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-700">{tech.name}</p>
                      <p className="text-xs text-slate-500">{tech.role} • {formatPercent(tech.efficiencyPercent)} efficiency</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{formatCurrency(tech.monthlyCost)}/mo</p>
                      <p className="text-xs text-slate-500">{formatCurrency(tech.trueCostPerBillableHour)}/billable hr</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 bg-sky-50 rounded-lg border-2 border-sky-200">
                  <p className="font-bold text-sky-700">Total Technicians</p>
                  <div className="text-right">
                    <p className="font-bold text-sky-700">{formatCurrency(workforceSummary.totalTechCostMonthly)}/mo</p>
                    <p className="text-xs text-sky-600">{formatCurrency(workforceSummary.totalTechCostAnnual)}/yr</p>
                  </div>
                </div>
              </div>
            </SectionCard>
            
            {/* Office Staff Costs */}
            <SectionCard title="Office Staff Costs" icon={Headphones}>
              <div className="space-y-3 mt-2">
                {officeStaffCalculations.filter(s => s.status === 'active').map(staff => (
                  <div key={staff.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-700">{staff.name}</p>
                      <p className="text-xs text-slate-500">{staff.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{formatCurrency(staff.monthlyCost)}/mo</p>
                      <p className="text-xs text-slate-500">{formatPercent(staff.burdenPercent)} burden</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 bg-violet-50 rounded-lg border-2 border-violet-200">
                  <p className="font-bold text-violet-700">Total Office Staff</p>
                  <div className="text-right">
                    <p className="font-bold text-violet-700">{formatCurrency(workforceSummary.totalStaffCostMonthly)}/mo</p>
                    <p className="text-xs text-violet-600">{formatCurrency(workforceSummary.totalStaffCostAnnual)}/yr</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
          
          {/* Grand Total */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
            <h3 className="text-emerald-100 text-sm mb-2">Total Workforce Cost (Fully Loaded)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-4xl font-bold">{formatCurrency(workforceSummary.totalWorkforceCostMonthly)}</p>
                <p className="text-emerald-200">per month</p>
              </div>
              <div>
                <p className="text-4xl font-bold">{formatCurrency(workforceSummary.totalWorkforceCostAnnual)}</p>
                <p className="text-emerald-200">per year</p>
              </div>
              <div>
                <p className="text-4xl font-bold">{formatPercent((workforceSummary.totalWorkforceCostAnnual / settings.targetAnnualRevenue) * 100)}</p>
                <p className="text-emerald-200">of target revenue</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  // ============================================================================
  // TAB: FLEET (Simplified)
  // ============================================================================
  
  const FleetTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard label="Total Vehicles" value={fleetSummary.totalVehicles} subValue={`${fleetSummary.activeVehicles} active`} icon={Truck} color="sky" />
        <MetricCard label="Monthly Payments" value={formatCurrency(fleetSummary.totalPayments)} icon={CreditCard} color="slate" />
        <MetricCard label="Insurance" value={formatCurrency(fleetSummary.totalInsurance)} suffix="/mo" icon={Shield} color="emerald" />
        <MetricCard label="Fuel" value={formatCurrency(fleetSummary.totalFuel)} suffix="/mo" icon={Fuel} color="amber" />
        <MetricCard label="Total Monthly" value={formatCurrency(fleetSummary.totalMonthly)} subValue={formatCurrency(fleetSummary.totalYearly) + '/yr'} icon={CircleDollarSign} color="violet" />
        <MetricCard label="Cost/Billable Hr" value={formatCurrency(fleetSummary.costPerBillableHour)} icon={Timer} color="teal" />
      </div>
      
      <SectionCard 
        title="Fleet Inventory" 
        icon={Truck}
        badge={`${vehicles.length} vehicles`}
        actions={
          <button onClick={addVehicle} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600">
            <Plus className="w-4 h-4" /> Add
          </button>
        }
      >
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 font-medium text-slate-600">Vehicle</th>
                <th className="text-left py-2 px-2 font-medium text-slate-600">Status</th>
                <th className="text-left py-2 px-2 font-medium text-slate-600">Assigned To</th>
                <th className="text-right py-2 px-2 font-medium text-slate-600">Payment</th>
                <th className="text-right py-2 px-2 font-medium text-slate-600">Insurance</th>
                <th className="text-right py-2 px-2 font-medium text-slate-600">Fuel</th>
                <th className="text-right py-2 px-2 font-medium text-slate-600">Total/Mo</th>
                <th className="text-right py-2 px-2 font-medium text-slate-600">Equity</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => {
                const assignedTech = technicians.find(t => t.assignedVehicleId === v.id);
                const equity = (v.marketValue || 0) - (v.loanBalance || 0);
                const totalMonthly = (v.monthlyPayment || 0) + (v.insurance || 0) + (v.fuel || 0) + (v.maintenance || 0);
                
                return (
                  <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2">
                      <p className="font-medium text-slate-800">{v.year} {v.make} {v.model}</p>
                      <p className="text-xs text-slate-500">{v.vin?.slice(-8) || 'No VIN'}</p>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={v.status}
                        onChange={(e) => updateVehicle(v.id, 'status', e.target.value)}
                        className={`px-2 py-1 text-xs rounded-full border-0 ${
                          v.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          v.status === 'reserve' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <option value="active">Active</option>
                        <option value="reserve">Reserve</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={v.assignedDriverId || ''}
                        onChange={(e) => assignVehicleToTech(v.id, parseInt(e.target.value) || null)}
                        className="text-sm border border-slate-200 rounded px-2 py-1"
                      >
                        <option value="">Unassigned</option>
                        {technicians.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2 text-right font-medium">{formatCurrency(v.monthlyPayment)}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(v.insurance)}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(v.fuel)}</td>
                    <td className="py-2 px-2 text-right font-bold text-slate-800">{formatCurrency(totalMonthly)}</td>
                    <td className={`py-2 px-2 text-right font-medium ${equity < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(equity)}
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => deleteVehicle(v.id)} className="p-1 text-slate-400 hover:text-rose-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
  
  // ============================================================================
  // TAB: EXPENSES (Simplified)
  // ============================================================================
  
  const ExpensesTab = () => {
    const IconMap = { Building2, Shield, Monitor, Megaphone, Users, Landmark, Wrench, GraduationCap, MoreHorizontal };
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Fleet Costs" value={formatCurrency(expenseSummary.fleetMonthly)} subValue="From Fleet tab" icon={Truck} color="amber" />
          <MetricCard label="Office Staff" value={formatCurrency(expenseSummary.officeStaffMonthly)} subValue="From Workforce" icon={Users} color="violet" />
          <MetricCard label="Other Expenses" value={formatCurrency(expenseSummary.nonPayrollExpenses)} icon={Receipt} color="sky" />
          <MetricCard label="Total Overhead" value={formatCurrency(expenseSummary.totalMonthly)} subValue={formatPercent(expenseSummary.overheadPercent) + ' of revenue'} icon={PieChart} color="emerald" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {expenseCategories.map(cat => {
            const IconComp = IconMap[cat.icon] || MoreHorizontal;
            const total = cat.items.reduce((sum, item) => sum + (item.frequency === 'annual' ? item.amount / 12 : item.amount), 0);
            
            return (
              <div key={cat.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div 
                  className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100"
                  onClick={() => setExpenseCategories(prev => prev.map(c => c.id === cat.id ? { ...c, collapsed: !c.collapsed } : c))}
                >
                  <div className="flex items-center gap-2">
                    <IconComp className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-slate-700">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(total)}/mo</span>
                    {cat.collapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                {!cat.collapsed && (
                  <div className="p-3 space-y-2">
                    {cat.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <input type="text" value={item.name} onChange={(e) => updateExpenseItem(cat.id, item.id, 'name', e.target.value)} className="flex-1 px-2 py-1 text-sm border border-transparent hover:border-slate-200 rounded" />
                        <span className="text-slate-400">$</span>
                        <input type="number" value={item.amount} onChange={(e) => updateExpenseItem(cat.id, item.id, 'amount', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1 text-sm border border-slate-200 rounded text-right" />
                        <select value={item.frequency} onChange={(e) => updateExpenseItem(cat.id, item.id, 'frequency', e.target.value)} className="px-2 py-1 text-sm border border-slate-200 rounded">
                          <option value="monthly">/mo</option>
                          <option value="annual">/yr</option>
                        </select>
                        <button onClick={() => deleteExpenseItem(cat.id, item.id)} className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={() => addExpenseItem(cat.id)} className="flex items-center gap-1 px-2 py-1 text-sm text-sky-600 hover:bg-sky-50 rounded">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // ============================================================================
  // TAB: HOURLY RATES
  // ============================================================================
  
  const HourlyRatesTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Avg True Cost/Hr" value={formatCurrency(workforceSummary.avgTrueCostPerHour)} subValue="Labor only" icon={DollarSign} color="sky" />
        <MetricCard label="Vehicle Cost/Hr" value={formatCurrency(fleetSummary.costPerBillableHour)} icon={Truck} color="amber" />
        <MetricCard label="Total Cost/Hr" value={formatCurrency(workforceSummary.avgTrueCostPerHour + fleetSummary.costPerBillableHour)} subValue="Labor + Vehicle" icon={Calculator} color="violet" />
        <MetricCard label="Avg Efficiency" value={formatPercent(workforceSummary.avgTechEfficiency)} icon={Target} color="emerald" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {jobTypeCalculations.map((job, idx) => (
          <div key={job.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className={`p-4 text-white ${['bg-sky-500', 'bg-violet-500', 'bg-emerald-500'][idx]}`}>
              <h3 className="font-bold text-lg">{job.name}</h3>
              <p className="text-white/80 text-sm">{job.description}</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(job.hourlyRate)}</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Target Margin" suffix="%" value={job.targetMargin} onChange={(v) => updateJobType(job.id, 'targetMargin', v)} />
                <InputField label="Member Discount" suffix="%" value={job.memberDiscount} onChange={(v) => updateJobType(job.id, 'memberDiscount', v)} />
                <InputField label="Material Margin" suffix="%" value={job.materialMargin} onChange={(v) => updateJobType(job.id, 'materialMargin', v)} />
                <InputField label="Surcharge" prefix="$" value={job.surcharge} onChange={(v) => updateJobType(job.id, 'surcharge', v)} />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-500">Member Rate</p>
                  <p className="font-bold">{formatCurrency(job.memberRate)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-slate-500">Min Invoice</p>
                  <p className="font-bold">{formatCurrency(job.minInvoice)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  // ============================================================================
  // TAB: P&L ANALYSIS
  // ============================================================================
  
  const AnalysisTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-emerald-100 text-sm">Annual Revenue</p>
            <p className="text-3xl font-bold">{formatCurrencyShort(revenueProjections.yearlyRevenue)}</p>
          </div>
          <div>
            <p className="text-emerald-100 text-sm">Gross Profit</p>
            <p className="text-3xl font-bold">{formatCurrencyShort(revenueProjections.grossProfit)}</p>
            <p className="text-emerald-200 text-sm">{formatPercent(revenueProjections.grossProfitPercent)}</p>
          </div>
          <div>
            <p className="text-emerald-100 text-sm">Net Profit</p>
            <p className="text-3xl font-bold">{formatCurrencyShort(revenueProjections.netProfit)}</p>
            <p className="text-emerald-200 text-sm">{formatPercent(revenueProjections.netProfitPercent)}</p>
          </div>
          <div>
            <p className="text-emerald-100 text-sm">Break-Even/Month</p>
            <p className="text-3xl font-bold">{formatCurrencyShort(revenueProjections.monthlyBreakEven)}</p>
          </div>
        </div>
      </div>
      
      <SectionCard title="P&L Breakdown" icon={PieChart}>
        <div className="space-y-3 mt-2">
          {[
            { label: 'Revenue', value: revenueProjections.yearlyRevenue, percent: 100, color: 'bg-sky-500' },
            { label: 'Materials', value: revenueProjections.materialsCost, percent: revenueProjections.materialsPercent, color: 'bg-amber-500' },
            { label: 'Labor (Tech)', value: revenueProjections.laborCost, percent: revenueProjections.laborPercent, color: 'bg-violet-500' },
            { label: 'Gross Profit', value: revenueProjections.grossProfit, percent: revenueProjections.grossProfitPercent, color: 'bg-emerald-500' },
            { label: 'Overhead', value: revenueProjections.overhead, percent: revenueProjections.overheadPercent, color: 'bg-rose-500' },
            { label: 'Net Profit', value: revenueProjections.netProfit, percent: revenueProjections.netProfitPercent, color: 'bg-teal-500' },
          ].map(row => (
            <div key={row.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">{row.label}</span>
                <span className="font-medium">{formatCurrency(row.value)} ({formatPercent(row.percent)})</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${row.color} rounded-full`} style={{ width: `${Math.min(Math.abs(row.percent), 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
  
  // ============================================================================
  // TAB: SCENARIOS
  // ============================================================================
  
  const ScenariosTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Saved Scenarios</h2>
        <button onClick={saveScenario} className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600">
          <Save className="w-4 h-4" /> Save Current
        </button>
      </div>
      
      {scenarios.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Layers className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No scenarios saved yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map(s => (
            <div key={s.id} onClick={() => loadScenario(s)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${activeScenario === s.id ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
              <h4 className="font-semibold">{s.name}</h4>
              <p className="text-xs text-slate-400 mb-3">{new Date(s.timestamp).toLocaleString()}</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Techs:</span><span>{s.summary.techCount}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">True Cost/Hr:</span><span>{formatCurrency(s.summary.avgTrueCost)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Hourly Rate:</span><span>{formatCurrency(s.summary.avgHourlyRate)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Net Profit:</span><span className="text-emerald-600">{formatCurrencyShort(s.summary.netProfit)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  // ============================================================================
  // TAB: SETTINGS
  // ============================================================================
  
  const SettingsTab = () => (
    <div className="space-y-6">
      <SectionCard title="Company Settings" icon={Building2}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
          <InputField label="Company Name" type="text" value={settings.companyName} onChange={(v) => updateSettings('companyName', v)} />
          <InputField label="Working Days/Year" value={settings.workingDaysPerYear} onChange={(v) => updateSettings('workingDaysPerYear', v)} />
          <InputField label="Weeks/Year" value={settings.weeksPerYear} onChange={(v) => updateSettings('weeksPerYear', v)} />
          <InputField label="Target Annual Revenue" prefix="$" value={settings.targetAnnualRevenue} onChange={(v) => updateSettings('targetAnnualRevenue', v)} />
          <InputField label="Material Cost %" suffix="%" value={settings.materialCostPercent} onChange={(v) => updateSettings('materialCostPercent', v)} />
        </div>
      </SectionCard>
      
      <SectionCard title="Display Options" icon={Eye}>
        <div className="space-y-3 mt-2">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-700">Show Vehicle Cost in Rate</p>
              <p className="text-sm text-slate-500">Add vehicle allocation to displayed hourly rates</p>
            </div>
            <Toggle value={settings.showVehicleCostInRate} onChange={(v) => updateSettings('showVehicleCostInRate', v)} />
          </div>
        </div>
      </SectionCard>
      
      <SectionCard title="Calculated Summary" icon={Calculator}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">Active Technicians</p>
            <p className="font-bold">{workforceSummary.activeTechnicians}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">Total Billable Hrs/Yr</p>
            <p className="font-bold">{formatNumber(workforceSummary.totalBillableHoursPerYear)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">Overhead %</p>
            <p className="font-bold">{formatPercent(expenseSummary.overheadPercent)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">Avg Loaded Cost/Hr</p>
            <p className="font-bold">{formatCurrency(workforceSummary.avgTrueCostPerHour + fleetSummary.costPerBillableHour)}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl shadow-lg shadow-sky-500/25">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Advanced Pricing System</h1>
                <p className="text-sm text-slate-500">{settings.companyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {unsavedChanges && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4" /> Unsaved
                </span>
              )}
              <button onClick={saveScenario} className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-sky-500/25">
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 -mb-px overflow-x-auto">
            <TabButton id="workforce" icon={Users} label="Workforce" badge={workforceSummary.activeTechnicians + workforceSummary.activeOfficeStaff} />
            <TabButton id="fleet" icon={Truck} label="Fleet" badge={fleetSummary.activeVehicles} />
            <TabButton id="expenses" icon={Receipt} label="Expenses" />
            <TabButton id="rates" icon={DollarSign} label="Hourly Rates" />
            <TabButton id="analysis" icon={BarChart3} label="P&L Analysis" />
            <TabButton id="scenarios" icon={Sparkles} label="Scenarios" badge={scenarios.length || null} />
            <TabButton id="settings" icon={Settings} label="Settings" />
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'workforce' && <WorkforceTab />}
        {activeTab === 'fleet' && <FleetTab />}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'rates' && <HourlyRatesTab />}
        {activeTab === 'analysis' && <AnalysisTab />}
        {activeTab === 'scenarios' && <ScenariosTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}
