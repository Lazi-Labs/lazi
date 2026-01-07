# Material Kits - 4-Phase Finalization Implementation

## Reference Files
- **Original Prototype**: `docs/material-kits-full.jsx` - THE SOURCE OF TRUTH for features
- **Current Implementation**: `apps/web/components/pricebook/kits/`

---

## ⛔ CONSTRAINTS

### DO NOT:
- Change Docker containers, networks, or infrastructure
- Modify database schema (tables already exist and work)
- Change API endpoints (they work)
- Alter the UI theme/colors/fonts (keep current styling)

### DO:
- Add missing features from prototype
- Fix broken functionality
- Match prototype behavior exactly
- Keep current theme/styling

---

## Current State (What's Working)

Based on screenshots:
- ✅ Kit list page with "+ NEW" button and search
- ✅ Empty state when no kits
- ✅ Create New Kit form
- ✅ Kit name and description fields
- ✅ "Add materials from existing kit" dropdown
- ✅ Material search
- ✅ Category filter (showing "All Materials")
- ✅ Materials list with code, name, price, + button
- ✅ "Materials in Kit" section
- ✅ Group/Ungroup/Delete buttons
- ✅ Material quantity inputs
- ✅ Total Material Cost calculation
- ✅ Cancel/Create Kit buttons

---

## PHASE 1: Kit List Page Enhancements

### 1.1 Add Edit/Actions to Kit Cards

**Missing**: When kits exist, the kit cards need Edit, Duplicate, Delete actions.

**Reference**: `material-kits-full.jsx` → `KitCard` component

```tsx
// Each kit card should have:
<KitCard>
  <div className="flex items-start justify-between">
    <div>
      <span className="category-breadcrumb">{categoryPath}</span>
      <h3>{kit.name}</h3>
      <p>{kit.materials.length} materials • ${totalCost}</p>
    </div>
    <div className="flex gap-2">
      <Button variant="primary" onClick={() => onUse(kit)}>Use</Button>
      <DropdownMenu>
        <DropdownItem onClick={() => onEdit(kit)}>Edit</DropdownItem>
        <DropdownItem onClick={() => onDuplicate(kit)}>Duplicate</DropdownItem>
        <DropdownItem onClick={() => onDelete(kit)} className="text-red-500">Delete</DropdownItem>
      </DropdownMenu>
    </div>
  </div>
  
  {/* Expandable material preview */}
  <button onClick={toggleExpand}>
    {expanded ? 'Hide' : 'Show'} materials
  </button>
  {expanded && (
    <div className="material-preview">
      {kit.materials.map(m => (
        <div>{m.code} - {m.name} x{m.qty}</div>
      ))}
    </div>
  )}
</KitCard>
```

### 1.2 Add Kit Category Filter (Waterfall)

**Missing**: Waterfall category filter to browse kits by category.

**Reference**: `material-kits-full.jsx` → `WaterfallCategoryFilter` component

```tsx
// On KitsPage, add category filter above kit grid
<WaterfallCategoryFilter
  selectedPath={filterPath}
  onPathChange={setFilterPath}
  categoryTree={kitCategoryTree}
/>
```

### 1.3 Add Stats Summary

**Optional but nice**: Show kit statistics at top of page.

```tsx
<div className="stats-row">
  <Stat label="Total Kits" value={kits.length} />
  <Stat label="Total Materials" value={totalMaterialsInKits} />
  <Stat label="Total Value" value={`$${totalKitValue}`} />
</div>
```

---

## PHASE 2: Kit Editor Enhancements

### 2.1 Verify Waterfall Category Filter for Materials

**Check if working**: The material browser should have a waterfall category filter.

**Reference**: `material-kits-full.jsx` → `MaterialBrowser` component

```tsx
// Material browser should have:
<div className="material-browser">
  <div className="flex gap-2">
    <Input 
      placeholder="Search materials by code, name..."
      value={search}
      onChange={e => setSearch(e.target.value)}
    />
    <Button onClick={() => setShowCategoryFilter(!showCategoryFilter)}>
      <FolderTree /> {/* Category browse icon */}
    </Button>
  </div>
  
  {showCategoryFilter && (
    <WaterfallCategoryFilter
      selectedPath={materialCategoryPath}
      onPathChange={setMaterialCategoryPath}
      categoryTree={materialCategoryTree}
      compact
    />
  )}
  
  <MaterialList materials={filteredMaterials} onAdd={handleAddMaterial} />
</div>
```

