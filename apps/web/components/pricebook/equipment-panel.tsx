'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Download, List, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { EquipmentEditor } from './equipment-editor';

interface Equipment {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description: string;
  manufacturer: string;
  modelNumber: string;
  cost: number;
  price: number;
  memberPrice: number;
  active: boolean;
  defaultImageUrl: string | null;
}

interface EquipmentPanelProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export function EquipmentPanel({ selectedCategory, onCategorySelect }: EquipmentPanelProps) {
  const searchParams = useSearchParams();
  const currentSection = searchParams.get('section');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Close editor when navigating to a different section
  useEffect(() => {
    if (currentSection && currentSection !== 'equipment') {
      setShowEditor(false);
      setSelectedEquipment(null);
    }
  }, [currentSection]);

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['pricebook-equipment', selectedCategory, searchQuery],
    queryFn: () => fetchEquipment(selectedCategory, searchQuery),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="flex h-full">
      {/* Equipment List */}
      <div className={cn("flex-1 flex flex-col", showEditor && "border-r")}>
        {/* Action Bar */}
        <div className="p-3 border-b flex items-center gap-2">
          <Button size="sm" onClick={() => { setSelectedEquipment(null); setShowEditor(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            NEW
          </Button>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            IMPORT
          </Button>
          <Button variant="outline" size="sm">
            <List className="h-4 w-4 mr-1" />
            ALL
          </Button>
        </div>

        {/* Equipment List */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading equipment...</div>
          ) : !equipment?.length ? (
            <div className="p-8 text-center text-muted-foreground">No equipment found</div>
          ) : (
            <div className="divide-y">
              {equipment.map((item: Equipment) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                    selectedEquipment?.id === item.id && "bg-primary/5"
                  )}
                  onClick={() => { setSelectedEquipment(item); setShowEditor(true); }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.defaultImageUrl && (
                      <img 
                        src={item.defaultImageUrl} 
                        alt="" 
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {item.displayName || item.name}
                      </div>
                      {item.manufacturer && (
                        <div className="text-xs text-muted-foreground">
                          {item.manufacturer} {item.modelNumber && `- ${item.modelNumber}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        {formatCurrency(item.price || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cost: {formatCurrency(item.cost || 0)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Panel */}
      {showEditor && (
        <div className="w-[400px] flex-shrink-0">
          <EquipmentEditor
            equipment={selectedEquipment}
            onClose={() => { setShowEditor(false); setSelectedEquipment(null); }}
            onSave={() => { setShowEditor(false); setSelectedEquipment(null); }}
          />
        </div>
      )}
    </div>
  );
}

async function fetchEquipment(categoryId: string | null, search: string): Promise<Equipment[]> {
  const params = new URLSearchParams();
  if (categoryId) params.set('category', categoryId);
  if (search) params.set('search', search);
  
  const res = await fetch(apiUrl(`/api/pricebook/equipment?${params}`));
  if (!res.ok) return [];
  return res.json();
}
