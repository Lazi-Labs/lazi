'use client';

import { Builder, builder } from '@builder.io/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Initialize Builder.io with API key (for client-side component registration)
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY || '7c71c6ee1a30448bb82e930635a03bcd');

// Import pricebook components
import { PricebookCategorySidebar } from '@/components/pricebook/pricebook-category-sidebar';
import { ServicesPanel } from '@/components/pricebook/services-panel';
import { MaterialsPanel } from '@/components/pricebook/materials-panel';
import { EquipmentPanel } from '@/components/pricebook/equipment-panel';
import { VendorsPanel } from '@/components/pricebook/vendors-panel';
import { CategoriesPanel } from '@/components/pricebook/categories-panel';
import { ServiceDetailPage } from '@/components/pricebook/service-detail-page';
import { MaterialDetailPage } from '@/components/pricebook/material-detail-page';

// ===========================================
// PRICEBOOK COMPONENTS FOR BUILDER.IO
// ===========================================

Builder.registerComponent(PricebookCategorySidebar, {
  name: 'Pricebook Category Sidebar',
  inputs: [
    { name: 'activeSection', type: 'enum', enum: ['services', 'materials', 'equipment', 'vendors', 'categories'], defaultValue: 'services' },
  ],
});

Builder.registerComponent(ServicesPanel, {
  name: 'Pricebook Services Panel',
  inputs: [
    { name: 'selectedCategory', type: 'string', defaultValue: '' },
  ],
});

Builder.registerComponent(MaterialsPanel, {
  name: 'Pricebook Materials Panel',
  inputs: [
    { name: 'selectedCategory', type: 'string', defaultValue: '' },
  ],
});

Builder.registerComponent(EquipmentPanel, {
  name: 'Pricebook Equipment Panel',
  inputs: [
    { name: 'selectedCategory', type: 'string', defaultValue: '' },
  ],
});

Builder.registerComponent(VendorsPanel, {
  name: 'Pricebook Vendors Panel',
  inputs: [],
});

Builder.registerComponent(CategoriesPanel, {
  name: 'Pricebook Categories Panel',
  inputs: [],
});

Builder.registerComponent(ServiceDetailPage, {
  name: 'Service Detail Page',
  inputs: [
    { name: 'serviceId', type: 'string', defaultValue: '' },
  ],
});

Builder.registerComponent(MaterialDetailPage, {
  name: 'Material Detail Page',
  inputs: [
    { name: 'materialId', type: 'string', defaultValue: '' },
  ],
});

// ===========================================
// PRICEBOOK LAYOUT COMPONENTS
// ===========================================

interface PricebookLayoutProps {
  children?: React.ReactNode;
}

function PricebookLayout({ children }: PricebookLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-120px)]">
      {children}
    </div>
  );
}

Builder.registerComponent(PricebookLayout, {
  name: 'Pricebook Layout',
  canHaveChildren: true,
  inputs: [],
});

// Pricebook Header Component
interface PricebookHeaderProps {
  title?: string;
  description?: string;
  showNewButton?: boolean;
  showSearch?: boolean;
  showImport?: boolean;
  showFilterCategories?: boolean;
  showExportImport?: boolean;
}

function PricebookHeader({ 
  title = 'Pricebook',
  description = 'Manage services, materials, and equipment pricing',
  showNewButton = true,
  showSearch = true,
  showImport = true,
  showFilterCategories = true,
  showExportImport = true,
}: PricebookHeaderProps) {
  return (
    <div className="p-4 border-b flex items-center justify-between bg-background">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        {showNewButton && (
          <Button variant="link" className="text-primary">
            <span className="mr-1">+</span> NEW
          </Button>
        )}
        {showSearch && (
          <>
            <span className="text-sm text-muted-foreground">Search:</span>
            <Input placeholder="" className="w-48 h-8" />
          </>
        )}
        {showImport && (
          <Button variant="link" className="text-primary">Import</Button>
        )}
        {showFilterCategories && (
          <Button variant="outline" size="sm" className="text-primary border-primary">
            Filter Categories
          </Button>
        )}
        {showExportImport && (
          <>
            <Button variant="outline" size="sm">Import</Button>
            <Button variant="outline" size="sm">Export</Button>
          </>
        )}
      </div>
    </div>
  );
}

Builder.registerComponent(PricebookHeader, {
  name: 'Pricebook Header',
  inputs: [
    { name: 'title', type: 'text', defaultValue: 'Pricebook' },
    { name: 'description', type: 'text', defaultValue: 'Manage services, materials, and equipment pricing' },
    { name: 'showNewButton', type: 'boolean', defaultValue: true },
    { name: 'showSearch', type: 'boolean', defaultValue: true },
    { name: 'showImport', type: 'boolean', defaultValue: true },
    { name: 'showFilterCategories', type: 'boolean', defaultValue: true },
    { name: 'showExportImport', type: 'boolean', defaultValue: true },
  ],
});

// Pricebook Content Area
interface PricebookContentProps {
  children?: React.ReactNode;
}

function PricebookContent({ children }: PricebookContentProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {children}
    </div>
  );
}

Builder.registerComponent(PricebookContent, {
  name: 'Pricebook Content',
  canHaveChildren: true,
  inputs: [],
});

export { PricebookLayout, PricebookHeader, PricebookContent };
