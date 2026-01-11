import React, { useState } from 'react';
import { 
  CheckCircle2, AlertTriangle, FolderOpen, Image, DollarSign, FileText, 
  XCircle, Upload, RefreshCw, ChevronRight, Package, Wrench, Clock,
  ChevronLeft, Search, Filter, Plus, Download, Settings, Eye, EyeOff,
  Copy, Save, ExternalLink, Trash2, X, ArrowUpDown, MoreHorizontal,
  CheckSquare, Square, AlertCircle, TrendingUp, TrendingDown, Layers
} from 'lucide-react';

// ============================================================================
// MOCK DATA - Based on your actual API responses
// ============================================================================
const mockHealth = {
  overallScore: 65,
  grade: 'D',
  scores: { materials: 69, services: 61 },
  stats: {
    materials: { total: 5560, active: 2657, reviewed: 0, uncategorized: 2361, no_image: 791, zero_price: 145, no_description: 0 },
    services: { total: 2164, active: 2164, reviewed: 0, uncategorized: 724, no_image: 2164, zero_price: 457, no_description: 0 }
  },
  totalIssues: 6642
};

const mockServices = [
  { st_id: 1, code: 'AVIPT0106', name: '$150 Towards a Air Scrubber by Aerus', category: null, description: 'Exclusive total home service solutions VIP plan...', price: -150, cost: 0, image_url: null, is_reviewed: false, has_local_changes: false },
  { st_id: 2, code: 'AVIPT0105', name: '$150 Towards a Electrical Panel Upgrade', category: null, description: 'Exclusive total home service solutions VIP plan...', price: -150, cost: 0, image_url: null, is_reviewed: false, has_local_changes: true },
  { st_id: 3, code: 'CLNT6210', name: '$499 Pull & Clean Special', category: null, description: 'Clean Evaporator Coil (Removal from AHU) | Pu...', price: 0, cost: 0, image_url: null, is_reviewed: true, has_local_changes: false },
  { st_id: 4, code: 'LSLV-GRND-SPOT-6', name: '06 WATT SPOT LIGHT', category: 'Landscape', description: '6 Watt Ground Mount Flood Light 6 Watt LED', price: 477, cost: 120, image_url: 'https://via.placeholder.com/40', is_reviewed: true, has_local_changes: false },
  { st_id: 5, code: 'LSLV-GRND-SPOT-6-01', name: '06 WATT SPOT LIGHT ADD', category: 'Landscape', description: '6 Watt Ground Mount Flood Light 6 Watt LED', price: 417, cost: 100, image_url: 'https://via.placeholder.com/40', is_reviewed: false, has_local_changes: true },
];

const mockMaterials = [
  { st_id: 101, code: 'EMT-1-H-100-1', name: '1" 1-hole STRAP EMT', vendor: 'Default Replenishment Vendor', price: 0.86, cost: 0.26, image_url: 'https://via.placeholder.com/32', is_reviewed: true, has_local_changes: false },
  { st_id: 102, code: 'MAT-BUSH-1', name: '1" Plastic Bushing', vendor: 'Default Replenishment Vendor', price: 0.51, cost: 0.15, image_url: null, is_reviewed: false, has_local_changes: false },
  { st_id: 103, code: 'MAT-BUSH-1-2', name: '1/2" Plastic Bushing', vendor: 'Default Replenishment Vendor', price: 0.23, cost: 0.07, image_url: null, is_reviewed: false, has_local_changes: true },
];

const mockPendingSync = [
  { entity_type: 'service', st_id: 2, code: 'AVIPT0105', name: '$150 Towards a Electrical Panel Upgrade', sync_status: 'pending', pending_since: '2025-01-08T10:30:00Z', pending_changes: { price: -150, description: 'Updated' } },
  { entity_type: 'service', st_id: 5, code: 'LSLV-GRND-SPOT-6-01', name: '06 WATT SPOT LIGHT ADD', sync_status: 'error', sync_error: 'API rate limit exceeded', pending_since: '2025-01-07T14:20:00Z', pending_changes: { price: 417 } },
  { entity_type: 'material', st_id: 103, code: 'MAT-BUSH-1-2', name: '1/2" Plastic Bushing', sync_status: 'pending', pending_since: '2025-01-09T08:00:00Z', pending_changes: { cost: 0.07 } },
];

const mockCategories = [
  { id: 1, name: 'Landscape', count: 245 },
  { id: 2, name: 'Electrical', count: 512 },
  { id: 3, name: 'HVAC', count: 389 },
  { id: 4, name: 'Plumbing', count: 298 },
];

