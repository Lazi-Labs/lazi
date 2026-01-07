'use client';

import React, { useState } from 'react';
import { Package, Plus, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiUrl } from '@/lib/api';
import { KitEditor } from './KitEditor';
import { KitCard } from './KitCard';
import { Kit as SharedKit } from './types';

interface Kit extends SharedKit {
  itemCount?: number;
  groupCount?: number;
}

async function fetchKits(params?: { search?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);

  const res = await fetch(apiUrl(`/api/pricebook/kits?${searchParams}`));
  if (!res.ok) throw new Error('Failed to fetch kits');
  return res.json();
}

async function fetchKit(id: string) {
  const res = await fetch(apiUrl(`/api/pricebook/kits/${id}`));
  if (!res.ok) throw new Error('Failed to fetch kit');
  return res.json();
}

async function createKit(data: any) {
  const res = await fetch(apiUrl('/api/pricebook/kits'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create kit');
  return res.json();
}

async function updateKit(id: string, data: any) {
  const res = await fetch(apiUrl(`/api/pricebook/kits/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update kit');
  return res.json();
}

async function deleteKit(id: string) {
  const res = await fetch(apiUrl(`/api/pricebook/kits/${id}`), { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete kit');
  return res.json();
}

async function duplicateKit(id: string) {
  const res = await fetch(apiUrl(`/api/pricebook/kits/${id}/duplicate`), { method: 'POST' });
  if (!res.ok) throw new Error('Failed to duplicate kit');
  return res.json();
}

export function KitsPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  
  const { data, isLoading } = useQuery({
    queryKey: ['kits', debouncedSearch],
    queryFn: () => fetchKits({ search: debouncedSearch || undefined }),
  });
  
  const kits: Kit[] = data?.data || [];
  
  const createMutation = useMutation({
    mutationFn: createKit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      setView('list');
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateKit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      setView('list');
      setEditingKit(null);
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: deleteKit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
    },
  });
  
  const duplicateMutation = useMutation({
    mutationFn: duplicateKit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
    },
  });
  
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
      console.error('Failed to load kit', error);
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

  const handleUse = (kit: Kit) => {
    // TODO: Open UseKitModal to apply kit to a service
    console.log('Use kit:', kit.name);
  };

  // Show editor view
  if (view === 'create' || view === 'edit') {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setView('list'); setEditingKit(null); }}>
            ← Back to List
          </Button>
          <span className="text-sm text-muted-foreground">
            {view === 'create' ? 'Create New Kit' : `Editing: ${editingKit?.name}`}
          </span>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto">
            <KitEditor 
              kit={editingKit} 
              allKits={kits} 
              onSave={handleSave} 
              onCancel={() => { setView('list'); setEditingKit(null); }} 
            />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Action Bar - matches materials-panel */}
      <div className="p-3 border-b flex items-center gap-2">
        <Button size="sm" onClick={() => { setView('create'); setEditingKit(null); }}>
          <Plus className="h-4 w-4 mr-1" />
          NEW
        </Button>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search kits by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
      </div>

      {/* Kits Grid - using KitCard component */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading kits...</div>
        ) : !kits?.length ? (
          <div className="p-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No kits found</p>
            <p className="text-sm mt-2">Create your first material kit to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kits.map((kit: Kit) => (
              <KitCard
                key={kit.id}
                kit={kit}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onUse={handleUse}
              />
            ))}
            {/* Create New Kit Card */}
            <button
              onClick={() => { setView('create'); setEditingKit(null); }}
              className="bg-muted/30 border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-colors min-h-[200px]"
            >
              <Plus className="h-8 w-8" />
              <span>Create New Kit</span>
            </button>
          </div>
        )}
      </div>
      
      {/* Footer - matches materials-panel */}
      <div className="p-3 border-t flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {kits.length} kit{kits.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
