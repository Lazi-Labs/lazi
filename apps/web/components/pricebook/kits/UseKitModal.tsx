'use client';

import React, { useState } from 'react';
import { X, Package, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Kit {
  id: string;
  name: string;
  description?: string;
  categoryPath: string[];
  itemCount: number;
}

interface UseKitModalProps {
  onApply: (kit: Kit, multiplier: number) => void;
  onClose: () => void;
}

async function fetchKits(search?: string) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  
  const res = await fetch(`/api/pricebook/kits?${params}`);
  if (!res.ok) throw new Error('Failed to fetch kits');
  return res.json();
}

export function UseKitModal({ onApply, onClose }: UseKitModalProps) {
  const [search, setSearch] = useState('');
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  
  const { data, isLoading } = useQuery({
    queryKey: ['kits-modal', debouncedSearch],
    queryFn: () => fetchKits(debouncedSearch),
  });
  
  const kits = data?.data || [];
  
  const handleApply = () => {
    if (selectedKit) {
      onApply(selectedKit, multiplier);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-blue-400" />
            <h2 className="font-semibold text-lg">Load Material Kit</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
            <Search size={16} className="text-zinc-500" />
            <input
              type="text"
              placeholder="Search kits..."
              className="bg-transparent flex-1 outline-none text-sm text-white placeholder-zinc-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="text-center text-zinc-500 py-8">Loading kits...</div>
          ) : kits.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              <Package size={32} className="mx-auto mb-2 opacity-50" />
              <p>No kits found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {kits.map((kit: Kit) => (
                <button
                  key={kit.id}
                  onClick={() => setSelectedKit(kit)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedKit?.id === kit.id 
                      ? 'bg-blue-600/20 border border-blue-500/50' 
                      : 'bg-zinc-800 hover:bg-zinc-700 border border-transparent'
                  }`}
                >
                  <div className="font-medium">{kit.name}</div>
                  <div className="text-sm text-zinc-500 mt-1">
                    {kit.itemCount} materials
                    {kit.categoryPath && kit.categoryPath.length > 0 && (
                      <span className="ml-2">• {kit.categoryPath.join(' › ')}</span>
                    )}
                  </div>
                  {kit.description && (
                    <div className="text-sm text-zinc-400 mt-1 line-clamp-1">{kit.description}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {selectedKit && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-800/30">
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm text-zinc-400">Quantity Multiplier:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMultiplier(Math.max(1, multiplier - 1))}
                  className="w-8 h-8 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={multiplier}
                  onChange={e => setMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-center"
                />
                <button
                  onClick={() => setMultiplier(multiplier + 1)}
                  className="w-8 h-8 bg-zinc-700 hover:bg-zinc-600 rounded flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <span className="text-sm text-zinc-500">
                ({selectedKit.itemCount * multiplier} total items)
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium"
              >
                Apply Kit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