// ============================================================================
// MAIN APP - Tab Navigation
// ============================================================================
export default function PricebookOrganizationPreview() {
  const [activeTab, setActiveTab] = useState('services');
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Tab Navigation */}
      <div className="bg-white border-b px-6 py-2 flex items-center gap-4">
        <span className="font-semibold text-gray-900">Pricebook</span>
        <div className="flex gap-1">
          {['services', 'materials', 'dashboard', 'detail'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab 
                  ? 'bg-gray-900 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'services' && <ServicesListPage />}
      {activeTab === 'materials' && <MaterialsListPage />}
      {activeTab === 'dashboard' && <OrganizationDashboard />}
      {activeTab === 'detail' && <ServiceDetailPage />}
    </div>
  );
}

// ============================================================================
// PAGE 1: SERVICES LIST (Enhanced version of your current page)
// ============================================================================
function ServicesListPage() {
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [showHealthSidebar, setShowHealthSidebar] = useState(true);

  const toggleFilter = (filter) => {
    setActiveFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]);
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === mockServices.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(mockServices.map(s => s.st_id));
    }
  };

  const counts = {
    uncategorized: 3085,
    no_image: 2955,
    zero_price: 602,
    no_description: 0,
    needs_review: 7724,
    reviewed: 0,
    pending_sync: 17
  };

  return (
    <div className="flex h-[calc(100vh-52px)]">
      {/* Health Dashboard Sidebar */}
      {showHealthSidebar && (
        <div className="w-80 border-r bg-white p-4 overflow-auto">
          <HealthDashboardCard health={mockHealth} onFilterClick={toggleFilter} />
          <div className="mt-4">
            <EntityBreakdownCard health={mockHealth} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" /> NEW
            </button>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by Code, Name, Description"
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
              />
            </div>
            <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filters
            </button>
            
            {/* Pending Sync Badge */}
            <PendingSyncBadge count={17} errors={2} onClick={() => setShowSyncPanel(true)} />
            
            {/* Toggle Health Sidebar */}
            <button 
              onClick={() => setShowHealthSidebar(!showHealthSidebar)}
              className={`p-2 rounded-lg border ${showHealthSidebar ? 'bg-gray-100' : ''}`}
              title="Toggle Health Dashboard"
            >
              <TrendingUp className="h-4 w-4" />
            </button>
            
            <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" /> Edit Columns
            </button>
            <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4" /> Import
            </button>
          </div>

          {/* Quick Filters */}
          <QuickFiltersBar 
            activeFilters={activeFilters} 
            onToggle={toggleFilter} 
            onClear={() => setActiveFilters([])}
            counts={counts}
          />
        </div>

        {/* Bulk Actions Bar */}
        {selectedItems.length > 0 && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-3">
            <span className="text-sm font-medium text-blue-700">{selectedItems.length} selected</span>
            <button className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium">
              Mark Reviewed
            </button>
            <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium">
              Assign Category
            </button>
            <button className="px-3 py-1.5 border border-blue-300 text-blue-700 rounded text-xs font-medium">
              Push to ST
            </button>
            <button onClick={() => setSelectedItems([])} className="ml-auto text-sm text-blue-600">
              Clear selection
            </button>
          </div>
        )}

        {/* Table Header */}
        <div className="bg-gray-50 border-b px-4 py-2 grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <div className="col-span-1 flex items-center gap-2">
            <button onClick={toggleSelectAll}>
              {selectedItems.length === mockServices.length ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="col-span-3">Name</div>
          <div className="col-span-2">Code</div>
          <div className="col-span-1">Category</div>
          <div className="col-span-2">Description</div>
          <div className="col-span-1 text-right">Hours</div>
          <div className="col-span-1 text-right">Price</div>
          <div className="col-span-1 text-right">Status</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-auto">
          {mockServices.map(service => (
            <ServiceRow 
              key={service.st_id}
              service={service}
              selected={selectedItems.includes(service.st_id)}
              onSelect={() => {
                setSelectedItems(prev => 
                  prev.includes(service.st_id) 
                    ? prev.filter(id => id !== service.st_id) 
                    : [...prev, service.st_id]
                );
              }}
            />
          ))}
        </div>
      </div>

      {/* Pending Sync Panel Modal */}
      {showSyncPanel && (
        <PendingSyncPanel onClose={() => setShowSyncPanel(false)} />
      )}
    </div>
  );
}

// Service Row Component
function ServiceRow({ service, selected, onSelect }) {
  const hasIssues = !service.category || !service.image_url || service.price <= 0;
  
  return (
    <div className={`px-4 py-3 border-b grid grid-cols-12 gap-4 items-center hover:bg-gray-50 ${selected ? 'bg-blue-50' : ''}`}>
      <div className="col-span-1 flex items-center gap-2">
        <button onClick={onSelect}>
          {selected ? (
            <CheckSquare className="h-4 w-4 text-blue-600" />
          ) : (
            <Square className="h-4 w-4 text-gray-300" />
          )}
        </button>
        {service.image_url ? (
          <img src={service.image_url} alt="" className="w-8 h-8 rounded object-cover" />
        ) : (
          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
            <Image className="h-4 w-4 text-gray-300" />
          </div>
        )}
      </div>
      
      <div className="col-span-3 flex items-center gap-2">
        <span className="font-medium text-gray-900 truncate">{service.name}</span>
        {service.is_reviewed && <ReviewedBadge />}
        {service.has_local_changes && <PendingChangeDot />}
      </div>
      
      <div className="col-span-2 text-sm text-gray-500 font-mono">{service.code}</div>
      
      <div className="col-span-1">
        {service.category ? (
          <span className="text-sm text-gray-700">{service.category}</span>
        ) : (
          <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">--</span>
        )}
      </div>
      
      <div className="col-span-2 text-sm text-gray-500 truncate">{service.description}</div>
      
      <div className="col-span-1 text-sm text-gray-500 text-right">--</div>
      
      <div className="col-span-1 text-right">
        <span className={`text-sm font-medium ${service.price < 0 ? 'text-red-600' : service.price === 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
          {service.price < 0 ? `-$${Math.abs(service.price).toFixed(2)}` : `$${service.price.toFixed(2)}`}
        </span>
      </div>
      
      <div className="col-span-1 flex justify-end gap-1">
        {hasIssues && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </div>
  );
}

// ============================================================================
// PAGE 2: MATERIALS LIST
// ============================================================================
function MaterialsListPage() {
  const [showSyncPanel, setShowSyncPanel] = useState(false);

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border shadow-sm mb-4">
        <div className="px-4 py-3 flex items-center gap-3">
          <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" /> NEW
          </button>
          <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2">
            <ExternalLink className="h-4 w-4" /> Add from Web
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by Code, Name, Description"
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>
          <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filters
          </button>
          <PendingSyncBadge count={3} errors={0} onClick={() => setShowSyncPanel(true)} />
          <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2">
            <Download className="h-4 w-4" /> IMPORT
          </button>
          <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2">
            <Layers className="h-4 w-4" /> ALL
          </button>
        </div>

        {/* Quick Filters for Materials */}
        <div className="px-4 py-2 border-t flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">Quick Filters</span>
          <FilterPill label="No Image" count={791} color="orange" />
          <FilterPill label="Zero Price" count={145} color="red" />
          <FilterPill label="Needs Review" count={2657} color="gray" />
          <FilterPill label="Pending Sync" count={3} color="orange" active />
        </div>
      </div>

      {/* Materials List */}
      <div className="bg-white rounded-xl border shadow-sm">
        {mockMaterials.map(material => (
          <MaterialRow key={material.st_id} material={material} />
        ))}
      </div>

      {showSyncPanel && <PendingSyncPanel onClose={() => setShowSyncPanel(false)} />}
    </div>
  );
}

function MaterialRow({ material }) {
  return (
    <div className="px-4 py-3 border-b flex items-center hover:bg-gray-50 cursor-pointer">
      {material.image_url ? (
        <img src={material.image_url} alt="" className="w-8 h-8 rounded object-cover mr-3" />
      ) : (
        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center mr-3">
          <Package className="h-4 w-4 text-gray-300" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{material.name}</span>
          {material.is_reviewed && <ReviewedBadge />}
          {material.has_local_changes && <PendingChangeDot />}
        </div>
        <span className="text-sm text-gray-500">{material.vendor}</span>
      </div>
      
      <div className="text-right mr-4">
        <div className="text-green-600 font-semibold">${material.price.toFixed(2)}</div>
        <div className="text-xs text-gray-500">Cost: ${material.cost.toFixed(2)}</div>
      </div>
      
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </div>
  );
}

// ============================================================================
// PAGE 3: ORGANIZATION DASHBOARD (New dedicated page)
// ============================================================================
function OrganizationDashboard() {
  const [activeFilters, setActiveFilters] = useState([]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pricebook Organization</h1>
          <p className="text-gray-500">Clean up, organize, and improve your pricebook data quality</p>
        </div>
        <div className="flex items-center gap-3">
          <PendingSyncBadge count={17} errors={2} onClick={() => {}} />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
            Recalculate Health
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Items" value="7,724" subtext="5,560 materials · 2,164 services" icon={<Package />} />
        <StatCard label="Needs Attention" value="6,642" subtext="Issues to resolve" icon={<AlertTriangle />} color="yellow" />
        <StatCard label="Reviewed" value="0" subtext="0% complete" icon={<CheckCircle2 />} color="green" />
        <StatCard label="Pending Sync" value="17" subtext="2 with errors" icon={<Upload />} color="orange" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Health Dashboard */}
        <div className="col-span-1">
          <HealthDashboardCard 
            health={mockHealth} 
            onFilterClick={(f) => setActiveFilters([f])} 
          />
        </div>

        {/* Issues Breakdown */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Issues by Type</h3>
            <div className="grid grid-cols-2 gap-4">
              <IssueBreakdownCard 
                icon={<FolderOpen className="h-5 w-5" />}
                title="Uncategorized"
                count={3085}
                breakdown={[
                  { label: 'Materials', count: 2361 },
                  { label: 'Services', count: 724 },
                ]}
                color="yellow"
              />
              <IssueBreakdownCard 
                icon={<Image className="h-5 w-5" />}
                title="Missing Images"
                count={2955}
                breakdown={[
                  { label: 'Materials', count: 791 },
                  { label: 'Services', count: 2164 },
                ]}
                color="orange"
              />
              <IssueBreakdownCard 
                icon={<DollarSign className="h-5 w-5" />}
                title="Zero/Negative Price"
                count={602}
                breakdown={[
                  { label: 'Materials', count: 145 },
                  { label: 'Services', count: 457 },
                ]}
                color="red"
              />
              <IssueBreakdownCard 
                icon={<TrendingDown className="h-5 w-5" />}
                title="Margin Issues"
                count={195}
                breakdown={[
                  { label: 'Negative margin', count: 146 },
                  { label: 'High margin (>85%)', count: 49 },
                ]}
                color="purple"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Needs Attention Queue */}
      <div className="mt-6 bg-white rounded-xl border shadow-sm">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Needs Attention</h3>
            <p className="text-sm text-gray-500">Items sorted by priority score</p>
          </div>
          <button className="text-blue-600 text-sm font-medium">View All →</button>
        </div>
        <div className="divide-y">
          {mockServices.slice(0, 3).map(item => (
            <NeedsAttentionRow key={item.st_id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, icon, color = 'gray' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {React.cloneElement(icon, { className: 'h-4 w-4' })}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{subtext}</div>
    </div>
  );
}

function IssueBreakdownCard({ icon, title, count, breakdown, color }) {
  const colors = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  return (
    <div className={`p-4 rounded-lg border ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <span className="text-xl font-bold">{count.toLocaleString()}</span>
      </div>
      <div className="space-y-1">
        {breakdown.map(item => (
          <div key={item.label} className="flex justify-between text-sm opacity-75">
            <span>{item.label}</span>
            <span>{item.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NeedsAttentionRow({ item }) {
  const issues = [];
  if (!item.category) issues.push('uncategorized');
  if (!item.image_url) issues.push('no_image');
  if (item.price <= 0) issues.push('zero_price');

  return (
    <div className="px-4 py-3 flex items-center hover:bg-gray-50">
      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center mr-3">
        <Wrench className="h-4 w-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900">{item.name}</div>
        <div className="text-sm text-gray-500">{item.code}</div>
      </div>
      <div className="flex items-center gap-2 mr-4">
        {issues.map(issue => (
          <IssuePill key={issue} type={issue} />
        ))}
      </div>
      <ReviewedToggleButton isReviewed={item.is_reviewed} />
    </div>
  );
}

// ============================================================================
// PAGE 4: SERVICE DETAIL (Enhanced version)
// ============================================================================
function ServiceDetailPage() {
  const [isReviewed, setIsReviewed] = useState(false);
  const [hasChanges, setHasChanges] = useState(true);

  const service = {
    code: '100-EMT-80-CO',
    name: '1" EMT Conduit Only Open Up To 80\'',
    description: '1" EMT Conduit Only Open Up To 80\'',
    price: 667.00,
    memberPrice: 667.00,
    addOnPrice: 600.00,
    soldHours: 1.25,
    category: '1"-EMT',
    materials: mockMaterials,
    is_reviewed: isReviewed,
    has_local_changes: hasChanges,
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-4 w-4" /> Back to List
          </button>
          <span className="text-lg font-semibold">Services</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4" /> NEW
          </button>
          <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2">
            <Search className="h-4 w-4" /> SEARCH
          </button>
          <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2">
            <Copy className="h-4 w-4" /> DUPLICATE
          </button>
          <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> REFRESH
          </button>
          <div className="w-px h-6 bg-gray-200 mx-2" />
          <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2 text-gray-600">
            <Save className="h-4 w-4" /> SAVE
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2">
            <Download className="h-4 w-4" /> PULL
          </button>
          <button className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${hasChanges ? 'bg-blue-600 text-white' : 'border text-gray-400'}`}>
            <Upload className="h-4 w-4" /> PUSH
            {hasChanges && <span className="w-2 h-2 rounded-full bg-yellow-400" />}
          </button>
          <button className="px-4 py-2 border rounded-lg text-sm font-medium flex items-center gap-2">
            <ExternalLink className="h-4 w-4" /> VIEW IN ST
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Left Navigation */}
        <div className="w-12 border-r bg-white flex flex-col items-center py-4 gap-4">
          <button className="p-2 hover:bg-gray-100 rounded">&lt;</button>
          <div className="text-xs text-gray-500 text-center">PREV</div>
          <div className="flex-1" />
          <div className="text-xs text-gray-500 text-center">NEXT</div>
          <button className="p-2 hover:bg-gray-100 rounded">&gt;</button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Form */}
            <div className="col-span-2 space-y-4">
              {/* Review Status Bar - NEW */}
              <div className={`rounded-lg p-3 flex items-center justify-between ${isReviewed ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <div className="flex items-center gap-3">
                  {isReviewed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <div>
                    <span className={`font-medium ${isReviewed ? 'text-green-700' : 'text-yellow-700'}`}>
                      {isReviewed ? 'Field Ready' : 'Needs Review'}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {isReviewed ? 'This item has been reviewed and is ready for technicians' : 'Review pricing, description, and images before use'}
                    </span>
                  </div>
                </div>
                <ReviewedToggleButton 
                  isReviewed={isReviewed} 
                  onToggle={() => setIsReviewed(!isReviewed)} 
                  size="lg"
                />
              </div>

              {/* Pending Changes Warning - NEW */}
              {hasChanges && (
                <div className="rounded-lg p-3 bg-orange-50 border border-orange-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Upload className="h-5 w-5 text-orange-600" />
                    <div>
                      <span className="font-medium text-orange-700">Pending Changes</span>
                      <span className="text-sm text-gray-500 ml-2">Local edits not yet pushed to ServiceTitan</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setHasChanges(false)}
                    className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm font-medium"
                  >
                    Push Now
                  </button>
                </div>
              )}

              {/* Form Fields */}
              <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
                <FormField label="CODE" value={service.code} />
                <FormField label="NAME" value={service.name} editable />
                <FormField label="DESC" value={service.description} editable multiline />
                <FormField label="WARR" value="Warranty terms..." editable />
                <FormField label="UPGR" value="No upgrades assigned" action="+" />
                <FormField label="REC" value="No recommendations assigned" action="+" />
                <div className="flex items-center gap-3">
                  <span className="w-12 text-sm text-gray-500">CAT</span>
                  <span className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2">
                    {service.category} <X className="h-3 w-3" />
                  </span>
                  <button className="text-gray-400 hover:text-gray-600">+</button>
                </div>
              </div>

              {/* Materials Section */}
              <div className="bg-white rounded-xl border shadow-sm">
                <div className="px-4 py-3 border-b flex items-center gap-4">
                  <button className="px-3 py-1.5 bg-gray-900 text-white rounded text-sm font-medium">MATERIALS</button>
                  <button className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium">EQUIPMENT</button>
                </div>
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <button className="px-3 py-1.5 border rounded text-sm flex items-center gap-2">
                    <Search className="h-4 w-4" /> SEARCH
                  </button>
                  <button className="px-3 py-1.5 border rounded text-sm flex items-center gap-2">
                    <Copy className="h-4 w-4" /> COPY
                  </button>
                  <button className="px-3 py-1.5 border rounded text-sm">PASTE</button>
                  <button className="px-3 py-1.5 border rounded text-sm flex items-center gap-2">
                    <Save className="h-4 w-4" /> SAVE AS...
                  </button>
                  <button className="px-3 py-1.5 border rounded text-sm">LOAD KIT...</button>
                </div>
                <div className="divide-y">
                  {service.materials.map(mat => (
                    <div key={mat.st_id} className="px-4 py-3 flex items-center">
                      <img src={mat.image_url || 'https://via.placeholder.com/32'} alt="" className="w-8 h-8 rounded mr-3" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{mat.code}</div>
                        <div className="text-xs text-gray-500">{mat.name}</div>
                      </div>
                      <input type="number" defaultValue={1} className="w-16 px-2 py-1 border rounded text-center mr-4" />
                      <span className="text-green-600 font-medium mr-4">${mat.cost.toFixed(2)}</span>
                      <span className="text-sm text-gray-500 mr-4">{mat.vendor}</span>
                      <button className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t flex items-center justify-between bg-gray-50">
                  <button className="text-red-600 text-sm flex items-center gap-2">
                    <Trash2 className="h-4 w-4" /> Remove All
                  </button>
                  <div className="flex items-center gap-6 text-sm">
                    <span>NET <strong>$3.32</strong></span>
                    <span>LIST <strong>$10.45</strong></span>
                    <input type="text" placeholder="%" className="w-12 px-2 py-1 border rounded text-center" />
                    <span className="text-gray-500">override</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Pricing & Image */}
            <div className="space-y-4">
              {/* Status */}
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="font-medium">ACTIVE?</span>
                </label>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-gray-500">SOLD HRS</span>
                  <span className="font-medium">{service.soldHours}</span>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
                <PriceRow label="PRICE" value={service.price} />
                <PriceRow label="MEMBER" value={service.memberPrice} />
                <PriceRow label="ADD-ON" value={service.addOnPrice} />
                <PriceRow label="MEMBER ADD-ON" value={0} />
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">RATE CODE</span>
                    <input type="text" className="w-20 px-2 py-1 border rounded text-right" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">MARGIN %</span>
                    <div className="flex gap-2">
                      <input type="text" placeholder="LAB" className="w-16 px-2 py-1 border rounded text-center" />
                      <input type="text" placeholder="MAT" className="w-16 px-2 py-1 border rounded text-center" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Image */}
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  <img src="https://via.placeholder.com/200" alt="" className="max-w-full max-h-full object-contain" />
                </div>
                <button className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  <Settings className="h-4 w-4" /> Edit Image (1)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, value, editable, multiline, action }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-12 text-sm text-gray-500 pt-2">{label}</span>
      <div className="flex-1">
        {multiline ? (
          <textarea defaultValue={value} className="w-full px-3 py-2 border rounded-lg text-sm resize-none" rows={2} readOnly={!editable} />
        ) : (
          <input type="text" defaultValue={value} className="w-full px-3 py-2 border rounded-lg text-sm" readOnly={!editable} />
        )}
      </div>
      {action && <button className="p-2 text-gray-400 hover:text-gray-600">{action}</button>}
      {editable && <button className="p-2 text-gray-400 hover:text-gray-600">✏️</button>}
    </div>
  );
}

function PriceRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">$</span>
        <input type="number" defaultValue={value.toFixed(2)} className="w-24 px-2 py-1 border rounded text-right font-medium" />
      </div>
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

// Health Dashboard Card
function HealthDashboardCard({ health, onFilterClick }) {
  const getGradeColor = (grade) => {
    const colors = { A: 'text-green-600 bg-green-100', B: 'text-blue-600 bg-blue-100', C: 'text-yellow-600 bg-yellow-100', D: 'text-orange-600 bg-orange-100', F: 'text-red-600 bg-red-100' };
    return colors[grade] || colors.F;
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Pricebook Health</h2>
        <button className="p-1.5 hover:bg-gray-100 rounded"><RefreshCw className="h-4 w-4 text-gray-400" /></button>
      </div>
      
      {/* Score Display */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <span className="text-sm text-gray-500">Overall Score</span>
            <span className="text-2xl font-bold text-gray-900">{health.overallScore}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${health.overallScore}%` }} />
          </div>
        </div>
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${getGradeColor(health.grade)}`}>
          {health.grade}
        </div>
      </div>

      {/* Issue Cards */}
      <div className="grid grid-cols-2 gap-2">
        <IssueCard icon={<FolderOpen className="h-4 w-4" />} label="Uncategorized" count={3085} onClick={() => onFilterClick?.('uncategorized')} />
        <IssueCard icon={<Image className="h-4 w-4" />} label="No Image" count={2955} onClick={() => onFilterClick?.('no_image')} />
        <IssueCard icon={<DollarSign className="h-4 w-4" />} label="Zero Price" count={602} variant="error" onClick={() => onFilterClick?.('zero_price')} />
        <IssueCard icon={<FileText className="h-4 w-4" />} label="No Description" count={0} onClick={() => onFilterClick?.('no_description')} />
      </div>

      {/* View All Button */}
      <button className="w-full py-2 border border-orange-200 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 flex items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        View {health.totalIssues.toLocaleString()} Items
      </button>
    </div>
  );
}

function IssueCard({ icon, label, count, variant = 'warning', onClick }) {
  if (count === 0) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border bg-green-50 border-green-200 text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
        <span className="ml-auto text-xs">✓</span>
      </div>
    );
  }
  
  const colors = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100',
    error: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
  };

  return (
    <button onClick={onClick} className={`flex items-center gap-2 p-2 rounded-lg border w-full text-left transition-colors ${colors[variant]}`}>
      <AlertTriangle className="h-4 w-4" />
      <span className="text-xs font-medium">{label}</span>
      <span className="ml-auto text-sm font-bold">{count.toLocaleString()}</span>
    </button>
  );
}

function EntityBreakdownCard({ health }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">By Type</h3>
      
      {['materials', 'services'].map((type) => {
        const stats = health.stats[type];
        const score = health.scores[type];
        const reviewedPct = stats.active > 0 ? Math.round((stats.reviewed / stats.active) * 100) : 0;
        
        return (
          <div key={type} className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {type === 'materials' ? <Package className="h-4 w-4 text-gray-400" /> : <Wrench className="h-4 w-4 text-gray-400" />}
                <span className="font-medium capitalize">{type}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${score >= 70 ? 'bg-green-100 text-green-700' : score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                {score}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{stats.reviewed}/{stats.active} reviewed</span>
              <span>{reviewedPct}%</span>
            </div>
            <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${reviewedPct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Quick Filters Bar
function QuickFiltersBar({ activeFilters, onToggle, onClear, counts }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quick Filters</span>
      <FilterPill label="Uncategorized" count={counts.uncategorized} color="yellow" active={activeFilters.includes('uncategorized')} onClick={() => onToggle('uncategorized')} />
      <FilterPill label="No Image" count={counts.no_image} color="orange" active={activeFilters.includes('no_image')} onClick={() => onToggle('no_image')} />
      <FilterPill label="Zero Price" count={counts.zero_price} color="red" active={activeFilters.includes('zero_price')} onClick={() => onToggle('zero_price')} />
      <FilterPill label="No Description" count={counts.no_description} color="blue" active={activeFilters.includes('no_description')} onClick={() => onToggle('no_description')} />
      <FilterPill label="Needs Review" count={counts.needs_review} color="gray" active={activeFilters.includes('needs_review')} onClick={() => onToggle('needs_review')} />
      <FilterPill label="Reviewed" count={counts.reviewed} color="green" active={activeFilters.includes('reviewed')} onClick={() => onToggle('reviewed')} />
      <FilterPill label="Pending Sync" count={counts.pending_sync} color="orange" active={activeFilters.includes('pending_sync')} onClick={() => onToggle('pending_sync')} />
      {activeFilters.length > 0 && (
        <button onClick={onClear} className="text-xs text-gray-500 hover:text-gray-700 ml-2">
          Clear all
        </button>
      )}
    </div>
  );
}

function FilterPill({ label, count, color, active, onClick }) {
  const colors = {
    yellow: active ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-yellow-50 text-yellow-700 border-yellow-200',
    orange: active ? 'bg-orange-500 text-white border-orange-500' : 'bg-orange-50 text-orange-700 border-orange-200',
    red: active ? 'bg-red-500 text-white border-red-500' : 'bg-red-50 text-red-700 border-red-200',
    blue: active ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-50 text-blue-700 border-blue-200',
    gray: active ? 'bg-gray-500 text-white border-gray-500' : 'bg-gray-50 text-gray-700 border-gray-200',
    green: active ? 'bg-green-500 text-white border-green-500' : 'bg-green-50 text-green-700 border-green-200',
  };

  return (
    <button 
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors ${colors[color]}`}
    >
      {label}
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-white/20' : 'bg-black/5'}`}>
        {count.toLocaleString()}
      </span>
    </button>
  );
}

// Reviewed Toggle Button
function ReviewedToggleButton({ isReviewed, onToggle, size = 'md' }) {
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  };

  return (
    <button
      onClick={onToggle}
      className={`rounded-lg font-medium flex items-center gap-1.5 transition-colors ${sizes[size]} ${
        isReviewed 
          ? 'bg-green-600 text-white hover:bg-green-700' 
          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {isReviewed ? (
        <><CheckCircle2 className="h-3.5 w-3.5" /> FIELD READY</>
      ) : (
        <><XCircle className="h-3.5 w-3.5" /> Mark Reviewed</>
      )}
    </button>
  );
}

// Reviewed Badge (small inline)
function ReviewedBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
      <CheckCircle2 className="h-2.5 w-2.5" /> ✓
    </span>
  );
}

// Pending Change Dot
function PendingChangeDot() {
  return <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Pending sync to ServiceTitan" />;
}

// Issue Pill
function IssuePill({ type }) {
  const config = {
    uncategorized: { label: 'Uncategorized', color: 'bg-yellow-100 text-yellow-700' },
    no_image: { label: 'No Image', color: 'bg-orange-100 text-orange-700' },
    zero_price: { label: 'Zero Price', color: 'bg-red-100 text-red-700' },
    no_description: { label: 'No Desc', color: 'bg-blue-100 text-blue-700' },
  };
  const { label, color } = config[type] || { label: type, color: 'bg-gray-100 text-gray-700' };
  
  return <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${color}`}>{label}</span>;
}

// Pending Sync Badge (header indicator)
function PendingSyncBadge({ count, errors, onClick }) {
  if (count === 0 && errors === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 border ${
        errors > 0 ? 'border-red-300 text-red-600 bg-red-50' : 'border-orange-300 text-orange-600 bg-orange-50'
      }`}
    >
      <Upload className={`h-4 w-4 ${count > 0 ? 'animate-pulse' : ''}`} />
      <span>{count + errors}</span>
      {errors > 0 && <span className="px-1.5 py-0.5 bg-red-500 text-white rounded text-[10px]">{errors} err</span>}
    </button>
  );
}

// Pending Sync Panel (Modal)
function PendingSyncPanel({ onClose }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [pushing, setPushing] = useState(false);

  const toggleItem = (id) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handlePush = () => {
    setPushing(true);
    setTimeout(() => {
      setPushing(false);
      setSelectedItems([]);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pending Sync to ServiceTitan</h2>
            <p className="text-sm text-gray-500">Items with local changes not yet pushed</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b flex items-center gap-2">
          <button className="px-3 py-1.5 bg-gray-900 text-white rounded text-sm">All (17)</button>
          <button className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm">Services (14)</button>
          <button className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm">Materials (3)</button>
          <button className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm">Errors (2)</button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          {mockPendingSync.map(item => (
            <div key={`${item.entity_type}-${item.st_id}`} className={`px-6 py-3 border-b flex items-center hover:bg-gray-50 ${item.sync_status === 'error' ? 'bg-red-50' : ''}`}>
              <button onClick={() => toggleItem(item.st_id)} className="mr-3">
                {selectedItems.includes(item.st_id) ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                ) : (
                  <Square className="h-4 w-4 text-gray-300" />
                )}
              </button>
              
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center mr-3">
                {item.entity_type === 'material' ? <Package className="h-4 w-4 text-gray-400" /> : <Wrench className="h-4 w-4 text-gray-400" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-500">{item.code}</div>
              </div>
              
              <div className="flex items-center gap-2 mr-4">
                {Object.entries(item.pending_changes).filter(([_, v]) => v !== null).map(([key, _]) => (
                  <span key={key} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                    {key}
                  </span>
                ))}
              </div>
              
              <div className="text-xs text-gray-500 mr-4">
                <Clock className="h-3 w-3 inline mr-1" />
                {new Date(item.pending_since).toLocaleDateString()}
              </div>
              
              {item.sync_status === 'error' ? (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Error
                  </span>
                  <button className="text-xs text-blue-600 hover:underline">Retry</button>
                </div>
              ) : (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-medium">
                  Pending
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {selectedItems.length > 0 ? `${selectedItems.length} selected` : 'Select items to push'}
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium">
              Retry Failed (2)
            </button>
            <button 
              onClick={handlePush}
              disabled={selectedItems.length === 0 || pushing}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                selectedItems.length > 0 && !pushing
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {pushing ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Pushing...</>
              ) : (
                <><Upload className="h-4 w-4" /> Push Selected ({selectedItems.length})</>
              )}
            </button>
            <button 
              onClick={handlePush}
              disabled={pushing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
            >
              Push All Pending (15)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
