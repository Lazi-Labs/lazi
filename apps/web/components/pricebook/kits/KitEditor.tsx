'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Keyboard, Layers, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MaterialBrowser } from './MaterialBrowser';
import { KitMaterialList } from './KitMaterialList';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';
import { WaterfallCategoryFilter, kitCategoryTree } from './WaterfallCategoryFilter';
import { Material, KitMaterialItem, KitGroup, Kit } from './types';

interface KitEditorProps {
  kit?: Kit | null;
  allKits: Kit[];
  onSave: (data: {
    name: string;
    description?: string;
    categoryPath: string[];
    materials: KitMaterialItem[];
    groups: KitGroup[];
    includedKitIds: string[];
  }) => void;
  onCancel: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export function KitEditor({ kit, allKits, onSave, onCancel }: KitEditorProps) {
  const [name, setName] = useState(kit?.name || '');
  const [description, setDescription] = useState(kit?.description || '');
  const [categoryPath, setCategoryPath] = useState<string[]>(kit?.categoryPath || []);
  const [materials, setMaterials] = useState<KitMaterialItem[]>(kit?.items || []);
  const [groups, setGroups] = useState<KitGroup[]>(kit?.groups || []);
  const [includedKitIds, setIncludedKitIds] = useState<string[]>(kit?.includedKitIds || []);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Helper to find category name from tree
  const findCategoryName = (tree: typeof kitCategoryTree, id: string): string | null => {
    for (const node of tree) {
      if (node.id === id) return node.name;
      if (node.children) {
        const found = findCategoryName(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const categoryBreadcrumb = categoryPath.map(id => findCategoryName(kitCategoryTree, id) || id).join(' › ');
  
  const addMaterial = (material: Material) => {
    if (!material.id) return;
    const materialId = material.id;
    const existing = materials.find(m => m.materialId === materialId);
    if (existing) {
      setMaterials(materials.map(m => m.materialId === materialId ? { ...m, quantity: m.quantity + 1 } : m));
    } else {
      setMaterials([...materials, {
        id: generateId(),
        materialId: materialId,
        quantity: 1,
        groupId: null,
        material: {
          id: materialId,
          stId: material.stId,
          code: material.code,
          name: material.name,
          cost: material.cost,
          unit: material.unit,
        }
      }]);
    }
  };
  
  const addKit = (kitToAdd: Kit) => {
    if (kitToAdd.id && !includedKitIds.includes(kitToAdd.id)) {
      setIncludedKitIds([...includedKitIds, kitToAdd.id]);
    }
    const newMaterials = [...materials];
    (kitToAdd.items || []).forEach(km => {
      const existing = newMaterials.find(m => m.materialId === km.materialId);
      if (existing) {
        existing.quantity += km.quantity;
      } else {
        newMaterials.push({ 
          id: generateId(), 
          materialId: km.materialId, 
          quantity: km.quantity, 
          groupId: null,
          material: km.material
        });
      }
    });
    setMaterials(newMaterials);
  };
  
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
  
  const handleSave = () => {
    onSave({
      name,
      description: description || undefined,
      categoryPath,
      materials,
      groups,
      includedKitIds,
    });
  };
  
  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="font-semibold text-lg">{kit ? 'Edit Kit' : 'Create New Kit'}</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowShortcuts(true)}>
          <Keyboard className="h-4 w-4 mr-2" /> Shortcuts
        </Button>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Kit Name */}
        <div className="space-y-2">
          <Label htmlFor="kit-name">Kit Name</Label>
          <Input
            id="kit-name"
            placeholder="e.g., 20AMP Conduit Circuit"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        
        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="kit-description">Description (optional)</Label>
          <Textarea
            id="kit-description"
            placeholder="Kit description..."
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Category */}
        <div className="space-y-2 relative">
          <Label>Category</Label>
          <button
            type="button"
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex items-center gap-2 text-left"
          >
            <FolderTree className="h-4 w-4 text-muted-foreground" />
            <span className={categoryPath.length > 0 ? '' : 'text-muted-foreground'}>
              {categoryBreadcrumb || 'Select category...'}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
          </button>
          {showCategoryPicker && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl">
              <WaterfallCategoryFilter
                selectedPath={categoryPath}
                onPathChange={setCategoryPath}
                categoryTree={kitCategoryTree}
              />
              <div className="bg-card border border-t-0 rounded-b-lg p-2 flex justify-end">
                <Button size="sm" onClick={() => setShowCategoryPicker(false)}>Done</Button>
              </div>
            </div>
          )}
        </div>

        {/* Add Materials */}
        <div className="space-y-2">
          <Label>Add Materials</Label>
          
          {/* Add from kit */}
          <div className="relative">
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value=""
              onChange={(e) => {
                const selectedKit = allKits.find(k => k.id === e.target.value);
                if (selectedKit) addKit(selectedKit);
              }}
            >
              <option value="">Add materials from existing kit...</option>
              {allKits.filter(k => k.id !== kit?.id && !includedKitIds.includes(k.id || '')).map(k => (
                <option key={k.id} value={k.id}>{k.name} ({(k.items || []).length} materials)</option>
              ))}
            </select>
            <Layers className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" />
          </div>
          
          {/* Material browser */}
          <MaterialBrowser onSelect={addMaterial} excludeIds={materials.map(m => m.materialId)} />
        </div>
        
        {/* Materials List with Groups */}
        {materials.length > 0 && (
          <div className="space-y-2">
            <Label>
              Materials in Kit ({materials.length})
              <span className="text-muted-foreground ml-2 font-normal">• Press ? for shortcuts</span>
            </Label>
            <KitMaterialList
              materials={materials}
              setMaterials={setMaterials}
              groups={groups}
              setGroups={setGroups}
            />
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="p-4 border-t bg-muted/30 flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button
          onClick={handleSave}
          disabled={!name || materials.length === 0}
        >
          {kit ? 'Save Changes' : 'Create Kit'}
        </Button>
      </div>
      
      <KeyboardShortcutsPanel isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
