import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Package, Plus, Search, Trash2, Edit3, Copy, ChevronRight, ChevronDown, X, Check, Zap, MoreVertical, FolderTree, Home, Layers, PackagePlus, GripVertical, FolderPlus, Keyboard, Command } from 'lucide-react';

// ============================================================================
// CATEGORY TREES
// ============================================================================

const kitCategoryTree = [
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

const materialCategoryTree = [
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

// ============================================================================
// MOCK DATA
// ============================================================================

const mockMaterials = [
  { id: 1, code: '12-THHN-BLK', name: 'Thhn 12 Str Cu Black', unit: 'ft', cost: 0.14, categoryPath: ['wire', 'thhn', 'thhn-12'] },
  { id: 2, code: '12-THHN-GRN-1', name: 'Thhn 12 Str Cu Green', unit: 'ft', cost: 0.14, categoryPath: ['wire', 'thhn', 'thhn-12'] },
  { id: 3, code: '12-THHN-WHT', name: 'Thhn 12 Str Cu White', unit: 'ft', cost: 0.14, categoryPath: ['wire', 'thhn', 'thhn-12'] },
  { id: 4, code: '12-THHN-RED-1', name: 'Thhn 12 Str Cu Red', unit: 'ft', cost: 0.14, categoryPath: ['wire', 'thhn', 'thhn-12'] },
  { id: 5, code: 'TAP-025-125', name: 'Tapcon 1/4 X 1-1/4', unit: 'ea', cost: 0.12, categoryPath: ['fasteners', 'anchors'] },
  { id: 6, code: 'SCREW-GRND-1', name: 'Green Grounding Screw', unit: 'ea', cost: 0.08, categoryPath: ['connectors', 'grounding'] },
  { id: 7, code: 'WRNUTS.00005', name: 'Wirenut Yellow Wing Type', unit: 'ea', cost: 0.05, categoryPath: ['connectors', 'wire-nuts'] },
  { id: 8, code: 'WRNUTS.00020', name: 'Wirenut Red Wing Type', unit: 'ea', cost: 0.06, categoryPath: ['connectors', 'wire-nuts'] },
  { id: 9, code: 'BELL-1G-3-050', name: '1 Gang Bell Box 3hole 1/2', unit: 'ea', cost: 2.50, categoryPath: ['boxes', 'bell-box'] },
  { id: 10, code: 'PVC-90-050', name: 'PVC Elbow 90 Deg Sch 40 1/2', unit: 'ea', cost: 0.45, categoryPath: ['conduit', 'pvc', 'pvc-half'] },
  { id: 11, code: 'PVC-C40-050', name: 'PVC Conduit Sch 40 1/2', unit: 'ft', cost: 0.92, categoryPath: ['conduit', 'pvc', 'pvc-half'] },
  { id: 12, code: 'PVC-CPL-050', name: '1/2" Coupling PVC', unit: 'ea', cost: 0.17, categoryPath: ['conduit', 'pvc', 'pvc-half'] },
  { id: 13, code: 'PVC-MA-050', name: '1/2" Male Adapter PVC', unit: 'ea', cost: 0.22, categoryPath: ['conduit', 'pvc', 'pvc-half'] },
  { id: 14, code: '10-THHN-BLK', name: 'Thhn 10 Str Cu Black', unit: 'ft', cost: 0.22, categoryPath: ['wire', 'thhn', 'thhn-10'] },
  { id: 15, code: '10-THHN-RED', name: 'Thhn 10 Str Cu Red', unit: 'ft', cost: 0.22, categoryPath: ['wire', 'thhn', 'thhn-10'] },
  { id: 16, code: '10-THHN-GRN', name: 'Thhn 10 Str Cu Green', unit: 'ft', cost: 0.22, categoryPath: ['wire', 'thhn', 'thhn-10'] },
  { id: 17, code: 'PVC-C40-075', name: 'PVC Conduit Sch 40 3/4', unit: 'ft', cost: 1.15, categoryPath: ['conduit', 'pvc', 'pvc-three-quarter'] },
  { id: 18, code: 'BREAKER-20A', name: '20 Amp Single Pole Breaker', unit: 'ea', cost: 8.50, categoryPath: ['breakers', 'breaker-sp'] },
  { id: 19, code: 'BREAKER-30A', name: '30 Amp Double Pole Breaker', unit: 'ea', cost: 14.00, categoryPath: ['breakers', 'breaker-dp'] },
  { id: 20, code: 'BREAKER-60A', name: '60 Amp Double Pole Breaker', unit: 'ea', cost: 22.00, categoryPath: ['breakers', 'breaker-dp'] },
  { id: 21, code: 'STRAP-1H-050', name: '1/2" 1-Hole Strap', unit: 'ea', cost: 0.08, categoryPath: ['fasteners', 'straps'] },
  { id: 22, code: 'DISCO-60A', name: '60 Amp Disconnect', unit: 'ea', cost: 45.00, categoryPath: ['breakers', 'disconnect'] },
];

const initialKits = [
  {
    id: 1,
    name: '20AMP Conduit Circuit - Standard',
    categoryPath: ['electrical', 'wiring', 'circuit-dedicated', '20-amp', '20-amp-pvc'],
    materials: [
      { id: 'm1', materialId: 1, qty: 35, groupId: 'g1' },
      { id: 'm2', materialId: 2, qty: 35, groupId: 'g1' },
      { id: 'm3', materialId: 3, qty: 35, groupId: 'g1' },
      { id: 'm4', materialId: 4, qty: 35, groupId: 'g1' },
      { id: 'm5', materialId: 5, qty: 8, groupId: null },
      { id: 'm6', materialId: 6, qty: 1, groupId: 'g2' },
      { id: 'm7', materialId: 7, qty: 2, groupId: 'g2' },
      { id: 'm8', materialId: 8, qty: 1, groupId: 'g2' },
      { id: 'm9', materialId: 9, qty: 1, groupId: null },
      { id: 'm10', materialId: 10, qty: 2, groupId: 'g3' },
      { id: 'm11', materialId: 11, qty: 30, groupId: 'g3' },
      { id: 'm12', materialId: 12, qty: 4, groupId: 'g3' },
      { id: 'm13', materialId: 13, qty: 2, groupId: 'g3' },
    ],
    groups: [
      { id: 'g1', name: '12 AWG Wire Bundle', color: '#3B82F6', collapsed: false },
      { id: 'g2', name: 'Connectors', color: '#EF4444', collapsed: false },
      { id: 'g3', name: 'PVC Conduit & Fittings', color: '#6B7280', collapsed: false },
    ],
    includedKitIds: []
  },
  {
    id: 2,
    name: '30AMP Dedicated - PVC',
    categoryPath: ['electrical', 'wiring', 'circuit-dedicated', '30-amp'],
    materials: [
      { id: 'm14', materialId: 14, qty: 50, groupId: null },
      { id: 'm15', materialId: 15, qty: 50, groupId: null },
      { id: 'm16', materialId: 16, qty: 50, groupId: null },
      { id: 'm17', materialId: 17, qty: 40, groupId: null },
      { id: 'm18', materialId: 19, qty: 1, groupId: null },
      { id: 'm19', materialId: 5, qty: 10, groupId: null },
    ],
    groups: [],
    includedKitIds: []
  },
];

// ============================================================================
// HELPERS
// ============================================================================

const findCategoryInTree = (tree, id, path = []) => {
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

const getCategoryFromPath = (categoryPath, tree) => {
  if (!categoryPath || categoryPath.length === 0) return null;
  const lastId = categoryPath[categoryPath.length - 1];
  const found = findCategoryInTree(tree, lastId);
  return found?.node;
};

const getChildrenAtPath = (path, tree) => {
  if (path.length === 0) return tree;
  let current = tree;
  for (const id of path) {
    const found = current.find(c => c.id === id);
    if (!found) return [];
    current = found.children || [];
  }
  return current;
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// ============================================================================
// KEYBOARD SHORTCUTS PANEL
// ============================================================================

const KeyboardShortcutsPanel = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  const shortcuts = [
    { category: 'Navigation', items: [
      { keys: ['↑', '↓'], desc: 'Move selection up/down' },
      { keys: ['←', '→'], desc: 'Collapse/expand group or move into/out of group' },
      { keys: ['Home'], desc: 'Jump to first item' },
      { keys: ['End'], desc: 'Jump to last item' },
      { keys: ['Tab'], desc: 'Move to quantity field' },
    ]},
    { category: 'Selection', items: [
      { keys: ['Space'], desc: 'Toggle selection' },
      { keys: ['Shift', '↑/↓'], desc: 'Extend selection' },
      { keys: ['Ctrl/⌘', 'A'], desc: 'Select all' },
      { keys: ['Esc'], desc: 'Clear selection' },
    ]},
    { category: 'Editing', items: [
      { keys: ['Enter'], desc: 'Edit quantity' },
      { keys: ['+', '='], desc: 'Increase quantity' },
      { keys: ['-'], desc: 'Decrease quantity' },
      { keys: ['Delete', 'Backspace'], desc: 'Remove selected' },
    ]},
    { category: 'Organization', items: [
      { keys: ['Ctrl/⌘', 'G'], desc: 'Group selected items' },
      { keys: ['Ctrl/⌘', 'Shift', 'G'], desc: 'Ungroup selected items' },
      { keys: ['Ctrl/⌘', '↑'], desc: 'Move up' },
      { keys: ['Ctrl/⌘', '↓'], desc: 'Move down' },
    ]},
    { category: 'Clipboard', items: [
      { keys: ['Ctrl/⌘', 'C'], desc: 'Copy selected' },
      { keys: ['Ctrl/⌘', 'V'], desc: 'Paste' },
      { keys: ['Ctrl/⌘', 'D'], desc: 'Duplicate selected' },
    ]},
  ];
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-blue-400" />
            <h2 className="font-semibold text-lg">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded"><X size={20} /></button>
        </div>
        <div className="p-4 overflow-auto max-h-[60vh] grid grid-cols-2 gap-6">
          {shortcuts.map(section => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">{section.category}</h3>
              <div className="space-y-1">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1">
                    <span className="text-zinc-300">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, kidx) => (
                        <React.Fragment key={kidx}>
                          <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono">
                            {key}
                          </kbd>
                          {kidx < item.keys.length - 1 && <span className="text-zinc-600 text-xs">+</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// WATERFALL CATEGORY FILTER
// ============================================================================

const WaterfallCategoryFilter = ({ selectedPath, onPathChange, categoryTree, compact = false }) => {
  const levels = [];
  
  for (let i = 0; i <= selectedPath.length; i++) {
    const pathToHere = selectedPath.slice(0, i);
    const children = getChildrenAtPath(pathToHere, categoryTree);
    if (children.length > 0) {
      levels.push({ path: pathToHere, options: children, selected: selectedPath[i] || null });
    }
  }
  
  const handleSelect = (levelIndex, categoryId) => {
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
                  {cat.children?.length > 0 && <ChevronRight size={12} className={level.selected === cat.id ? 'text-blue-400' : 'text-zinc-600'} />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MATERIAL BROWSER
// ============================================================================

const MaterialBrowser = ({ onSelect, excludeIds = [] }) => {
  const [search, setSearch] = useState('');
  const [materialFilterPath, setMaterialFilterPath] = useState([]);
  const [showBrowser, setShowBrowser] = useState(false);
  
  const filtered = useMemo(() => {
    let results = mockMaterials.filter(m => !excludeIds.includes(m.id));
    if (materialFilterPath.length > 0) {
      results = results.filter(m => {
        const matPath = m.categoryPath || [];
        for (let i = 0; i < materialFilterPath.length; i++) {
          if (matPath[i] !== materialFilterPath[i]) return false;
        }
        return true;
      });
    }
    if (search) {
      results = results.filter(m => m.code.toLowerCase().includes(search.toLowerCase()) || m.name.toLowerCase().includes(search.toLowerCase()));
    }
    return results;
  }, [search, materialFilterPath, excludeIds]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
        <Search size={16} className="text-zinc-500" />
        <input
          type="text"
          placeholder="Search materials..."
          className="bg-transparent flex-1 outline-none text-sm text-white placeholder-zinc-500"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setShowBrowser(true)}
        />
        {(search || materialFilterPath.length > 0) && (
          <button onClick={() => { setSearch(''); setMaterialFilterPath([]); }} className="text-zinc-500 hover:text-white">
            <X size={14} />
          </button>
        )}
        <button
          onClick={() => setShowBrowser(!showBrowser)}
          className={`p-1 rounded ${showBrowser ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
        >
          <FolderTree size={16} />
        </button>
      </div>
      
      {showBrowser && (
        <WaterfallCategoryFilter selectedPath={materialFilterPath} onPathChange={setMaterialFilterPath} categoryTree={materialCategoryTree} compact />
      )}
      
      {(showBrowser || search) && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg max-h-48 overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-sm">No materials found</div>
          ) : (
            filtered.map(m => {
              const cat = getCategoryFromPath(m.categoryPath, materialCategoryTree);
              return (
                <button key={m.id} className="w-full px-3 py-2 text-left hover:bg-zinc-700 flex items-center gap-3 text-sm border-b border-zinc-700 last:border-0" onClick={() => onSelect(m)}>
                  {cat?.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
                  <span className="font-mono text-blue-400">{m.code}</span>
                  <span className="text-zinc-300 flex-1 truncate">{m.name}</span>
                  <span className="text-zinc-500">${m.cost.toFixed(2)}</span>
                  <Plus size={14} className="text-green-400" />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// GROUP NAME MODAL
// ============================================================================

const GroupNameModal = ({ isOpen, onClose, onSubmit, initialName = '', title = 'Create Group' }) => {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState('#3B82F6');
  const inputRef = useRef(null);
  
  const colors = ['#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'];
  
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialName]);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({ name: name.trim(), color });
      setName('');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 rounded-xl w-full max-w-md p-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-lg mb-4">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Group name..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white mb-3"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-zinc-400">Color:</span>
            {colors.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={!name.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium">
              {initialName ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// KIT MATERIAL LIST WITH GROUPS & KEYBOARD NAV
// ============================================================================

const KitMaterialList = ({ materials, setMaterials, groups, setGroups }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [focusedId, setFocusedId] = useState(null);
  const [editingQtyId, setEditingQtyId] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [clipboard, setClipboard] = useState([]);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragOverGroup, setDragOverGroup] = useState(null);
  const containerRef = useRef(null);
  
  // Build ordered list with groups
  const orderedItems = useMemo(() => {
    const items = [];
    const ungrouped = materials.filter(m => !m.groupId);
    const groupedByGroupId = {};
    
    materials.forEach(m => {
      if (m.groupId) {
        if (!groupedByGroupId[m.groupId]) groupedByGroupId[m.groupId] = [];
        groupedByGroupId[m.groupId].push(m);
      }
    });
    
    // Add groups with their materials
    groups.forEach(group => {
      items.push({ type: 'group', group, materials: groupedByGroupId[group.id] || [] });
    });
    
    // Add ungrouped materials
    ungrouped.forEach(m => items.push({ type: 'material', material: m }));
    
    return items;
  }, [materials, groups]);
  
  // Flat list for keyboard navigation
  const flatList = useMemo(() => {
    const list = [];
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
    const handleKeyDown = (e) => {
      if (!containerRef.current?.contains(document.activeElement) && document.activeElement?.tagName !== 'INPUT') {
        return;
      }
      
      // Don't handle if editing quantity
      if (editingQtyId && e.key !== 'Escape' && e.key !== 'Enter' && e.key !== 'Tab') return;
      
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      
      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault();
          if (ctrl) {
            // Move selected items up
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
            // Collapse group
            setGroups(groups.map(g => g.id === focused.group.id ? { ...g, collapsed: true } : g));
          } else if (focused?.type === 'material' && focused.groupId) {
            // Remove from group
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
        case 'Home': {
          e.preventDefault();
          if (flatList.length > 0) {
            const item = flatList[0];
            const newId = item.type === 'material' ? item.material.id : item.group.id;
            setFocusedId(newId);
            if (!shift) setSelectedIds(new Set([newId]));
          }
          break;
        }
        case 'End': {
          e.preventDefault();
          if (flatList.length > 0) {
            const item = flatList[flatList.length - 1];
            const newId = item.type === 'material' ? item.material.id : item.group.id;
            setFocusedId(newId);
            if (!shift) setSelectedIds(new Set([newId]));
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
            setMaterials(materials.map(m => selectedIds.has(m.id) ? { ...m, qty: m.qty + 1 } : m));
          }
          break;
        }
        case '-': {
          if (!editingQtyId) {
            e.preventDefault();
            setMaterials(materials.map(m => selectedIds.has(m.id) ? { ...m, qty: Math.max(1, m.qty - 1) } : m));
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
            // Ungroup
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
  }, [flatList, focusedIndex, focusedId, selectedIds, editingQtyId, materials, groups, clipboard]);
  
  const moveSelected = (direction) => {
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
  
  const handleCreateGroup = ({ name, color }) => {
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
  
  const handleDeleteGroup = (groupId) => {
    setGroups(groups.filter(g => g.id !== groupId));
    setMaterials(materials.map(m => m.groupId === groupId ? { ...m, groupId: null } : m));
  };
  
  // Drag handlers
  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e, id, isGroup = false) => {
    e.preventDefault();
    if (isGroup) {
      setDragOverGroup(id);
      setDragOverId(null);
    } else {
      setDragOverId(id);
      setDragOverGroup(null);
    }
  };
  
  const handleDrop = (e, targetId, targetGroupId = null) => {
    e.preventDefault();
    if (!draggedId) return;
    
    if (targetGroupId !== null) {
      // Dropping into a group
      setMaterials(materials.map(m => m.id === draggedId ? { ...m, groupId: targetGroupId } : m));
    } else if (targetId && targetId !== draggedId) {
      // Reordering
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
  
  const handleRowClick = (id, e) => {
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
      // Range selection
      const flatIds = flatList.filter(i => i.type === 'material').map(i => i.material.id);
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
  
  const handleQtyChange = (id, value) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, qty: Math.max(1, parseInt(value) || 1) } : m));
  };
  
  const totalCost = materials.reduce((sum, m) => {
    const mat = mockMaterials.find(x => x.id === m.materialId);
    return sum + (mat?.cost || 0) * m.qty;
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
                    {/* Group Header */}
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
                    
                    {/* Group Materials */}
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
        
        {/* Footer */}
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
};

// Material Row Component
const MaterialRow = ({ material, isSelected, isFocused, isEditing, isDragging, isDragOver, indent, onClick, onDragStart, onDragOver, onDrop, onDragEnd, onQtyChange, onQtyBlur, onQtyFocus, onDelete }) => {
  const mat = mockMaterials.find(x => x.id === material.materialId);
  const cat = mat ? getCategoryFromPath(mat.categoryPath, materialCategoryTree) : null;
  const qtyRef = useRef(null);
  
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
      {cat?.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
      <span className="font-mono text-blue-400 text-xs w-28 truncate">{mat?.code}</span>
      <span className="text-zinc-300 flex-1 truncate text-sm">{mat?.name}</span>
      <input
        ref={qtyRef}
        type="number"
        min="1"
        value={material.qty}
        onChange={(e) => onQtyChange(e.target.value)}
        onFocus={onQtyFocus}
        onBlur={onQtyBlur}
        className={`w-16 bg-zinc-800 border rounded px-2 py-1 text-center text-sm ${isEditing ? 'border-blue-500' : 'border-zinc-700'}`}
      />
      <span className="text-zinc-500 text-sm w-20 text-right">${((mat?.cost || 0) * material.qty).toFixed(2)}</span>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-zinc-500 hover:text-red-400">
        <Trash2 size={14} />
      </button>
    </div>
  );
};

// ============================================================================
// KIT EDITOR
// ============================================================================

const KitEditor = ({ kit, allKits, onSave, onCancel }) => {
  const [name, setName] = useState(kit?.name || '');
  const [categoryPath, setCategoryPath] = useState(kit?.categoryPath || []);
  const [materials, setMaterials] = useState(kit?.materials || []);
  const [groups, setGroups] = useState(kit?.groups || []);
  const [includedKitIds, setIncludedKitIds] = useState(kit?.includedKitIds || []);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  const addMaterial = (material) => {
    const existing = materials.find(m => m.materialId === material.id);
    if (existing) {
      setMaterials(materials.map(m => m.materialId === material.id ? { ...m, qty: m.qty + 1 } : m));
    } else {
      setMaterials([...materials, { id: generateId(), materialId: material.id, qty: 1, groupId: null }]);
    }
  };
  
  const addKit = (kitToAdd) => {
    if (!includedKitIds.includes(kitToAdd.id)) {
      setIncludedKitIds([...includedKitIds, kitToAdd.id]);
    }
    const newMaterials = [...materials];
    kitToAdd.materials.forEach(km => {
      const existing = newMaterials.find(m => m.materialId === km.materialId);
      if (existing) {
        existing.qty += km.qty;
      } else {
        newMaterials.push({ id: generateId(), materialId: km.materialId, qty: km.qty, groupId: null });
      }
    });
    setMaterials(newMaterials);
  };
  
  const category = getCategoryFromPath(categoryPath, kitCategoryTree);
  const breadcrumbNames = categoryPath.map(id => findCategoryInTree(kitCategoryTree, id)?.node?.name || id);
  
  // Keyboard shortcut for help
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setShowShortcuts(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
  
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
                  const selectedKit = allKits.find(k => k.id === parseInt(e.target.value));
                  if (selectedKit) addKit(selectedKit);
                }}
              >
                <option value="">Add materials from existing kit...</option>
                {allKits.filter(k => k.id !== kit?.id && !includedKitIds.includes(k.id)).map(k => (
                  <option key={k.id} value={k.id}>{k.name} ({k.materials.length} materials)</option>
                ))}
              </select>
              <Layers size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
            </div>
          </div>
          
          {/* Material browser */}
          <MaterialBrowser onSelect={addMaterial} />
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
          onClick={() => onSave({ name, categoryPath, materials, groups, includedKitIds })}
          disabled={!name || materials.length === 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg font-medium"
        >
          {kit ? 'Save Changes' : 'Create Kit'}
        </button>
      </div>
      
      <KeyboardShortcutsPanel isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};

// ============================================================================
// KIT CARD
// ============================================================================

const KitCard = ({ kit, allKits, onEdit, onDuplicate, onDelete, onUse }) => {
  const [expanded, setExpanded] = useState(false);
  const category = getCategoryFromPath(kit.categoryPath, kitCategoryTree);
  const breadcrumbNames = kit.categoryPath?.map(id => findCategoryInTree(kitCategoryTree, id)?.node?.name || id) || [];
  
  const totalCost = kit.materials.reduce((sum, m) => {
    const mat = mockMaterials.find(x => x.id === m.materialId);
    return sum + (mat?.cost || 0) * m.qty;
  }, 0);
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-2 text-xs text-zinc-500">
              {category?.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />}
              <span className="truncate">{breadcrumbNames.join(' › ')}</span>
            </div>
            <h3 className="font-semibold text-lg truncate">{kit.name}</h3>
            <p className="text-sm text-zinc-500 mt-1">
              {kit.materials.length} materials • ${totalCost.toFixed(2)}
              {kit.groups?.length > 0 && ` • ${kit.groups.length} groups`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onUse(kit)} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium">Use</button>
            <div className="relative group">
              <button className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg">
                <MoreVertical size={16} />
              </button>
              <div className="absolute right-0 top-full mt-1 w-36 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible z-10">
                <button onClick={() => onEdit(kit)} className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"><Edit3 size={14} /> Edit</button>
                <button onClick={() => onDuplicate(kit)} className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2"><Copy size={14} /> Duplicate</button>
                <button onClick={() => onDelete(kit)} className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-700 flex items-center gap-2 text-red-400"><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          </div>
        </div>
        
        <button onClick={() => setExpanded(!expanded)} className="mt-3 flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {expanded ? 'Hide' : 'Show'} materials
        </button>
        
        {expanded && (
          <div className="mt-3 bg-zinc-800/50 rounded-lg p-3 space-y-2 max-h-64 overflow-auto">
            {kit.groups?.map(group => {
              const groupMaterials = kit.materials.filter(m => m.groupId === group.id);
              if (groupMaterials.length === 0) return null;
              return (
                <div key={group.id} className="mb-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="font-medium">{group.name}</span>
                  </div>
                  {groupMaterials.map((m, idx) => {
                    const mat = mockMaterials.find(x => x.id === m.materialId);
                    return (
                      <div key={idx} className="flex items-center justify-between text-sm pl-4">
                        <span className="text-zinc-400">
                          <span className="font-mono text-blue-400">{mat?.code}</span>
                          <span className="ml-2">{mat?.name}</span>
                        </span>
                        <span className="text-zinc-500">{m.qty}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {kit.materials.filter(m => !m.groupId).map((m, idx) => {
              const mat = mockMaterials.find(x => x.id === m.materialId);
              return (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">
                    <span className="font-mono text-blue-400">{mat?.code}</span>
                    <span className="ml-2">{mat?.name}</span>
                  </span>
                  <span className="text-zinc-500">{m.qty}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function MaterialKitsPage() {
  const [kits, setKits] = useState(initialKits);
  const [view, setView] = useState('list');
  const [editingKit, setEditingKit] = useState(null);
  const [search, setSearch] = useState('');
  const [filterPath, setFilterPath] = useState([]);
  const [notification, setNotification] = useState(null);
  
  const filteredKits = useMemo(() => {
    return kits.filter(k => {
      if (filterPath.length > 0) {
        const kitPath = k.categoryPath || [];
        for (let i = 0; i < filterPath.length; i++) {
          if (kitPath[i] !== filterPath[i]) return false;
        }
      }
      if (search && !k.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [kits, search, filterPath]);
  
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  
  const handleSave = (kitData) => {
    if (editingKit) {
      setKits(kits.map(k => k.id === editingKit.id ? { ...k, ...kitData } : k));
      showNotification('Kit updated');
    } else {
      setKits([...kits, { ...kitData, id: Date.now() }]);
      showNotification('Kit created');
    }
    setView('list');
    setEditingKit(null);
  };
  
  const handleDuplicate = (kit) => {
    const newKit = { ...kit, id: Date.now(), name: `${kit.name} (Copy)`, materials: kit.materials.map(m => ({ ...m, id: generateId() })), groups: kit.groups?.map(g => ({ ...g, id: generateId() })) || [] };
    setKits([...kits, newKit]);
    showNotification('Kit duplicated');
  };
  
  const handleDelete = (kit) => {
    if (confirm(`Delete "${kit.name}"?`)) {
      setKits(kits.filter(k => k.id !== kit.id));
      showNotification('Kit deleted', 'error');
    }
  };
  
  const handleUseKit = (kit) => {
    console.log('Applied kit:', kit.name, kit.materials);
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
            <div className="p-2 bg-blue-600/20 rounded-lg"><Package className="text-blue-400" size={24} /></div>
            <div>
              <h1 className="text-xl font-bold">Material Kits</h1>
              <p className="text-sm text-zinc-500">Pre-configured material bundles</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setView('create'); setEditingKit(null); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center gap-2">
              <Plus size={16} /> New Kit
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-6 py-6">
        {view === 'list' ? (
          <>
            <div className="mb-4 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 max-w-md">
              <Search size={16} className="text-zinc-500" />
              <input type="text" placeholder="Search kits..." className="bg-transparent flex-1 outline-none text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="mb-6">
              <WaterfallCategoryFilter selectedPath={filterPath} onPathChange={setFilterPath} categoryTree={kitCategoryTree} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKits.map(kit => (
                <KitCard key={kit.id} kit={kit} allKits={kits} onEdit={k => { setEditingKit(k); setView('edit'); }} onDuplicate={handleDuplicate} onDelete={handleDelete} onUse={handleUseKit} />
              ))}
              <button onClick={() => { setView('create'); setEditingKit(null); }} className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-white hover:border-zinc-700">
                <Plus size={32} /><span>Create New Kit</span>
              </button>
            </div>
          </>
        ) : (
          <div className="max-w-4xl mx-auto">
            <KitEditor kit={editingKit} allKits={kits} onSave={handleSave} onCancel={() => { setView('list'); setEditingKit(null); }} />
          </div>
        )}
      </div>
    </div>
  );
}
