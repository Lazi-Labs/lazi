// =============================================================================
// LAZI AI - DevMode 2.0 Element Palette
// =============================================================================
// Palette of available elements to add to the page
// =============================================================================

'use client';

import React, { useState } from 'react';
import { Point } from '../types/devmode.types';
import {
  MousePointer2,
  Type,
  ToggleLeft,
  ChevronDown,
  Table,
  Square,
  Columns,
  Search,
  Filter,
  FormInput,
  BarChart3,
  Loader,
  List,
  Calendar,
  Hash,
  X,
  Image,
  FileText,
} from 'lucide-react';
import { calculateSafePosition } from '../utils/elementUtils';

interface ElementPaletteProps {
  position: Point;
  targetContainer?: string;
  onSelect: (elementType: string, config: any) => void;
  onClose: () => void;
}

interface ElementOption {
  id: string;
  label: string;
  icon: React.ElementType;
  category: 'ui' | 'data' | 'action' | 'layout';
  description: string;
  defaultConfig: Record<string, any>;
}

const ELEMENT_OPTIONS: ElementOption[] = [
  // UI Components
  {
    id: 'button',
    label: 'Button',
    icon: MousePointer2,
    category: 'ui',
    description: 'Clickable button with customizable action',
    defaultConfig: { variant: 'primary', size: 'medium' },
  },
  {
    id: 'dropdown',
    label: 'Dropdown',
    icon: ChevronDown,
    category: 'ui',
    description: 'Select from a list of options',
    defaultConfig: { placeholder: 'Select...', searchable: false },
  },
  {
    id: 'input-text',
    label: 'Text Input',
    icon: Type,
    category: 'ui',
    description: 'Single-line text input field',
    defaultConfig: { placeholder: '', validation: null },
  },
  {
    id: 'input-number',
    label: 'Number Input',
    icon: Hash,
    category: 'ui',
    description: 'Numeric input with optional min/max',
    defaultConfig: { min: null, max: null, step: 1 },
  },
  {
    id: 'input-date',
    label: 'Date Picker',
    icon: Calendar,
    category: 'ui',
    description: 'Date selection input',
    defaultConfig: { format: 'MM/DD/YYYY' },
  },
  {
    id: 'toggle',
    label: 'Toggle Switch',
    icon: ToggleLeft,
    category: 'ui',
    description: 'On/off toggle control',
    defaultConfig: { defaultValue: false },
  },

  // Data Components
  {
    id: 'data-table',
    label: 'Data Table',
    icon: Table,
    category: 'data',
    description: 'Display data in a sortable table',
    defaultConfig: { columns: [], pagination: true, pageSize: 10 },
  },
  {
    id: 'data-list',
    label: 'Data List',
    icon: List,
    category: 'data',
    description: 'Display data as a list',
    defaultConfig: { layout: 'vertical' },
  },
  {
    id: 'chart',
    label: 'Chart',
    icon: BarChart3,
    category: 'data',
    description: 'Visual data representation',
    defaultConfig: { type: 'bar', data: [] },
  },
  {
    id: 'image',
    label: 'Image',
    icon: Image,
    category: 'data',
    description: 'Display an image',
    defaultConfig: { src: '', alt: '' },
  },
  {
    id: 'loading-indicator',
    label: 'Loading State',
    icon: Loader,
    category: 'data',
    description: 'Show loading/progress',
    defaultConfig: { type: 'spinner' },
  },

  // Action Components
  {
    id: 'search-bar',
    label: 'Search Bar',
    icon: Search,
    category: 'action',
    description: 'Search input with filtering',
    defaultConfig: { debounce: 300 },
  },
  {
    id: 'filter-bar',
    label: 'Filter Controls',
    icon: Filter,
    category: 'action',
    description: 'Multiple filter options',
    defaultConfig: { filters: [] },
  },
  {
    id: 'form-section',
    label: 'Form Section',
    icon: FormInput,
    category: 'action',
    description: 'Group of form fields',
    defaultConfig: { fields: [], layout: 'vertical' },
  },
  {
    id: 'text-block',
    label: 'Text Block',
    icon: FileText,
    category: 'action',
    description: 'Rich text content area',
    defaultConfig: { content: '' },
  },

  // Layout Components
  {
    id: 'card',
    label: 'Card / Panel',
    icon: Square,
    category: 'layout',
    description: 'Container with border/shadow',
    defaultConfig: { padding: 'medium', shadow: true },
  },
  {
    id: 'columns',
    label: 'Columns',
    icon: Columns,
    category: 'layout',
    description: 'Multi-column layout',
    defaultConfig: { columns: 2, gap: 'medium' },
  },
];

