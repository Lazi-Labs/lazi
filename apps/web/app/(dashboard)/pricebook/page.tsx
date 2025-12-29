'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ServicesPanel } from '@/components/pricebook/services-panel';
import { MaterialsPanel } from '@/components/pricebook/materials-panel';
import { CategoriesPanel } from '@/components/pricebook/categories-panel';
import { EquipmentPanel } from '@/components/pricebook/equipment-panel';

type PricebookSection = 'services' | 'materials' | 'equipment' | 'other' | 'discounts' | 'categories' | 'price-setup' | 'history' | 'pricing-builder' | 'templates' | 'import-export' | 'vendors';

export default function PricebookPage() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section') as PricebookSection | null;
  const [activeSection, setActiveSection] = useState<PricebookSection>(sectionParam || 'services');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Update active section when URL param changes
  useEffect(() => {
    if (sectionParam) {
      setActiveSection(sectionParam);
    }
  }, [sectionParam]);

  const renderSection = () => {
    switch (activeSection) {
      case 'services':
        return (
          <ServicesPanel
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />
        );
      case 'materials':
        return (
          <MaterialsPanel
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />
        );
      case 'categories':
        return <CategoriesPanel />;
      case 'equipment':
        return (
          <EquipmentPanel
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />
        );
      case 'vendors':
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">Vendors</p>
              <p className="text-sm mt-2">Vendor management coming soon</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium capitalize">{activeSection.replace('-', ' ')}</p>
              <p className="text-sm mt-2">This section is coming soon</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      {renderSection()}
    </div>
  );
}