### 2.2 Add Kit Category Selector

**Missing**: Ability to set the kit's own category path.

```tsx
// In Kit Editor form, add:
<div>
  <label>Kit Category</label>
  <CategoryPathSelector
    value={kitCategoryPath}
    onChange={setKitCategoryPath}
    categoryTree={kitCategoryTree}
  />
</div>
```

### 2.3 Verify "Add from Existing Kit" Works

**Check**: Does selecting an existing kit actually import its materials?

```tsx
// When kit is selected from dropdown:
const handleAddFromKit = (selectedKit) => {
  selectedKit.materials.forEach(kitMaterial => {
    const existing = materials.find(m => m.materialId === kitMaterial.materialId);
    if (existing) {
      // Add quantities if already exists
      existing.qty += kitMaterial.qty;
    } else {
      // Add new material
      materials.push({
        id: generateId(),
        materialId: kitMaterial.materialId,
        qty: kitMaterial.qty,
        groupId: null
      });
    }
  });
};
```

---

## PHASE 3: Material Grouping & Organization

### 3.1 Verify Group Creation Works

**Check**: Select multiple materials → Click "Group" → Name modal appears → Group created.

**Reference**: `material-kits-full.jsx` → `GroupNameModal` component

```tsx
// Group creation flow:
1. User checks multiple materials
2. Clicks "Group" button
3. Modal opens with name input + color picker
4. User enters name, selects color
5. Materials are assigned to new group
6. Group header appears with collapse/expand
```

### 3.2 Verify Drag & Drop Works

**Check**: Can drag materials into/out of groups, and reorder.

```tsx
// Each material row should have:
<div
  draggable
  onDragStart={(e) => handleDragStart(e, material.id)}
  onDragOver={(e) => handleDragOver(e, material.id)}
  onDrop={(e) => handleDrop(e, material.id)}
>
  <GripVertical className="drag-handle" />
  {/* rest of material row */}
</div>
```

### 3.3 Verify Group Headers Work

**Check**: Groups have header with name, color dot, collapse toggle, edit/delete.

```tsx
// Group header should render:
<div className="group-header">
  <button onClick={() => toggleCollapse(group.id)}>
    {group.collapsed ? <ChevronRight /> : <ChevronDown />}
  </button>
  <span className="color-dot" style={{ backgroundColor: group.color }} />
  <span className="group-name">{group.name}</span>
  <span className="item-count">{materialsInGroup.length} items</span>
  <button onClick={() => editGroup(group)}><Edit3 /></button>
  <button onClick={() => deleteGroup(group.id)}><X /></button>
</div>
```

---

## PHASE 4: Keyboard Navigation

### 4.1 Implement Full Keyboard Support

**Reference**: `material-kits-full.jsx` → keyboard event handler in `KitMaterialList`

```tsx
// Add to KitMaterialList component:
useEffect(() => {
  const handleKeyDown = (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    
    switch (e.key) {
      // Navigation
      case 'ArrowUp':
        e.preventDefault();
        if (ctrl) moveSelected(-1);
        else moveFocus(-1, shift);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (ctrl) moveSelected(1);
        else moveFocus(1, shift);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        collapseGroupOrRemoveFromGroup();
        break;
      case 'ArrowRight':
        e.preventDefault();
        expandGroup();
        break;
      case 'Home':
        e.preventDefault();
        focusFirst();
        break;
      case 'End':
        e.preventDefault();
        focusLast();
        break;
        
      // Selection
      case ' ':
        e.preventDefault();
        toggleSelection(focusedId);
        break;
      case 'a':
        if (ctrl) {
          e.preventDefault();
          selectAll();
        }
        break;
      case 'Escape':
        e.preventDefault();
        clearSelection();
        break;
        
      // Editing
      case 'Enter':
        e.preventDefault();
        editFocusedItem();
        break;
      case '+':
      case '=':
        if (!editingQty) {
          e.preventDefault();
          increaseQuantity();
        }
        break;
      case '-':
        if (!editingQty) {
          e.preventDefault();
          decreaseQuantity();
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (!editingQty) {
          e.preventDefault();
          deleteSelected();
        }
        break;
        
      // Organization
      case 'g':
        if (ctrl && !shift) {
          e.preventDefault();
          groupSelected();
        } else if (ctrl && shift) {
          e.preventDefault();
          ungroupSelected();
        }
        break;
        
      // Clipboard
      case 'c':
        if (ctrl) {
          e.preventDefault();
          copySelected();
        }
        break;
      case 'v':
        if (ctrl) {
          e.preventDefault();
          paste();
        }
        break;
      case 'd':
        if (ctrl) {
          e.preventDefault();
          duplicateSelected();
        }
        break;
        
      // Help
      case '?':
        setShowShortcuts(true);
        break;
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [/* dependencies */]);
```

