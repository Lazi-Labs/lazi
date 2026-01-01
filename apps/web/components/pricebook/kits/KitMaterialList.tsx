'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Package, Trash2, Edit3, ChevronRight, ChevronDown, X, FolderPlus, GripVertical } from 'lucide-react';
import { GroupNameModal } from './GroupNameModal';
import { KitMaterialItem, KitGroup } from './types';

interface KitMaterialListProps {
  materials: KitMaterialItem[];
  setMaterials: (materials: KitMaterialItem[]) => void;
  groups: KitGroup[];
  setGroups: (groups: KitGroup[]) => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

export function KitMaterialList({ materials, setMaterials, groups, setGroups }: KitMaterialListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<KitGroup | null>(null);
  const [clipboard, setClipboard] = useState<KitMaterialItem[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Build ordered list with groups
  const orderedItems = useMemo(() => {
    const items: Array<{ type: 'group'; group: KitGroup; materials: KitMaterialItem[] } | { type: 'material'; material: KitMaterialItem }> = [];
    const ungrouped = materials.filter(m => !m.groupId);
    const groupedByGroupId: Record<string, KitMaterialItem[]> = {};
    
    materials.forEach(m => {
      if (m.groupId) {
        if (!groupedByGroupId[m.groupId]) groupedByGroupId[m.groupId] = [];
        groupedByGroupId[m.groupId].push(m);
      }
    });
    
    groups.forEach(group => {
      items.push({ type: 'group', group, materials: groupedByGroupId[group.id] || [] });
    });
    
    ungrouped.forEach(m => items.push({ type: 'material', material: m }));
    
    return items;
  }, [materials, groups]);
  
  // Flat list for keyboard navigation
  const flatList = useMemo(() => {
    const list: Array<{ type: 'group-header'; group: KitGroup } | { type: 'material'; material: KitMaterialItem; groupId: string | null }> = [];
    orderedItems.forEach(item => {
      if (item.type === 'group') {
        list.push({ type: 'group-header', group: item.group });
        if (!item.group.collapsed) {
          item.materials.forEach(m => list.push({ type: 'material', material: m, groupId: item.group.id }));
        }
      } else {
        list.push({ type: 'material', material: item.material, groupId: null });
      }
    });
    return list;
  }, [orderedItems]);
  
  const focusedIndex = flatList.findIndex(item => 
    (item.type === 'material' && item.material.id === focusedId) ||
    (item.type === 'group-header' && item.group.id === focusedId)
  );
  
  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement?.tagName !== 'INPUT') {
        return;
      }
      
      if (editingQtyId && e.key !== 'Escape' && e.key !== 'Enter' && e.key !== 'Tab') return;
      
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      
      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault();
          if (ctrl) {
            moveSelected(-1);
          } else {
            const newIndex = Math.max(0, focusedIndex - 1);
            const item = flatList[newIndex];
            if (item) {
              const newId = item.type === 'material' ? item.material.id : item.group.id;
              setFocusedId(newId);
              if (shift) {
                setSelectedIds(prev => new Set([...prev, newId]));
              } else if (!ctrl) {
                setSelectedIds(new Set([newId]));
              }
            }
          }
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          if (ctrl) {
            moveSelected(1);
          } else {
            const newIndex = Math.min(flatList.length - 1, focusedIndex + 1);
            const item = flatList[newIndex];
            if (item) {
              const newId = item.type === 'material' ? item.material.id : item.group.id;
              setFocusedId(newId);
              if (shift) {
                setSelectedIds(prev => new Set([...prev, newId]));
              } else if (!ctrl) {
                setSelectedIds(new Set([newId]));
              }
            }
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          const focused = flatList[focusedIndex];
          if (focused?.type === 'group-header') {
            setGroups(groups.map(g => g.id === focused.group.id ? { ...g, collapsed: true } : g));
          } else if (focused?.type === 'material' && focused.groupId) {
            setMaterials(materials.map(m => selectedIds.has(m.id) ? { ...m, groupId: null } : m));
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const focused = flatList[focusedIndex];
          if (focused?.type === 'group-header') {
            setGroups(groups.map(g => g.id === focused.group.id ? { ...g, collapsed: false } : g));
          }
          break;
        }
        case ' ': {
          e.preventDefault();
          if (focusedId) {
            setSelectedIds(prev => {
              const next = new Set(prev);
              if (next.has(focusedId)) next.delete(focusedId);
              else next.add(focusedId);
              return next;
            });
          }
          break;
        }
        case 'a': {
          if (ctrl) {
            e.preventDefault();
            setSelectedIds(new Set(materials.map(m => m.id)));
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setSelectedIds(new Set());
          setEditingQtyId(null);
          break;
        }
        case 'Delete':
        case 'Backspace': {
          if (!editingQtyId && selectedIds.size > 0) {
            e.preventDefault();
            setMaterials(materials.filter(m => !selectedIds.has(m.id)));
            setSelectedIds(new Set());
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const focused = flatList[focusedIndex];
          if (focused?.type === 'material') {
            setEditingQtyId(focused.material.id);
          } else if (focused?.type === 'group-header') {
            setEditingGroup(focused.group);
            setShowGroupModal(true);
          }
          break;
        }
        case '+':
        case '=': {
          if (!editingQtyId) {
            e.preventDefault();
            setMaterials(materials.map(m => selectedIds.has(m.id) ? { ...m, quantity: m.quantity + 1 } : m));
          }
          break;
        }
        case '-': {
          if (!editingQtyId) {
            e.preventDefault();
            setMaterials(materials.map(m => selectedIds.has(m.id) ? { ...m, quantity: Math.max(1, m.quantity - 1) } : m));
          }
          break;
        }
        case 'g': {
          if (ctrl && !shift) {
            e.preventDefault();
            if (selectedIds.size > 0) {
              setShowGroupModal(true);
            }
          } else if (ctrl && shift) {
            e.preventDefault();
            setMaterials(materials.map(m => selectedIds.has(m.id) ? { ...m, groupId: null } : m));
          }
          break;
        }
        case 'c': {
          if (ctrl) {
            e.preventDefault();
            const copied = materials.filter(m => selectedIds.has(m.id));
            setClipboard(copied);
          }
          break;
        }
        case 'v': {
          if (ctrl && clipboard.length > 0) {
            e.preventDefault();
            const newMaterials = clipboard.map(m => ({ ...m, id: generateId() }));
            setMaterials([...materials, ...newMaterials]);
          }
          break;
        }
        case 'd': {
          if (ctrl) {
            e.preventDefault();
            const duplicated = materials.filter(m => selectedIds.has(m.id)).map(m => ({ ...m, id: generateId() }));
            setMaterials([...materials, ...duplicated]);
          }
          break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flatList, focusedIndex, focusedId, selectedIds, editingQtyId, materials, groups, clipboard, setMaterials, setGroups]);
  
  const moveSelected = (direction: number) => {
    const selectedMaterials = materials.filter(m => selectedIds.has(m.id));
    if (selectedMaterials.length === 0) return;
    
    const newMaterials = [...materials];
    selectedMaterials.forEach(sm => {
      const idx = newMaterials.findIndex(m => m.id === sm.id);
      const newIdx = Math.max(0, Math.min(newMaterials.length - 1, idx + direction));
      if (idx !== newIdx) {
        newMaterials.splice(idx, 1);
        newMaterials.splice(newIdx, 0, sm);
      }
    });
    setMaterials(newMaterials);
  };
  
  const handleCreateGroup = ({ name, color }: { name: string; color: string }) => {
    if (editingGroup) {
      setGroups(groups.map(g => g.id === editingGroup.id ? { ...g, name, color } : g));
    } else {
      const groupId = generateId();
      setGroups([...groups, { id: groupId, name, color, collapsed: false }]);
      setMaterials(materials.map(m => selectedIds.has(m.id) ? { ...m, groupId } : m));
    }
    setShowGroupModal(false);
    setEditingGroup(null);
    setSelectedIds(new Set());
  };
  
  const handleDeleteGroup = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
    setMaterials(materials.map(m => m.groupId === groupId ? { ...m, groupId: null } : m));
  };
  
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent, id: string, isGroup = false) => {
    e.preventDefault();
    if (isGroup) {
      setDragOverGroup(id);
      setDragOverId(null);
    } else {
      setDragOverId(id);
      setDragOverGroup(null);
    }
  };
  
  const handleDrop = (e: React.DragEvent, targetId: string | null, targetGroupId: string | null = null) => {
    e.preventDefault();
    if (!draggedId) return;
    
    if (targetGroupId !== null) {
      setMaterials(materials.map(m => m.id === draggedId ? { ...m, groupId: targetGroupId } : m));
    } else if (targetId && targetId !== draggedId) {
      const draggedIdx = materials.findIndex(m => m.id === draggedId);
      const targetIdx = materials.findIndex(m => m.id === targetId);
      const newMaterials = [...materials];
      const [dragged] = newMaterials.splice(draggedIdx, 1);
      newMaterials.splice(targetIdx, 0, dragged);
      setMaterials(newMaterials);
    }
    
    setDraggedId(null);
    setDragOverId(null);
    setDragOverGroup(null);
  };
  
  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
    setDragOverGroup(null);
  };
  
