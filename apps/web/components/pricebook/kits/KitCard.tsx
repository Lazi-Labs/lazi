'use client';

import React, { useState } from 'react';
import { Edit3, Copy, Trash2, MoreVertical, ChevronRight, ChevronDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="bg-card border rounded-xl overflow-hidden hover:border-primary/50 transition-colors shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              {kit.categoryPath && kit.categoryPath.length > 0 && (
                <div className="flex items-center gap-1 mb-1 text-xs text-muted-foreground">
                  <span className="truncate">{kit.categoryPath.join(' › ')}</span>
                </div>
              )}
              <h3 className="font-semibold text-base truncate">{kit.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {kit.itemCount ?? (kit.items?.length || 0)} materials
                {(kit.groupCount ?? (kit.groups?.length || 0)) > 0 && ` • ${kit.groupCount ?? kit.groups?.length} groups`}
              </p>
              {totalCost > 0 && (
                <p className="text-sm font-semibold text-green-600 mt-1">${totalCost.toFixed(2)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onUse(kit)}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              Use
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical size={16} />
              </Button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-36 bg-popover border rounded-lg shadow-xl z-20">
                    <button
                      onClick={() => { onEdit(kit); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      onClick={() => { onDuplicate(kit); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <Copy size={14} /> Duplicate
                    </button>
                    <button
                      onClick={() => { onDelete(kit); setShowMenu(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {kit.description && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{kit.description}</p>
        )}

        {kit.items && kit.items.length > 0 && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              {expanded ? 'Hide' : 'Show'} materials
            </button>

            {expanded && (
              <div className="mt-3 bg-muted/50 rounded-lg p-3 space-y-2 max-h-64 overflow-auto">
                {kit.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <span className="font-mono text-primary">{item.material?.code || 'N/A'}</span>
                      <span className="ml-2">{item.material?.name || 'Unknown'}</span>
                    </span>
                    <span className="text-muted-foreground">{item.quantity}</span>
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
