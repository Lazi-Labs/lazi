'use client';

import React, { useState, useMemo } from 'react';
import { Package, Plus, Search, Check } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KitCard } from './KitCard';
import { KitEditor } from './KitEditor';
import { WaterfallCategoryFilter, kitCategoryTree } from './WaterfallCategoryFilter';
import { Kit as SharedKit, KitMaterialItem, KitGroup } from './types';

// Extended Kit type for page use (includes computed fields from API)
interface Kit extends SharedKit {
  itemCount?: number;
  groupCount?: number;
}

async function fetchKits(params?: { search?: string; categoryPath?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  if (params?.categoryPath) searchParams.set('categoryPath', params.categoryPath);
  
  const res = await fetch(`/api/pricebook/kits?${searchParams}`);
  if (!res.ok) throw new Error('Failed to fetch kits');
  return res.json();
}

async function fetchKit(id: string) {
  const res = await fetch(`/api/pricebook/kits/${id}`);
  if (!res.ok) throw new Error('Failed to fetch kit');
  return res.json();
}

async function createKit(data: any) {
  const res = await fetch('/api/pricebook/kits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create kit');
  return res.json();
}

async function updateKit(id: string, data: any) {
  const res = await fetch(`/api/pricebook/kits/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update kit');
  return res.json();
}

async function deleteKit(id: string) {
  const res = await fetch(`/api/pricebook/kits/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete kit');
  return res.json();
}

async function duplicateKit(id: string) {
  const res = await fetch(`/api/pricebook/kits/${id}/duplicate`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate kit');
  return res.json();
}

export function KitsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [search, setSearch] = useState('');
  const [filterPath, setFilterPath] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  
  const { data, isLoading } = useQuery({
    queryKey: ['kits', debouncedSearch, filterPath.join('.')],
    queryFn: () => fetchKits({ 
      search: debouncedSearch || undefined, 
      categoryPath: filterPath.length > 0 ? filterPath.join('.') : undefined 
    }),
  });
  
  const kits: Kit[] = data?.data || [];
  
  const createMutation = useMutation({
    mutationFn: createKit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      showNotification('Kit created successfully');
      setView('list');
    },
    onError: () => showNotification('Failed to create kit', 'error'),
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateKit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      showNotification('Kit updated successfully');
      setView('list');
      setEditingKit(null);
    },
    onError: () => showNotification('Failed to update kit', 'error'),
  });
  
  const deleteMutation = useMutation({
    mutationFn: deleteKit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      showNotification('Kit deleted');
    },
    onError: () => showNotification('Failed to delete kit', 'error'),
  });
  
  const duplicateMutation = useMutation({
    mutationFn: duplicateKit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      showNotification('Kit duplicated');
    },
    onError: () => showNotification('Failed to duplicate kit', 'error'),
  });
  
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  
  const handleSave = async (kitData: any) => {
    if (editingKit?.id) {
      updateMutation.mutate({ id: editingKit.id, data: kitData });
    } else {
      createMutation.mutate(kitData);
    }
  };
  
  const handleEdit = async (kit: Kit) => {
    if (!kit.id) return;
    try {
      const fullKit = await fetchKit(kit.id);
      setEditingKit(fullKit);
      setView('edit');
    } catch (error) {
      showNotification('Failed to load kit', 'error');
    }
  };

  const handleDuplicate = (kit: Kit) => {
    if (!kit.id) return;
    duplicateMutation.mutate(kit.id);
  };

  const handleDelete = (kit: Kit) => {
    if (!kit.id) return;
    if (confirm(`Delete "${kit.name}"?`)) {
      deleteMutation.mutate(kit.id);
    }
  };
  
  const handleUseKit = (kit: Kit) => {
    console.log('Applied kit:', kit.name);
    showNotification(`Applied "${kit.name}"`);
  };
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {notification && (
        <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          <Check size={16} /> {notification.message}
        </div>
      )}
      
      <div className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Package className="text-blue-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Material Kits</h1>
              <p className="text-sm text-zinc-500">Pre-configured material bundles</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {view === 'list' && (
              <button 
                onClick={() => { setView('create'); setEditingKit(null); }} 
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center gap-2"
              >
                <Plus size={16} /> New Kit
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-6">
        {view === 'list' ? (
          <>
            <div className="mb-4 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 max-w-md">
              <Search size={16} className="text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search kits..." 
                className="bg-transparent flex-1 outline-none text-sm" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
            
            <div className="mb-6">
              <WaterfallCategoryFilter 
                selectedPath={filterPath} 
                onPathChange={setFilterPath} 
                categoryTree={kitCategoryTree} 
              />
            </div>
            
            {isLoading ? (
              <div className="text-center text-zinc-500 py-12">Loading kits...</div>
            ) : kits.length === 0 ? (
              <div className="text-center text-zinc-500 py-12">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No kits found</p>
                <p className="text-sm">Create your first material kit to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kits.map(kit => (
                  <KitCard 
                    key={kit.id} 
                    kit={kit} 
                    onEdit={handleEdit} 
                    onDuplicate={handleDuplicate} 
                    onDelete={handleDelete} 
                    onUse={handleUseKit} 
                  />
                ))}
                <button 
                  onClick={() => { setView('create'); setEditingKit(null); }} 
                  className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-white hover:border-zinc-700 min-h-[200px]"
                >
                  <Plus size={32} />
                  <span>Create New Kit</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="max-w-4xl mx-auto">
            <KitEditor 
              kit={editingKit} 
              allKits={kits} 
              onSave={handleSave} 
              onCancel={() => { setView('list'); setEditingKit(null); }} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
