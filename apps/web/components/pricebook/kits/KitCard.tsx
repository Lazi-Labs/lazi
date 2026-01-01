'use client';

import React, { useState } from 'react';
import { Edit3, Copy, Trash2, MoreVertical, ChevronRight, ChevronDown } from 'lucide-react';
import { Kit as SharedKit } from './types';

// Extended Kit type for card display (includes computed fields from API)
interface Kit extends SharedKit {
  itemCount?: number;
  groupCount?: number;
}

interface KitCardProps {
  kit: Kit;
  onEdit: (kit: Kit) => void;
  onDuplicate: (kit: Kit) => void;
  onDelete: (kit: Kit) => void;
  onUse: (kit: Kit) => void;
}

export function KitCard({ kit, onEdit, onDuplicate, onDelete, onUse }: KitCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const totalCost = (kit.items || []).reduce((sum, item) => {
    return sum + (item.material?.cost || 0) * item.quantity;
  }, 0);
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {kit.categoryPath && kit.categoryPath.length > 0 && (
              <div className="flex items-center gap-1 mb-2 text-xs text-zinc-500">
                <span className="truncate">{kit.categoryPath.join(' › ')}</span>
              </div>
            )}
            <h3 className="font-semibold text-lg truncate">{kit.name}</h3>
            <p className="text-sm text-zinc-500 mt-1">
              {kit.itemCount ?? (kit.items?.length || 0)} materials
              {(kit.groupCount ?? (kit.groups?.length || 0)) > 0 && ` • ${kit.groupCount ?? kit.groups?.length} groups`}
              {totalCost > 0 && ` • $${totalCost.toFixed(2)}`}
            </p>
            {kit.description && (
              <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{kit.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onUse(kit)} 
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium"
            >
              Use
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg"
              >
                <MoreVertical size={16} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20">
                    <button 
                      onClick={() => { onEdit(kit); setShowMenu(false); }} 
                      className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button 
                      onClick={() => { onDuplicate(kit); setShowMenu(false); }} 
                      className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <Copy size={14} /> Duplicate
                    </button>
                    <button 
                      onClick={() => { onDelete(kit); setShowMenu(false); }} 
                      className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2 text-red-400"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {kit.items && kit.items.length > 0 && (
          <>
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="mt-3 flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              {expanded ? 'Hide' : 'Show'} materials
            </button>
            
            {expanded && (
              <div className="mt-3 bg-zinc-800/50 rounded-lg p-3 space-y-2 max-h-64 overflow-auto">
                {kit.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">
                      <span className="font-mono text-blue-400">{item.material?.code || 'N/A'}</span>
                      <span className="ml-2">{item.material?.name || 'Unknown'}</span>
                    </span>
                    <span className="text-zinc-500">{item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
