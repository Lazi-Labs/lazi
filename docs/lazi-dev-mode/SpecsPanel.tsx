// =============================================================================
// LAZI AI - Specs Panel
// =============================================================================
// Panel to view, edit, and manage saved element specifications
// Location: src/components/dev-mode/SpecsPanel.tsx
// =============================================================================

'use client';

import React, { useState, useMemo } from 'react';
import { useDevMode, ElementSpec } from './DevModeProvider';

interface SpecsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpecsPanel({ isOpen, onClose }: SpecsPanelProps) {
  const {
    savedSpecs,
    deleteSpec,
    updateSpec,
    exportToWindsurf,
    currentPage,
  } = useDevMode();

  const [filter, setFilter] = useState<'all' | 'current-page' | 'draft' | 'implemented'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<Set<string>>(new Set());
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null);

  const filteredSpecs = useMemo(() => {
    let specs = [...savedSpecs];
    
    // Apply filter
    switch (filter) {
      case 'current-page':
        specs = specs.filter(s => s.pageRoute === currentPage);
        break;
      case 'draft':
        specs = specs.filter(s => s.status === 'draft');
        break;
      case 'implemented':
        specs = specs.filter(s => s.status === 'implemented' || s.status === 'production');
        break;
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      specs = specs.filter(s => 
        s.elementText?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.pageRoute.toLowerCase().includes(query)
      );
    }
    
    // Sort by updated date
    specs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    return specs;
  }, [savedSpecs, filter, searchQuery, currentPage]);

  const handleSelectAll = () => {
    if (selectedSpecs.size === filteredSpecs.length) {
      setSelectedSpecs(new Set());
    } else {
      setSelectedSpecs(new Set(filteredSpecs.map(s => s.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedSpecs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSpecs(newSelected);
  };

  const handleDeleteSelected = () => {
    if (confirm(`Delete ${selectedSpecs.size} specification(s)?`)) {
      selectedSpecs.forEach(id => deleteSpec(id));
      setSelectedSpecs(new Set());
    }
  };

  const handleExportSelected = () => {
    const markdown = exportToWindsurf(Array.from(selectedSpecs));
    navigator.clipboard.writeText(markdown);
    alert('Copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100000,
        }}
      />
      
      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '500px',
          maxWidth: '100%',
          height: '100vh',
          backgroundColor: '#1f2937',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.3)',
          zIndex: 100001,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #374151',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontWeight: 600 }}>
              Saved Specifications
            </h2>
            <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '13px' }}>
              {savedSpecs.length} total | {filteredSpecs.length} shown
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '24px',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #374151',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search specs..."
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#374151',
              border: '1px solid #4b5563',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
            }}
          />
          
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { value: 'all', label: 'All' },
              { value: 'current-page', label: 'This Page' },
              { value: 'draft', label: 'Drafts' },
              { value: 'implemented', label: 'Done' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value as typeof filter)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: filter === f.value ? '#3b82f6' : '#374151',
                  color: filter === f.value ? 'white' : '#9ca3af',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedSpecs.size > 0 && (
          <div style={{
            padding: '12px 20px',
            backgroundColor: '#374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ color: 'white', fontSize: '13px' }}>
              {selectedSpecs.size} selected
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleExportSelected}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                📋 Copy to Windsurf
              </button>
              <button
                onClick={handleDeleteSelected}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        )}

        {/* Specs List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 20px',
        }}>
          {filteredSpecs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#6b7280',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
              <p style={{ margin: 0 }}>No specifications found</p>
              <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
                Start inspecting elements to create specs
              </p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px',
              }}>
                <input
                  type="checkbox"
                  checked={selectedSpecs.size === filteredSpecs.length}
                  onChange={handleSelectAll}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                  Select all
                </span>
              </div>
              
              {/* Spec Cards */}
              {filteredSpecs.map(spec => (
                <SpecCard
                  key={spec.id}
                  spec={spec}
                  isSelected={selectedSpecs.has(spec.id)}
                  isExpanded={expandedSpec === spec.id}
                  onToggleSelect={() => handleToggleSelect(spec.id)}
                  onToggleExpand={() => setExpandedSpec(expandedSpec === spec.id ? null : spec.id)}
                  onDelete={() => deleteSpec(spec.id)}
                  onUpdateStatus={(status) => updateSpec(spec.id, { status })}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// =============================================================================
// Spec Card Component
// =============================================================================

interface SpecCardProps {
  spec: ElementSpec;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: ElementSpec['status']) => void;
}

function SpecCard({
  spec,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  onDelete,
  onUpdateStatus,
}: SpecCardProps) {
  const statusColors: Record<ElementSpec['status'], string> = {
    draft: '#f59e0b',
    testing: '#3b82f6',
    implemented: '#10b981',
    production: '#8b5cf6',
  };

  const priorityColors: Record<ElementSpec['priority'], string> = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444',
  };

  return (
    <div
      style={{
        backgroundColor: '#374151',
        borderRadius: '8px',
        marginBottom: '8px',
        overflow: 'hidden',
        border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          cursor: 'pointer',
        }}
        onClick={onToggleExpand}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={e => {
            e.stopPropagation();
            onToggleSelect();
          }}
          onClick={e => e.stopPropagation()}
          style={{ width: '16px', height: '16px', marginTop: '2px' }}
        />
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              backgroundColor: statusColors[spec.status],
              color: 'white',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
            }}>
              {spec.status}
            </span>
            <span style={{
              backgroundColor: priorityColors[spec.priority],
              color: 'white',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
            }}>
              {spec.priority}
            </span>
            <span style={{
              color: '#9ca3af',
              fontSize: '11px',
            }}>
              {spec.elementType}
            </span>
          </div>
          
          <div style={{
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {spec.elementText || 'Unnamed element'}
          </div>
          
          <div style={{
            color: '#6b7280',
            fontSize: '12px',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: '4px',
          }}>
            {spec.pageRoute}
          </div>
        </div>
        
        <span style={{ color: '#6b7280', fontSize: '12px' }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{
          padding: '0 12px 12px',
          borderTop: '1px solid #4b5563',
          marginTop: '0',
          paddingTop: '12px',
        }}>
          {/* Description */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
              Description
            </div>
            <div style={{ color: 'white', fontSize: '13px' }}>
              {spec.description || 'No description'}
            </div>
          </div>

          {/* Action Type */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
              Action
            </div>
            <div style={{ color: 'white', fontSize: '13px' }}>
              {spec.actionType === 'api-call' && `${spec.apiMethod} ${spec.apiEndpoint}`}
              {spec.actionType === 'navigate' && `Navigate to ${spec.navigateTo}`}
              {spec.actionType === 'workflow' && `Trigger workflow: ${spec.workflowName || spec.workflowId}`}
              {spec.actionType === 'sync-job' && `Sync: ${spec.syncJobType}`}
              {spec.actionType === 'modal' && 'Open modal'}
              {spec.actionType === 'custom' && 'Custom action'}
            </div>
          </div>

          {/* Timestamps */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '12px',
            fontSize: '11px',
            color: '#6b7280',
          }}>
            <span>Created: {new Date(spec.createdAt).toLocaleDateString()}</span>
            <span>Updated: {new Date(spec.updatedAt).toLocaleDateString()}</span>
          </div>

          {/* Status Change */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
              Change Status
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['draft', 'testing', 'implemented', 'production'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => onUpdateStatus(status)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: spec.status === status ? statusColors[status] : '#4b5563',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    textTransform: 'capitalize',
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                const { exportToWindsurf } = useDevMode.getState?.() || {};
                // Copy single spec
                const markdown = `## ${spec.elementText || 'Element'}\n\n${spec.description}`;
                navigator.clipboard.writeText(markdown);
              }}
              style={{
                padding: '8px 12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              📋 Copy
            </button>
            <button
              onClick={onDelete}
              style={{
                padding: '8px 12px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
