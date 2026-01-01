'use client';

import React from 'react';
import { ChevronRight, FolderTree, Home, X } from 'lucide-react';

interface CategoryNode {
  id: string;
  name: string;
  color?: string;
  children?: CategoryNode[];
}

interface WaterfallCategoryFilterProps {
  selectedPath: string[];
  onPathChange: (path: string[]) => void;
  categoryTree: CategoryNode[];
  compact?: boolean;
}

const findCategoryInTree = (tree: CategoryNode[], id: string, path: string[] = []): { node: CategoryNode; path: string[] } | null => {
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

const getChildrenAtPath = (path: string[], tree: CategoryNode[]): CategoryNode[] => {
  if (path.length === 0) return tree;
  let current = tree;
  for (const id of path) {
    const found = current.find(c => c.id === id);
    if (!found) return [];
    current = found.children || [];
  }
  return current;
};

export function WaterfallCategoryFilter({ 
  selectedPath, 
  onPathChange, 
  categoryTree, 
  compact = false 
}: WaterfallCategoryFilterProps) {
  const levels: { path: string[]; options: CategoryNode[]; selected: string | null }[] = [];
  
  for (let i = 0; i <= selectedPath.length; i++) {
    const pathToHere = selectedPath.slice(0, i);
    const children = getChildrenAtPath(pathToHere, categoryTree);
    if (children.length > 0) {
      levels.push({ path: pathToHere, options: children, selected: selectedPath[i] || null });
    }
  }
  
  const handleSelect = (levelIndex: number, categoryId: string | null) => {
    if (categoryId === null) {
      onPathChange(selectedPath.slice(0, levelIndex));
    } else {
      onPathChange([...selectedPath.slice(0, levelIndex), categoryId]);
    }
  };
  
  const breadcrumbNames = selectedPath.map(id => findCategoryInTree(categoryTree, id)?.node?.name || id);
  
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden ${compact ? 'text-sm' : ''}`}>
      <div className={`px-3 py-2 bg-zinc-800/50 border-b border-zinc-800 flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        <FolderTree size={compact ? 12 : 14} className="text-zinc-500" />
        <button onClick={() => onPathChange([])} className={`hover:text-white transition-colors ${selectedPath.length === 0 ? 'text-blue-400' : 'text-zinc-400'}`}>
          <Home size={compact ? 12 : 14} />
        </button>
        {breadcrumbNames.map((name, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight size={compact ? 10 : 12} className="text-zinc-600" />
            <button onClick={() => onPathChange(selectedPath.slice(0, idx + 1))} className={`hover:text-white truncate max-w-[100px] ${idx === breadcrumbNames.length - 1 ? 'text-blue-400 font-medium' : 'text-zinc-400'}`}>
              {name}
            </button>
          </React.Fragment>
        ))}
        {selectedPath.length > 0 && (
          <button onClick={() => onPathChange([])} className="ml-auto text-zinc-500 hover:text-white text-xs flex items-center gap-1">
            <X size={12} /> Clear
          </button>
        )}
      </div>
      <div className="flex divide-x divide-zinc-800 overflow-x-auto">
        {levels.map((level, levelIndex) => (
          <div key={levelIndex} className={`${compact ? 'min-w-[140px] max-w-[160px]' : 'min-w-[180px] max-w-[220px]'} flex-shrink-0`}>
            <div className={`p-2 ${compact ? 'max-h-[200px]' : 'max-h-[280px]'} overflow-y-auto`}>
              {levelIndex > 0 && (
                <button onClick={() => handleSelect(levelIndex, null)} className={`w-full px-2 py-1 rounded text-left text-sm mb-1 ${!level.selected ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}>
                  All
                </button>
              )}
              {level.options.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => handleSelect(levelIndex, cat.id)}
                  className={`w-full px-2 py-1 rounded text-left text-sm flex items-center gap-2 ${level.selected === cat.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-zinc-300 hover:bg-zinc-800'}`}
                >
                  {cat.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                  <span className="flex-1 truncate">{cat.name}</span>
                  {cat.children && cat.children.length > 0 && <ChevronRight size={12} className={level.selected === cat.id ? 'text-blue-400' : 'text-zinc-600'} />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const kitCategoryTree: CategoryNode[] = [
  {
    id: 'electrical',
    name: 'Electrical Service',
    children: [
      {
        id: 'wiring',
        name: 'Wiring',
        children: [
          {
            id: 'circuit-dedicated',
            name: 'Circuit Dedicated',
            children: [
              { id: '20-amp', name: '20 AMP', color: '#3B82F6', children: [
                { id: '20-amp-pvc', name: 'PVC Conduit', color: '#3B82F6' },
                { id: '20-amp-emt', name: 'EMT Conduit', color: '#3B82F6' },
              ]},
              { id: '30-amp', name: '30 AMP', color: '#F59E0B' },
              { id: '60-amp', name: '60 AMP', color: '#EF4444' },
            ]
          },
        ]
      },
      { id: 'panel', name: 'Panel Work', color: '#6366F1' },
      { id: 'outdoor', name: 'Outdoor/Wet Location', children: [
        { id: 'pool-spa', name: 'Pool/Spa', color: '#06B6D4' },
      ]},
    ]
  },
];

export const materialCategoryTree: CategoryNode[] = [
  {
    id: 'wire',
    name: 'Wire & Cable',
    children: [
      { id: 'thhn', name: 'THHN Wire', color: '#3B82F6', children: [
        { id: 'thhn-12', name: '12 AWG', color: '#3B82F6' },
        { id: 'thhn-10', name: '10 AWG', color: '#60A5FA' },
      ]},
      { id: 'romex', name: 'Romex/NM', color: '#F59E0B' },
    ]
  },
  {
    id: 'conduit',
    name: 'Conduit & Fittings',
    children: [
      { id: 'pvc', name: 'PVC', color: '#6B7280', children: [
        { id: 'pvc-half', name: '1/2"', color: '#6B7280' },
        { id: 'pvc-three-quarter', name: '3/4"', color: '#6B7280' },
      ]},
      { id: 'emt', name: 'EMT', color: '#A1A1AA' },
    ]
  },
  {
    id: 'boxes',
    name: 'Boxes & Enclosures',
    children: [
      { id: 'junction', name: 'Junction Boxes', color: '#22C55E' },
      { id: 'bell-box', name: 'Bell Boxes', color: '#16A34A' },
    ]
  },
  {
    id: 'fasteners',
    name: 'Fasteners & Hardware',
    children: [
      { id: 'screws', name: 'Screws', color: '#78716C' },
      { id: 'anchors', name: 'Anchors', color: '#A8A29E' },
      { id: 'straps', name: 'Straps & Hangers', color: '#D6D3D1' },
    ]
  },
  {
    id: 'connectors',
    name: 'Connectors & Terminations',
    children: [
      { id: 'wire-nuts', name: 'Wire Nuts', color: '#EF4444' },
      { id: 'grounding', name: 'Grounding', color: '#22C55E' },
    ]
  },
  {
    id: 'breakers',
    name: 'Breakers & Disconnects',
    children: [
      { id: 'breaker-sp', name: 'Single Pole', color: '#0EA5E9' },
      { id: 'breaker-dp', name: 'Double Pole', color: '#0284C7' },
      { id: 'disconnect', name: 'Disconnects', color: '#DC2626' },
    ]
  },
];
