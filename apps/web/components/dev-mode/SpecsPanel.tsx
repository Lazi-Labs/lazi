// =============================================================================
// LAZI AI - Specs Panel (Legacy)
// =============================================================================
// Panel to view, edit, and manage saved element specifications
// This is a legacy component - prefer using DevModePanel instead
// =============================================================================

'use client';

import React, { useState, useMemo } from 'react';
import { useDevMode } from './DevModeProvider';
import { ElementSpec, STATUS_COLORS, PRIORITY_COLORS } from './types/devmode.types';

interface SpecsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SpecsPanel({ isOpen, onClose }: SpecsPanelProps) {
  const { state, removeSpec, updateSpec, exportSpecs } = useDevMode();
  const { specs, currentPage } = state;

  const [filter, setFilter] = useState<'all' | 'current-page' | 'draft' | 'implemented'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecs, setSelectedSpecs] = useState<Set<string>>(new Set());
  const [expandedSpec, setExpandedSpec] = useState<string | null>(null);

  const filteredSpecs = useMemo(() => {
    let result = [...specs];

    // Apply filter
    switch (filter) {
      case 'current-page':
        result = result.filter(s => s.page === currentPage);
        break;
      case 'draft':
        result = result.filter(s => s.status === 'draft');
        break;
      case 'implemented':
        result = result.filter(s => s.status === 'implemented');
        break;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.elementInfo?.textContent?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.page.toLowerCase().includes(query)
      );
    }

    // Sort by updated date
    result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return result;
  }, [specs, filter, searchQuery, currentPage]);

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
      selectedSpecs.forEach(id => removeSpec(id));
      setSelectedSpecs(new Set());
    }
  };

  const handleExportSelected = async () => {
    await exportSpecs({
      format: 'markdown',
      includeScreenshots: false,
      includeAnnotations: false,
      includeRecordingData: false,
      specIds: Array.from(selectedSpecs),
    });
    alert('Export started!');
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
              {specs.length} total | {filteredSpecs.length} shown
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
                Export
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
                Delete
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
                  checked={selectedSpecs.size === filteredSpecs.length && filteredSpecs.length > 0}
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
                  onDelete={() => removeSpec(spec.id)}
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
              backgroundColor: STATUS_COLORS[spec.status],
              color: 'white',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
            }}>
              {spec.status}
            </span>
            <span style={{
              backgroundColor: PRIORITY_COLORS[spec.priority],
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
              {spec.elementInfo?.tagName || spec.behaviorType}
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
            {spec.elementInfo?.textContent?.slice(0, 50) || spec.description?.slice(0, 50) || 'Unnamed element'}
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
            {spec.page}
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
              {spec.behaviorType === 'api-call' && `${spec.apiMethod || 'GET'} ${spec.apiEndpoint || ''}`}
              {spec.behaviorType === 'navigate' && `Navigate to ${spec.navigateTo || '...'}`}
              {spec.behaviorType === 'workflow' && `Trigger workflow: ${spec.workflowName || spec.workflowId || '...'}`}
              {spec.behaviorType === 'sync-job' && `Sync: ${spec.syncJobType || '...'}`}
              {spec.behaviorType === 'open-modal' && 'Open modal'}
              {spec.behaviorType === 'custom' && 'Custom action'}
              {!spec.behaviorType && 'Not configured'}
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
              {(['draft', 'ready', 'implemented'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => onUpdateStatus(status)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: spec.status === status ? STATUS_COLORS[status] : '#4b5563',
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
                // Copy single spec
                const text = spec.elementInfo?.textContent?.slice(0, 50) || 'Element';
                const markdown = `## ${text}\n\n${spec.description || 'No description'}`;
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
              Copy
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
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
