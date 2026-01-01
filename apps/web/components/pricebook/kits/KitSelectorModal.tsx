'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Layers, ChevronRight, ChevronDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiUrl } from '@/lib/api';

interface Kit {
  id: string;
  name: string;
  description?: string;
  category_path?: string;
  item_count: number;
  group_count: number;
}

interface KitWithItems extends Kit {
  items: Array<{
    id: string;
    materialId: string;
    quantity: number;
    material?: {
      id: string;
      code: string;
      name: string;
      description?: string;
      cost: number;
      unit?: string;
    };
  }>;
  groups: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface MaterialItem {
  id: string;
  materialId: string;
  code: string;
  name: string;
  description?: string;
  quantity: number;
  unitCost: number;
}

interface KitSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (materials: MaterialItem[]) => void;
  existingMaterials?: MaterialItem[];
}

async function fetchKits(search?: string): Promise<Kit[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);

  const res = await fetch(apiUrl(`/api/pricebook/kits?${params}`), {
    headers: { 'x-tenant-id': '3222348440' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

async function fetchKit(id: string): Promise<KitWithItems | null> {
  const res = await fetch(apiUrl(`/api/pricebook/kits/${id}`), {
    headers: { 'x-tenant-id': '3222348440' },
  });
  if (!res.ok) return null;
  return res.json();
}

export function KitSelectorModal({ isOpen, onClose, onApply, existingMaterials = [] }: KitSelectorModalProps) {
  const [search, setSearch] = useState('');
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch kits list
  const { data: kits = [], isLoading: isLoadingKits } = useQuery({
    queryKey: ['kits-list', debouncedSearch],
    queryFn: () => fetchKits(debouncedSearch),
    enabled: isOpen,
  });

  // Fetch selected kit details
  const { data: selectedKit, isLoading: isLoadingKit } = useQuery({
    queryKey: ['kit-detail', selectedKitId],
    queryFn: () => fetchKit(selectedKitId!),
    enabled: !!selectedKitId,
  });

  // Calculate preview of materials to be added
  const previewMaterials = useMemo(() => {
    if (!selectedKit?.items) return [];
    return selectedKit.items.map(item => ({
      id: item.id,
      materialId: String(item.materialId || item.material?.id),
      code: item.material?.code || 'Unknown',
      name: item.material?.name || 'Unknown Material',
      description: item.material?.description,
      quantity: item.quantity * multiplier,
      unitCost: item.material?.cost || 0,
    }));
  }, [selectedKit, multiplier]);

  const totalCost = previewMaterials.reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);

  const handleApply = () => {
    if (previewMaterials.length > 0) {
      onApply(previewMaterials);
      onClose();
      // Reset state
      setSelectedKitId(null);
      setMultiplier(1);
      setSearch('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Load Material Kit</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search kits by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Kits List */}
          <div className="w-1/2 border-r border-zinc-800 overflow-y-auto">
            {isLoadingKits ? (
              <div className="p-8 text-center text-zinc-500">Loading kits...</div>
            ) : kits.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No kits found</p>
                <p className="text-xs mt-1">Create kits in the Material Kits section</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {kits.map((kit) => (
                  <button
                    key={kit.id}
                    onClick={() => setSelectedKitId(kit.id)}
                    className={`w-full p-3 text-left hover:bg-zinc-800/50 transition-colors ${
                      selectedKitId === kit.id ? 'bg-blue-600/20 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{kit.name}</span>
                      <ChevronRight className={`h-4 w-4 text-zinc-500 ${selectedKitId === kit.id ? 'text-blue-400' : ''}`} />
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {kit.item_count} materials
                      {kit.group_count > 0 && ` • ${kit.group_count} groups`}
                    </div>
                    {kit.description && (
                      <p className="text-xs text-zinc-600 mt-1 truncate">{kit.description}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kit Preview */}
          <div className="w-1/2 overflow-y-auto">
            {selectedKitId ? (
              isLoadingKit ? (
                <div className="p-8 text-center text-zinc-500">Loading kit details...</div>
              ) : selectedKit ? (
                <div className="p-4">
                  <h3 className="font-semibold mb-2">{selectedKit.name}</h3>
                  {selectedKit.description && (
                    <p className="text-sm text-zinc-400 mb-4">{selectedKit.description}</p>
                  )}

                  {/* Materials Preview */}
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {previewMaterials.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-sm py-1">
                        <span className="font-mono text-blue-400 text-xs w-20 truncate">{m.code}</span>
                        <span className="flex-1 truncate text-zinc-300">{m.name}</span>
                        <span className="text-zinc-500 w-12 text-right">{m.quantity}</span>
                        <span className="text-green-500 w-16 text-right">${(m.quantity * m.unitCost).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Multiplier */}
                  <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">Quantity Multiplier</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMultiplier(Math.max(1, multiplier - 1))}
                          className="w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center"
                        >
                          -
                        </button>
                        <Input
                          type="number"
                          min={1}
                          value={multiplier}
                          onChange={(e) => setMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 h-8 text-center bg-zinc-700 border-zinc-600"
                        />
                        <button
                          onClick={() => setMultiplier(multiplier + 1)}
                          className="w-8 h-8 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Multiplies all quantities (e.g., 2x doubles every material)
                    </p>
                  </div>

                  {/* Total */}
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Total Materials Cost:</span>
                    <span className="font-semibold text-green-400 text-lg">${totalCost.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-500">Kit not found</div>
              )
            ) : (
              <div className="p-8 text-center text-zinc-500">
                <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a kit to preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            {existingMaterials.length > 0 && (
              <span>Materials will be added to existing {existingMaterials.length} items</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!selectedKit || previewMaterials.length === 0}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Apply Kit ({previewMaterials.length} materials)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
