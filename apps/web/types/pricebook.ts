// =============================================================================
// LAZI CRM - Pricebook Types
// =============================================================================
// Type definitions for services, materials, and pricebook management
// =============================================================================

export interface Service {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  hours: number;
  staticPrice: number;
  staticMemberPrice?: number;
  dynamicPrice: number | null;
  priceRule: string | null;
  imageUrl: string | null;
  materialsCost?: number;
  businessUnit?: string;
  taxable?: boolean;
  active: boolean;
  incomeAccount?: string;
  warrantyDescription?: string;
  staticAddOnPrice?: number;
  staticAddOnMemberPrice?: number;
  crossSaleGroup?: string;
  upgrades?: string[];
  recommendations?: string[];
  bonusDollar?: number;
  bonusPercent?: number;
  conversionTags?: string[];
  techSpecificBonus?: boolean;
  paysCommission?: boolean;
  linkedMaterials?: string[];
  linkedEquipment?: string[];
  useStaticPrice?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ColumnConfig {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
}

export interface ServicesPageParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ServicesResponse {
  services: Service[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Default columns configuration
export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'media', label: 'Media', checked: true },
  { id: 'name', label: 'Name', checked: true, disabled: true },
  { id: 'code', label: 'Code', checked: true, disabled: true },
  { id: 'category', label: 'Category', checked: true },
  { id: 'description', label: 'Description', checked: true },
  { id: 'hours', label: 'Hours', checked: true },
  { id: 'staticPrice', label: 'Static Price', checked: true },
  { id: 'staticMemberPrice', label: 'Static Member Price', checked: false },
  { id: 'materialsCost', label: 'Materials Cost', checked: true },
  { id: 'dynamicPrice', label: 'Dynamic Price', checked: true, disabled: true },
  { id: 'priceRule', label: 'Price Rule', checked: true },
];

export const ADDITIONAL_COLUMNS: ColumnConfig[] = [
  { id: 'incomeAccount', label: 'Income Account', checked: false },
  { id: 'warrantyDescription', label: 'Warranty Description', checked: false },
  { id: 'businessUnit', label: 'Business Unit', checked: false },
  { id: 'taxable', label: 'Taxable', checked: false },
  { id: 'staticAddOnPrice', label: 'Static Add on Price', checked: false },
  { id: 'staticAddOnMemberPrice', label: 'Static Add on Member Price', checked: false },
  { id: 'crossSaleGroup', label: 'Cross Sale Group', checked: false },
  { id: 'upgrades', label: 'Upgrades', checked: true },
  { id: 'recommendations', label: 'Recommendations', checked: true },
  { id: 'bonusDollar', label: '$ Bonus', checked: false },
  { id: 'conversionTags', label: 'Conversion Tags', checked: false },
  { id: 'bonusPercent', label: '% Bonus', checked: false },
  { id: 'techSpecificBonus', label: 'Tech Specific Bonus', checked: false },
  { id: 'paysCommission', label: 'Pays Commission', checked: false },
  { id: 'linkedMaterials', label: 'Linked Materials', checked: true },
  { id: 'linkedEquipment', label: 'Linked Equipment', checked: true },
  { id: 'useStaticPrice', label: 'Use Static Price', checked: true },
];

// Get all columns combined
export function getAllColumns(): ColumnConfig[] {
  return [...DEFAULT_COLUMNS, ...ADDITIONAL_COLUMNS];
}

// Get default visible columns
export function getDefaultVisibleColumns(): string[] {
  return getAllColumns()
    .filter(col => col.checked)
    .map(col => col.id);
}

// Local storage key for column preferences
export const COLUMNS_STORAGE_KEY = 'lazi-services-columns';