### 4.2 Add Keyboard Shortcuts Panel

**Reference**: `material-kits-full.jsx` → `KeyboardShortcutsPanel` component

```tsx
// Render when ? is pressed:
<KeyboardShortcutsPanel 
  isOpen={showShortcuts} 
  onClose={() => setShowShortcuts(false)} 
/>
```

### 4.3 Add Visual Focus Indicators

```tsx
// Material row should show focus ring:
<div
  className={cn(
    'material-row',
    isFocused && 'ring-2 ring-blue-500',
    isSelected && 'bg-blue-100'
  )}
>
```

---

## Verification Checklist

### Phase 1 - Kit List Page
- [ ] Kit cards show Edit/Duplicate/Delete dropdown
- [ ] Kit cards expand to show materials
- [ ] Kit cards show category breadcrumb
- [ ] Waterfall category filter for kits (optional)
- [ ] Stats summary (optional)

### Phase 2 - Kit Editor
- [ ] Material search works
- [ ] Waterfall category filter for materials works
- [ ] Can set kit's category path
- [ ] "Add from existing kit" imports materials correctly
- [ ] Materials merge quantities if duplicate

### Phase 3 - Grouping
- [ ] Can select multiple materials
- [ ] "Group" button opens name modal
- [ ] Groups created with name and color
- [ ] Group headers show collapse/expand
- [ ] Can drag materials into groups
- [ ] Can drag materials out of groups
- [ ] Can reorder materials
- [ ] Can edit group name/color
- [ ] Can delete group (materials become ungrouped)

### Phase 4 - Keyboard
- [ ] ↑/↓ moves focus
- [ ] ←/→ collapses/expands groups
- [ ] Space toggles selection
- [ ] Ctrl+A selects all
- [ ] Ctrl+G groups selected
- [ ] Ctrl+Shift+G ungroups
- [ ] +/- adjusts quantity
- [ ] Delete removes selected
- [ ] Ctrl+C/V/D copy/paste/duplicate
- [ ] ? shows shortcuts panel
- [ ] Focus ring visible on focused item

---

## File Reference

### Compare these files to the prototype:

```
apps/web/components/pricebook/kits/
├── index.ts                    # Exports - verify all components exported
├── KitsPage.tsx                # Compare to prototype's main page
├── KitCard.tsx                 # Add Edit/Duplicate/Delete, expand preview
├── KitEditor.tsx               # Verify category selector, material import
├── KitMaterialList.tsx         # CRITICAL - groups, drag-drop, keyboard
├── MaterialBrowser.tsx         # Verify waterfall filter
├── WaterfallCategoryFilter.tsx # Should match prototype exactly
├── GroupNameModal.tsx          # Name + color picker
├── KeyboardShortcutsPanel.tsx  # Help modal
└── UseKitModal.tsx             # For services integration
```

### The prototype file has everything:
```
docs/material-kits-full.jsx     # ~1200 lines, complete implementation
```

---

## Implementation Order

1. **Start with Phase 1** - Kit list page needs edit button most urgently
2. **Phase 2** - Verify editor features work
3. **Phase 3** - Grouping is complex, test thoroughly
4. **Phase 4** - Keyboard nav is polish, do last

For each phase:
1. Read the relevant section of `material-kits-full.jsx`
2. Compare to current implementation
3. Add missing code
4. Test functionality
5. Move to next phase
