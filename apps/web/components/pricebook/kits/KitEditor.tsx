'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Keyboard, Layers } from 'lucide-react';
import { MaterialBrowser } from './MaterialBrowser';
import { KitMaterialList } from './KitMaterialList';
import { WaterfallCategoryFilter, kitCategoryTree } from './WaterfallCategoryFilter';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';
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

const findCategoryInTree = (tree: any[], id: string, path: string[] = []): { node: any; path: string[] } | null => {
  for (const node of tree) {
    const currentPath = [...path, node.id];
    if (node.id === id) return { node, path: currentPath };
    if (node.children) {
      const found = findCategoryInTree(node.children, id, currentPath);
      if (found) return found;
    }
  }
  return null;
};

const getCategoryFromPath = (categoryPath: string[], tree: any[]) => {
  if (!categoryPath || categoryPath.length === 0) return null;
  const lastId = categoryPath[categoryPath.length - 1];
  const found = findCategoryInTree(tree, lastId);
  return found?.node;
};

export function KitEditor({ kit, allKits, onSave, onCancel }: KitEditorProps) {
  const [name, setName] = useState(kit?.name || '');
  const [description, setDescription] = useState(kit?.description || '');
  const [categoryPath, setCategoryPath] = useState<string[]>(kit?.categoryPath || []);
  const [materials, setMaterials] = useState<KitMaterialItem[]>(kit?.items || []);
  const [groups, setGroups] = useState<KitGroup[]>(kit?.groups || []);
  const [includedKitIds, setIncludedKitIds] = useState<string[]>(kit?.includedKitIds || []);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  const addMaterial = (material: Material) => {
    if (!material.id) return; // Skip if no ID
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
  
  const category = getCategoryFromPath(categoryPath, kitCategoryTree);
  const breadcrumbNames = categoryPath.map(id => findCategoryInTree(kitCategoryTree, id)?.node?.name || id);
  
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-800 bg-zinc-800/50 flex items-center justify-between">
        <h3 className="font-semibold text-lg">{kit ? 'Edit Kit' : 'Create New Kit'}</h3>
        <button onClick={() => setShowShortcuts(true)} className="p-2 hover:bg-zinc-700 rounded flex items-center gap-2 text-sm text-zinc-400">
          <Keyboard size={16} /> Shortcuts
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Kit Name */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Kit Name</label>
          <input
            type="text"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white"
            placeholder="e.g., 20AMP Conduit Circuit"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        
        {/* Description */}
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Description (optional)</label>
          <textarea
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white resize-none"
            placeholder="Kit description..."
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        
        {/* Category */}
        <div className="relative">
          <label className="block text-sm text-zinc-400 mb-1">Category</label>
          <button
            onClick={() => setShowCategoryPicker(!showCategoryPicker)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-left flex items-center gap-2"
          >
            {category?.color && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />}
            <span className={categoryPath.length > 0 ? 'text-white' : 'text-zinc-500'}>
              {breadcrumbNames.length > 0 ? breadcrumbNames.join(' > ') : 'Select category...'}
            </span>
            <ChevronDown size={16} className="ml-auto text-zinc-500" />
          </button>
          {showCategoryPicker && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl">
              <WaterfallCategoryFilter selectedPath={categoryPath} onPathChange={setCategoryPath} categoryTree={kitCategoryTree} />
              <div className="bg-zinc-800 border border-zinc-700 border-t-0 rounded-b-lg p-2 flex justify-end">
                <button onClick={() => setShowCategoryPicker(false)} className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded">Done</button>
              </div>
            </div>
          )}
        </div>
        
        {/* Add Materials */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Add Materials</label>
          
          {/* Add from kit */}
          <div className="mb-3">
            <div className="relative">
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white appearance-none"
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
              <Layers size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
            </div>
          </div>
          
          {/* Material browser */}
          <MaterialBrowser onSelect={addMaterial} excludeIds={materials.map(m => m.materialId)} />
        </div>
        
        {/* Materials List with Groups */}
        {materials.length > 0 && (
          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              Materials in Kit ({materials.length})
              <span className="text-zinc-600 ml-2">• Press ? for shortcuts</span>
            </label>
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
      <div className="p-4 border-t border-zinc-800 bg-zinc-800/30 flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-zinc-400 hover:text-white">Cancel</button>
        <button
          onClick={handleSave}
          disabled={!name || materials.length === 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium"
        >
          {kit ? 'Save Changes' : 'Create Kit'}
        </button>
      </div>
      
      <KeyboardShortcutsPanel isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