  const handleRowClick = (id: string, e: React.MouseEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    
    setFocusedId(id);
    
    if (ctrl) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else if (shift && focusedId) {
      const flatIds = flatList.filter(i => i.type === 'material').map(i => (i as any).material.id);
      const startIdx = flatIds.indexOf(focusedId);
      const endIdx = flatIds.indexOf(id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
        const rangeIds = flatIds.slice(min, max + 1);
        setSelectedIds(new Set(rangeIds));
      }
    } else {
      setSelectedIds(new Set([id]));
    }
  };
  
  const handleQtyChange = (id: string, value: string) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, quantity: Math.max(1, parseInt(value) || 1) } : m));
  };
  
  const totalCost = materials.reduce((sum, m) => {
    return sum + (m.material?.cost || 0) * m.quantity;
  }, 0);
  
  return (
    <div ref={containerRef} tabIndex={0} className="outline-none">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3 p-2 bg-zinc-800/50 rounded-lg">
        <button
          onClick={() => selectedIds.size > 0 && setShowGroupModal(true)}
          disabled={selectedIds.size === 0}
          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded text-sm flex items-center gap-2"
        >
          <FolderPlus size={14} /> Group
        </button>
        <button
          onClick={() => setMaterials(materials.map(m => selectedIds.has(m.id) ? { ...m, groupId: null } : m))}
          disabled={selectedIds.size === 0}
          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded text-sm"
        >
          Ungroup
        </button>
        <button
          onClick={() => { setMaterials(materials.filter(m => !selectedIds.has(m.id))); setSelectedIds(new Set()); }}
          disabled={selectedIds.size === 0}
          className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded text-sm flex items-center gap-2 text-red-400"
        >
          <Trash2 size={14} /> Delete
        </button>
        <div className="flex-1" />
        <span className="text-xs text-zinc-500">
          {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${materials.length} items`}
        </span>
        <kbd className="px-2 py-0.5 bg-zinc-700 rounded text-xs">?</kbd>
      </div>
      
      {/* List */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        {materials.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <Package size={32} className="mx-auto mb-2 opacity-50" />
            <p>No materials yet. Add some above!</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {orderedItems.map(item => {
              if (item.type === 'group') {
                const group = item.group;
                const isGroupFocused = focusedId === group.id;
                const isDropTarget = dragOverGroup === group.id;
                
                return (
                  <div key={group.id}>
                    <div
                      className={`flex items-center gap-2 px-3 py-2 bg-zinc-800/70 cursor-pointer select-none ${isGroupFocused ? 'ring-2 ring-inset ring-blue-500' : ''} ${isDropTarget ? 'bg-blue-900/30' : ''}`}
                      onClick={(e) => { setFocusedId(group.id); e.stopPropagation(); }}
                      onDragOver={(e) => handleDragOver(e, group.id, true)}
                      onDrop={(e) => handleDrop(e, null, group.id)}
                    >
                      <button onClick={() => setGroups(groups.map(g => g.id === group.id ? { ...g, collapsed: !g.collapsed } : g))}>
                        {group.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                      <span className="font-medium flex-1">{group.name}</span>
                      <span className="text-xs text-zinc-500">{item.materials.length} items</span>
                      <button onClick={() => { setEditingGroup(group); setShowGroupModal(true); }} className="p-1 hover:bg-zinc-700 rounded">
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => handleDeleteGroup(group.id)} className="p-1 hover:bg-zinc-700 rounded text-red-400">
                        <X size={12} />
                      </button>
                    </div>
                    
                    {!group.collapsed && item.materials.map(m => (
                      <MaterialRow
                        key={m.id}
                        material={m}
                        isSelected={selectedIds.has(m.id)}
                        isFocused={focusedId === m.id}
                        isEditing={editingQtyId === m.id}
                        isDragging={draggedId === m.id}
                        isDragOver={dragOverId === m.id}
                        indent={true}
                        onClick={(e) => handleRowClick(m.id, e)}
                        onDragStart={(e) => handleDragStart(e, m.id)}
                        onDragOver={(e) => handleDragOver(e, m.id)}
                        onDrop={(e) => handleDrop(e, m.id)}
                        onDragEnd={handleDragEnd}
                        onQtyChange={(val) => handleQtyChange(m.id, val)}
                        onQtyBlur={() => setEditingQtyId(null)}
                        onQtyFocus={() => setEditingQtyId(m.id)}
                        onDelete={() => { setMaterials(materials.filter(x => x.id !== m.id)); setSelectedIds(prev => { const n = new Set(prev); n.delete(m.id); return n; }); }}
                      />
                    ))}
                  </div>
                );
              } else {
                const m = item.material;
                return (
                  <MaterialRow
                    key={m.id}
                    material={m}
                    isSelected={selectedIds.has(m.id)}
                    isFocused={focusedId === m.id}
                    isEditing={editingQtyId === m.id}
                    isDragging={draggedId === m.id}
                    isDragOver={dragOverId === m.id}
                    indent={false}
                    onClick={(e) => handleRowClick(m.id, e)}
                    onDragStart={(e) => handleDragStart(e, m.id)}
                    onDragOver={(e) => handleDragOver(e, m.id)}
                    onDrop={(e) => handleDrop(e, m.id)}
                    onDragEnd={handleDragEnd}
                    onQtyChange={(val) => handleQtyChange(m.id, val)}
                    onQtyBlur={() => setEditingQtyId(null)}
                    onQtyFocus={() => setEditingQtyId(m.id)}
                    onDelete={() => { setMaterials(materials.filter(x => x.id !== m.id)); setSelectedIds(prev => { const n = new Set(prev); n.delete(m.id); return n; }); }}
                  />
                );
              }
            })}
          </div>
        )}
        
        {materials.length > 0 && (
          <div className="px-3 py-2 bg-zinc-800/50 flex justify-between text-sm">
            <span className="text-zinc-400">Total Material Cost</span>
            <span className="font-bold text-green-400">${totalCost.toFixed(2)}</span>
          </div>
        )}
      </div>
      
      <GroupNameModal
        isOpen={showGroupModal}
        onClose={() => { setShowGroupModal(false); setEditingGroup(null); }}
        onSubmit={handleCreateGroup}
        initialName={editingGroup?.name || ''}
        title={editingGroup ? 'Edit Group' : 'Create Group'}
      />
    </div>
  );
}

interface MaterialRowProps {
  material: KitMaterialItem;
  isSelected: boolean;
  isFocused: boolean;
  isEditing: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  indent: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onQtyChange: (value: string) => void;
  onQtyBlur: () => void;
  onQtyFocus: () => void;
  onDelete: () => void;
}

function MaterialRow({ 
  material, 
  isSelected, 
  isFocused, 
  isEditing, 
  isDragging, 
  isDragOver, 
  indent, 
  onClick, 
  onDragStart, 
  onDragOver, 
  onDrop, 
  onDragEnd, 
  onQtyChange, 
  onQtyBlur, 
  onQtyFocus, 
  onDelete 
}: MaterialRowProps) {
  const mat = material.material;
  const qtyRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isEditing && qtyRef.current) {
      qtyRef.current.select();
    }
  }, [isEditing]);
  
  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`
        flex items-center gap-2 px-3 py-2 cursor-pointer select-none transition-colors
        ${indent ? 'pl-8' : ''}
        ${isSelected ? 'bg-blue-600/20' : 'hover:bg-zinc-800/50'}
        ${isFocused ? 'ring-2 ring-inset ring-blue-500' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${isDragOver ? 'border-t-2 border-blue-500' : ''}
      `}
    >
      <GripVertical size={14} className="text-zinc-600 cursor-grab" />
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => {}}
        className="rounded border-zinc-600"
      />
      <span className="font-mono text-blue-400 text-xs w-28 truncate">{mat?.code || 'N/A'}</span>
      <span className="text-zinc-300 flex-1 truncate text-sm">{mat?.name || 'Unknown Material'}</span>
      <input
        ref={qtyRef}
        type="number"
        min="1"
        value={material.quantity}
        onChange={(e) => onQtyChange(e.target.value)}
        onFocus={onQtyFocus}
        onBlur={onQtyBlur}
        className={`w-16 bg-zinc-800 border rounded px-2 py-1 text-center text-sm ${isEditing ? 'border-blue-500' : 'border-zinc-700'}`}
      />
      <span className="text-zinc-500 text-sm w-20 text-right">${((mat?.cost || 0) * material.quantity).toFixed(2)}</span>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-zinc-500 hover:text-red-400">
        <Trash2 size={14} />
      </button>
    </div>
  );
}