const CATEGORIES = [
  { id: 'ui', label: 'UI Controls' },
  { id: 'data', label: 'Data Display' },
  { id: 'action', label: 'Actions' },
  { id: 'layout', label: 'Layout' },
];

export function ElementPalette({ position, targetContainer, onSelect, onClose }: ElementPaletteProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate safe position to stay within viewport
  const paletteWidth = 320;
  const paletteHeight = 400;
  const safePosition = calculateSafePosition(position, paletteWidth, paletteHeight);

  const filteredOptions = ELEMENT_OPTIONS.filter((option) => {
    const matchesCategory = !selectedCategory || option.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelect = (option: ElementOption) => {
    onSelect(option.id, option.defaultConfig);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        data-dev-mode-overlay
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
        }}
        onClick={onClose}
      />

      {/* Palette */}
      <div
        data-devmode-panel
        style={{
          position: 'fixed',
          left: safePosition.x,
          top: safePosition.y,
          width: `${paletteWidth}px`,
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          zIndex: 100001,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid #374151',
          }}
        >
          <h3 style={{ color: 'white', fontSize: '14px', fontWeight: 600, margin: 0 }}>
            Add Element
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#9ca3af',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #374151' }}>
          <div style={{ position: 'relative' }}>
            <Search
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '14px',
                height: '14px',
                color: '#6b7280',
              }}
            />
            <input
              type="text"
              placeholder="Search elements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                backgroundColor: '#374151',
                border: '1px solid #4b5563',
                borderRadius: '6px',
                color: 'white',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            padding: '8px 12px',
            borderBottom: '1px solid #374151',
            overflowX: 'auto',
          }}
        >
          <button
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '6px 10px',
              backgroundColor: !selectedCategory ? '#3b82f6' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: !selectedCategory ? 'white' : '#9ca3af',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '6px 10px',
                backgroundColor: selectedCategory === cat.id ? '#3b82f6' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: selectedCategory === cat.id ? 'white' : '#9ca3af',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Elements Grid */}
        <div
          style={{
            maxHeight: '256px',
            overflowY: 'auto',
            padding: '12px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
            }}
          >
            {filteredOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '12px 8px',
                    backgroundColor: '#374151',
                    border: '1px solid #4b5563',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.backgroundColor = '#3b4555';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#4b5563';
                    e.currentTarget.style.backgroundColor = '#374151';
                  }}
                >
                  <Icon style={{ width: '20px', height: '20px', color: '#3b82f6' }} />
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>{option.label}</span>
                </button>
              );
            })}
          </div>

          {filteredOptions.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 16px',
                color: '#6b7280',
                fontSize: '13px',
              }}
            >
              No elements found
            </div>
          )}
        </div>

        {/* Location Info */}
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid #374151',
            backgroundColor: '#111827',
          }}
        >
          <div style={{ marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase' }}>
                Position
              </span>
              <span style={{
                color: '#10b981',
                fontSize: '12px',
                fontFamily: 'monospace',
                backgroundColor: '#064e3b',
                padding: '2px 6px',
                borderRadius: '4px',
              }}>
                x: {Math.round(position.x)}px, y: {Math.round(position.y)}px
              </span>
            </div>
          </div>
          {targetContainer && (
            <div>
              <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Target Container
              </span>
              <code style={{
                color: '#60a5fa',
                fontSize: '11px',
                fontFamily: 'monospace',
                backgroundColor: '#1e3a5f',
                padding: '4px 6px',
                borderRadius: '4px',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {targetContainer}
              </code>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
