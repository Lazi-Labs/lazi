// =============================================================================
// LAZI AI - DevMode 2.0 Panel
// =============================================================================
// Persistent sidebar panel for element configuration and spec management
// =============================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDevMode } from '../DevModeProvider';
import { ElementSpec, PRIORITY_COLORS, STATUS_COLORS } from '../types/devmode.types';
import { DatabaseBrowser } from './DatabaseBrowser';
import { QuickActionPrompts } from './QuickActionPrompts';
import { AnnotationToolbar } from './AnnotationToolbar';
import { RecordingControls } from './RecordingControls';
import { ExportPanel } from './ExportPanel';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  Database,
  Zap,
  Wind,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Pencil,
  Circle,
  Download,
} from 'lucide-react';

// =============================================================================
// Component
// =============================================================================

const PANEL_WIDTH = 400;

export function DevModePanel() {
  const { state, dispatch, updateSpec, removeSpec } = useDevMode();
  const { isEnabled, isPanelOpen, isPanelCollapsed, currentSpec, specs, activeTab } =
    state;

  const [copied, setCopied] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Pause element selection when hovering over panel
  useEffect(() => {
    if (isHovering) {
      document.body.setAttribute('data-devmode-paused', 'true');
    } else {
      // Only remove if command bar isn't also being hovered
      const commandBarHovered = document.querySelector('[data-devmode-panel]:hover');
      if (!commandBarHovered) {
        document.body.removeAttribute('data-devmode-paused');
      }
    }
  }, [isHovering]);

  // Effect to resize main content area when panel is open
  useEffect(() => {
    const shouldResize = isEnabled && isPanelOpen && !isPanelCollapsed;

    // Find or create the style element for panel resize
    let styleEl = document.getElementById('devmode-panel-resize-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'devmode-panel-resize-styles';
      document.head.appendChild(styleEl);
    }

    if (shouldResize) {
      // Add margin to main content area (the div next to sidebar)
      styleEl.textContent = `
        /* Resize main content when DevMode panel is open */
        [data-devmode-resize-content] {
          margin-right: ${PANEL_WIDTH}px !important;
          transition: margin-right 0.3s ease !important;
        }
        /* Target the main content wrapper by structure */
        .min-h-screen.bg-background > div:not([data-devmode-panel]):not([data-dev-mode-overlay]) {
          margin-right: ${PANEL_WIDTH}px !important;
          transition: margin-right 0.3s ease !important;
        }
      `;
      document.body.setAttribute('data-devmode-panel-open', 'true');
    } else {
      // Reset styles with transition
      styleEl.textContent = `
        .min-h-screen.bg-background > div:not([data-devmode-panel]):not([data-dev-mode-overlay]) {
          margin-right: 0 !important;
          transition: margin-right 0.3s ease !important;
        }
      `;
      document.body.removeAttribute('data-devmode-panel-open');
    }

    // Cleanup function for unmount
    return () => {
      const existingStyleEl = document.getElementById('devmode-panel-resize-styles');
      if (existingStyleEl) {
        existingStyleEl.textContent = `
          .min-h-screen.bg-background > div:not([data-devmode-panel]):not([data-dev-mode-overlay]) {
            margin-right: 0 !important;
            transition: margin-right 0.3s ease !important;
          }
        `;
      }
      document.body.removeAttribute('data-devmode-panel-open');
    };
  }, [isEnabled, isPanelOpen, isPanelCollapsed]);

  if (!isEnabled || !isPanelOpen) return null;

  const setActiveTab = (tab: typeof activeTab) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  };

  const toggleCollapse = () => {
    dispatch({ type: 'SET_PANEL_COLLAPSED', payload: !isPanelCollapsed });
  };

  const closePanel = () => {
    dispatch({ type: 'SET_PANEL_OPEN', payload: false });
  };

  const handleUpdateSpec = (updates: Partial<ElementSpec>) => {
    if (currentSpec) {
      updateSpec(currentSpec.id, updates);
    }
  };

  const handleCopyWindsurf = () => {
    if (!currentSpec) return;

    const prompt = generateWindsurfPrompt(currentSpec);
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Collapsed panel
  if (isPanelCollapsed) {
    return (
      <div
        data-devmode-panel
        style={{
          position: 'fixed',
          top: '50%',
          right: 0,
          transform: 'translateY(-50%)',
          zIndex: 99995,
        }}
      >
        <button
          onClick={toggleCollapse}
          style={{
            padding: '12px 8px',
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '8px 0 0 8px',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '-4px 0 12px rgba(0,0,0,0.2)',
          }}
        >
          <ChevronLeft style={{ width: '16px', height: '16px' }} />
          <span
            style={{
              writingMode: 'vertical-lr',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            DevMode
          </span>
          {specs.length > 0 && (
            <span
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                fontSize: '10px',
                padding: '2px 4px',
                borderRadius: '4px',
                minWidth: '18px',
                textAlign: 'center',
              }}
            >
              {specs.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Command bar height - main bar (~52px) + potential secondary toolbar (~48px)
  const commandBarHeight = state.currentMode === 'annotate' || state.currentMode === 'record' ? 100 : 52;

  return (
    <div
      ref={panelRef}
      data-devmode-panel
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        position: 'fixed',
        top: commandBarHeight,
        right: 0,
        width: `${PANEL_WIDTH}px`,
        height: `calc(100vh - ${commandBarHeight}px)`,
        backgroundColor: '#1f2937',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.3)',
        zIndex: 99995,
        display: 'flex',
        flexDirection: 'column',
        transition: 'top 0.2s ease, height 0.2s ease',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🛠️</span>
          <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
            DevMode 2.0
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={toggleCollapse}
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#9ca3af',
              cursor: 'pointer',
            }}
            title="Collapse panel"
          >
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          </button>
          <button
            onClick={closePanel}
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#9ca3af',
              cursor: 'pointer',
            }}
            title="Close panel"
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>

      {/* Current Selection Info */}
      {currentSpec && currentSpec.elementInfo && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#374151',
            borderBottom: '1px solid #4b5563',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase' }}>
              Selected Element
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <span
                style={{
                  backgroundColor: STATUS_COLORS[currentSpec.status],
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                }}
              >
                {currentSpec.status}
              </span>
              <span
                style={{
                  backgroundColor: PRIORITY_COLORS[currentSpec.priority],
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                }}
              >
                {currentSpec.priority}
              </span>
            </div>
          </div>
          <div style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>
            {currentSpec.elementInfo.textContent.slice(0, 50) || 'Unnamed element'}
            {currentSpec.elementInfo.textContent.length > 50 && '...'}
          </div>
          <div
            style={{
              color: '#6b7280',
              fontSize: '11px',
              fontFamily: 'monospace',
              marginTop: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentSpec.elementInfo.selector}
          </div>
        </div>
      )}

      {/* Tabs - Mode specific */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #374151',
        }}
      >
        {getTabsForMode(state.currentMode).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '10px 8px',
                backgroundColor: activeTab === tab.id ? '#374151' : 'transparent',
                border: 'none',
                borderBottom:
                  activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? 'white' : '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                transition: 'all 0.2s',
              }}
            >
              <Icon style={{ width: '14px', height: '14px' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {activeTab === 'config' && (
          <ConfigTab
            spec={currentSpec}
            onUpdate={handleUpdateSpec}
            onDelete={() => currentSpec && removeSpec(currentSpec.id)}
          />
        )}
        {activeTab === 'data' && <DatabaseBrowser />}
        {activeTab === 'actions' && (
          <ActionsTab spec={currentSpec} onUpdate={handleUpdateSpec} />
        )}
        {activeTab === 'prompts' && <QuickActionPrompts />}
        {activeTab === 'windsurf' && (
          <WindsurfTab
            spec={currentSpec}
            specs={specs}
            onCopy={handleCopyWindsurf}
            copied={copied}
          />
        )}
        {activeTab === 'annotate' && <AnnotationToolbar />}
        {activeTab === 'record' && <RecordingControls />}
        {activeTab === 'export' && <ExportPanel />}
      </div>

      {/* Specs Summary */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #374151',
          backgroundColor: '#111827',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>
            Session Specs: {specs.length}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: '#f59e0b', fontSize: '11px' }}>
              {specs.filter((s) => s.status === 'draft').length} draft
            </span>
            <span style={{ color: '#3b82f6', fontSize: '11px' }}>
              {specs.filter((s) => s.status === 'ready').length} ready
            </span>
            <span style={{ color: '#10b981', fontSize: '11px' }}>
              {specs.filter((s) => s.status === 'implemented').length} done
            </span>
          </div>
        </div>

        {/* Mini specs list */}
        <div style={{ maxHeight: '120px', overflow: 'auto' }}>
          {specs.slice(0, 5).map((spec) => (
            <button
              key={spec.id}
              onClick={() => dispatch({ type: 'SET_CURRENT_SPEC', payload: spec })}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '4px',
                backgroundColor:
                  currentSpec?.id === spec.id ? '#374151' : '#1f2937',
                border:
                  currentSpec?.id === spec.id
                    ? '1px solid #3b82f6'
                    : '1px solid #374151',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: STATUS_COLORS[spec.status],
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {spec.elementInfo?.textContent.slice(0, 30) ||
                    spec.description.slice(0, 30) ||
                    'Unnamed spec'}
                </span>
              </div>
            </button>
          ))}
          {specs.length > 5 && (
            <div
              style={{
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '11px',
                padding: '4px',
              }}
            >
              +{specs.length - 5} more specs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Mode-specific Tab Configuration
// =============================================================================

type TabId = 'config' | 'data' | 'actions' | 'prompts' | 'windsurf' | 'annotate' | 'record' | 'export';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

function getTabsForMode(mode: string): TabConfig[] {
  const baseTabs: TabConfig[] = [
    { id: 'config', label: 'Config', icon: Settings },
    { id: 'data', label: 'Data', icon: Database },
  ];

  const actionsTabs: TabConfig[] = [
    { id: 'actions', label: 'Actions', icon: Zap },
    { id: 'prompts', label: 'Prompts', icon: Zap },
  ];

  const outputTabs: TabConfig[] = [
    { id: 'windsurf', label: 'Windsurf', icon: Wind },
    { id: 'export', label: 'Export', icon: Download },
  ];

  switch (mode) {
    case 'view':
    case 'inspect':
    case 'add':
    case 'connect':
      return [...baseTabs, ...actionsTabs, ...outputTabs.slice(0, 1)]; // Config, Data, Actions, Prompts, Windsurf
    case 'annotate':
      return [
        { id: 'annotate', label: 'Annotate', icon: Pencil },
        ...outputTabs,
      ];
    case 'record':
      return [
        { id: 'record', label: 'Record', icon: Circle },
        ...outputTabs,
      ];
    default:
      return [...baseTabs, { id: 'windsurf', label: 'Windsurf', icon: Wind }];
  }
}

// =============================================================================
// Tab Components
// =============================================================================

interface TabProps {
  spec: ElementSpec | null;
  onUpdate: (updates: Partial<ElementSpec>) => void;
}

function ConfigTab({
  spec,
  onUpdate,
  onDelete,
}: TabProps & { onDelete: () => void }) {
  if (!spec) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6b7280',
        }}
      >
        <AlertCircle
          style={{ width: '40px', height: '40px', margin: '0 auto 12px' }}
        />
        <p style={{ margin: 0 }}>No element selected</p>
        <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
          Use Inspect mode to select an element
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Behavior Type */}
      <div>
        <label style={labelStyle}>Behavior Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {[
            { value: 'api-call', label: 'API Call', icon: '🔌' },
            { value: 'navigate', label: 'Navigate', icon: '🔗' },
            { value: 'workflow', label: 'Workflow', icon: '⚡' },
            { value: 'sync-job', label: 'Sync Job', icon: '🔄' },
            { value: 'open-modal', label: 'Modal', icon: '📦' },
            { value: 'custom', label: 'Custom', icon: '✏️' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() =>
                onUpdate({ behaviorType: option.value as ElementSpec['behaviorType'] })
              }
              style={{
                padding: '8px',
                backgroundColor:
                  spec.behaviorType === option.value ? '#3b82f6' : '#374151',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '11px',
                textAlign: 'center',
              }}
            >
              <div>{option.icon}</div>
              <div style={{ marginTop: '4px' }}>{option.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>
          Description <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <textarea
          value={spec.description}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Describe what this element should do..."
          style={{
            ...inputStyle,
            minHeight: '80px',
            resize: 'vertical',
          }}
        />
      </div>

      {/* Priority & Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Priority</label>
          <select
            value={spec.priority}
            onChange={(e) =>
              onUpdate({ priority: e.target.value as ElementSpec['priority'] })
            }
            style={inputStyle}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={spec.status}
            onChange={(e) =>
              onUpdate({ status: e.target.value as ElementSpec['status'] })
            }
            style={inputStyle}
          >
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="implemented">Implemented</option>
          </select>
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={onDelete}
        style={{
          padding: '10px',
          backgroundColor: 'transparent',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          color: '#ef4444',
          cursor: 'pointer',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Trash2 style={{ width: '14px', height: '14px' }} />
        Delete Spec
      </button>
    </div>
  );
}

function ActionsTab({ spec, onUpdate }: TabProps) {
  if (!spec) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
        Select an element first
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* API Call Config */}
      {spec.behaviorType === 'api-call' && (
        <>
          <div
            style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}
          >
            <div>
              <label style={labelStyle}>Method</label>
              <select
                value={spec.apiMethod || 'GET'}
                onChange={(e) =>
                  onUpdate({ apiMethod: e.target.value as ElementSpec['apiMethod'] })
                }
                style={inputStyle}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Endpoint</label>
              <input
                type="text"
                value={spec.apiEndpoint || ''}
                onChange={(e) => onUpdate({ apiEndpoint: e.target.value })}
                placeholder="/api/..."
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Payload (JSON)</label>
            <textarea
              value={spec.apiPayload || ''}
              onChange={(e) => onUpdate({ apiPayload: e.target.value })}
              placeholder='{"key": "value"}'
              style={{ ...inputStyle, minHeight: '60px', fontFamily: 'monospace' }}
            />
          </div>
        </>
      )}

      {/* Navigate Config */}
      {spec.behaviorType === 'navigate' && (
        <div>
          <label style={labelStyle}>Navigate To</label>
          <input
            type="text"
            value={spec.navigateTo || ''}
            onChange={(e) => onUpdate({ navigateTo: e.target.value })}
            placeholder="/dashboard/..."
            style={inputStyle}
          />
        </div>
      )}

      {/* Workflow Config */}
      {spec.behaviorType === 'workflow' && (
        <>
          <div>
            <label style={labelStyle}>Workflow Name</label>
            <input
              type="text"
              value={spec.workflowName || ''}
              onChange={(e) => onUpdate({ workflowName: e.target.value })}
              placeholder="sync-servicetitan"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Workflow ID (optional)</label>
            <input
              type="text"
              value={spec.workflowId || ''}
              onChange={(e) => onUpdate({ workflowId: e.target.value })}
              placeholder="abc123"
              style={inputStyle}
            />
          </div>
        </>
      )}

      {/* Sync Job Config */}
      {spec.behaviorType === 'sync-job' && (
        <div>
          <label style={labelStyle}>Sync Job Type</label>
          <select
            value={spec.syncJobType || ''}
            onChange={(e) => onUpdate({ syncJobType: e.target.value })}
            style={inputStyle}
          >
            <option value="">Select sync type...</option>
            <option value="pricebook-categories">Pricebook Categories</option>
            <option value="pricebook-services">Pricebook Services</option>
            <option value="pricebook-materials">Pricebook Materials</option>
            <option value="customers">Customers</option>
            <option value="jobs">Jobs</option>
            <option value="invoices">Invoices</option>
            <option value="technicians">Technicians</option>
            <option value="full-sync">Full Sync (All Data)</option>
          </select>
        </div>
      )}

      {/* UI Feedback Options */}
      <div
        style={{
          padding: '12px',
          backgroundColor: '#374151',
          borderRadius: '8px',
        }}
      >
        <label style={{ ...labelStyle, marginBottom: '12px' }}>UI Feedback</label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={spec.uiFeedback?.loadingState ?? true}
              onChange={(e) =>
                onUpdate({
                  uiFeedback: {
                    loadingState: e.target.checked,
                    refreshAfter: spec.uiFeedback?.refreshAfter,
                    successMessage: spec.uiFeedback?.successMessage,
                    errorMessage: spec.uiFeedback?.errorMessage,
                    validation: spec.uiFeedback?.validation,
                  },
                })
              }
              style={{ width: '16px', height: '16px' }}
            />
            Show loading spinner
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={spec.uiFeedback?.refreshAfter ?? false}
              onChange={(e) =>
                onUpdate({
                  uiFeedback: {
                    loadingState: spec.uiFeedback?.loadingState ?? true,
                    refreshAfter: e.target.checked,
                    successMessage: spec.uiFeedback?.successMessage,
                    errorMessage: spec.uiFeedback?.errorMessage,
                    validation: spec.uiFeedback?.validation,
                  },
                })
              }
              style={{ width: '16px', height: '16px' }}
            />
            Refresh data after completion
          </label>
        </div>
      </div>
    </div>
  );
}

function WindsurfTab({
  spec,
  specs,
  onCopy,
  copied,
}: {
  spec: ElementSpec | null;
  specs: ElementSpec[];
  onCopy: () => void;
  copied: boolean;
}) {
  const [allCopied, setAllCopied] = useState(false);

  const handleCopyAll = () => {
    if (specs.length === 0) return;
    const combinedPrompt = generateCombinedPrompt(specs);
    navigator.clipboard.writeText(combinedPrompt);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  };

  if (!spec) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
          Select an element to see its prompt
        </div>
        {specs.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid #374151', paddingTop: '16px' }}>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 12px 0' }}>
                Or copy all {specs.length} spec{specs.length !== 1 ? 's' : ''} as a combined prompt:
              </p>
              <button
                onClick={handleCopyAll}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: allCopied ? '#10b981' : '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {allCopied ? (
                  <>
                    <Check style={{ width: '16px', height: '16px' }} />
                    Copied All!
                  </>
                ) : (
                  <>
                    <Copy style={{ width: '16px', height: '16px' }} />
                    Copy All Changes ({specs.length})
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const prompt = generateWindsurfPrompt(spec);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>
        Generated prompt for Windsurf/AI implementation:
      </p>

      <pre
        style={{
          backgroundColor: '#111827',
          padding: '12px',
          borderRadius: '8px',
          color: '#e5e7eb',
          fontSize: '11px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          overflow: 'auto',
          maxHeight: '200px',
          margin: 0,
        }}
      >
        {prompt}
      </pre>

      <button
        onClick={onCopy}
        style={{
          padding: '12px',
          backgroundColor: copied ? '#10b981' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 500,
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {copied ? (
          <>
            <Check style={{ width: '16px', height: '16px' }} />
            Copied!
          </>
        ) : (
          <>
            <Copy style={{ width: '16px', height: '16px' }} />
            Copy to Clipboard
          </>
        )}
      </button>

      {specs.length > 1 && (
        <>
          <div style={{ borderTop: '1px solid #374151', paddingTop: '16px' }}>
            <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 12px 0' }}>
              Copy all {specs.length} specs as a combined prompt:
            </p>
            <button
              onClick={handleCopyAll}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: allCopied ? '#10b981' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {allCopied ? (
                <>
                  <Check style={{ width: '16px', height: '16px' }} />
                  Copied All!
                </>
              ) : (
                <>
                  <Copy style={{ width: '16px', height: '16px' }} />
                  Copy All Changes ({specs.length})
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function generateCombinedPrompt(specs: ElementSpec[]): string {
  let prompt = `# Implementation Request - ${specs.length} Changes\n\n`;
  prompt += `This prompt contains ${specs.length} element specifications that need to be implemented.\n\n`;
  prompt += `---\n\n`;

  specs.forEach((spec, index) => {
    prompt += `## Change ${index + 1}: ${spec.elementInfo?.textContent.slice(0, 40) || 'Element'}\n\n`;
    prompt += `**Page:** ${spec.page}\n`;
    prompt += `**Priority:** ${spec.priority}\n`;
    prompt += `**Status:** ${spec.status}\n\n`;

    if (spec.elementInfo) {
      prompt += `### Element Details\n`;
      prompt += `- **Tag:** ${spec.elementInfo.tagName}\n`;
      prompt += `- **Selector:** \`${spec.elementInfo.selector}\`\n`;
      prompt += `- **Text:** "${spec.elementInfo.textContent.slice(0, 50)}"\n\n`;
    }

    prompt += `### Required Behavior\n`;
    prompt += `**Type:** ${spec.behaviorType}\n\n`;

    switch (spec.behaviorType) {
      case 'api-call':
        prompt += `When clicked:\n`;
        prompt += `1. Call \`${spec.apiMethod || 'GET'} ${spec.apiEndpoint || '/api/...'}\`\n`;
        if (spec.apiPayload) prompt += `2. Send payload: ${spec.apiPayload}\n`;
        break;
      case 'navigate':
        prompt += `When clicked, navigate to: ${spec.navigateTo || '...'}\n`;
        break;
      case 'workflow':
        prompt += `When clicked, trigger workflow: ${spec.workflowName || spec.workflowId || '...'}\n`;
        break;
      case 'sync-job':
        prompt += `When clicked, run sync job: ${spec.syncJobType || '...'}\n`;
        break;
      case 'open-modal':
        prompt += `When clicked, open a modal dialog\n`;
        break;
    }

    if (spec.uiFeedback?.loadingState) {
      prompt += `\n- Show loading spinner during operation\n`;
    }
    if (spec.uiFeedback?.refreshAfter) {
      prompt += `- Refresh data after completion\n`;
    }

    if (spec.description) {
      prompt += `\n### Additional Details\n${spec.description}\n`;
    }

    prompt += `\n---\n\n`;
  });

  prompt += `## Implementation Notes\n`;
  prompt += `- Use existing API patterns from the codebase\n`;
  prompt += `- Follow the established component structure\n`;
  prompt += `- Add proper error handling and loading states\n`;
  prompt += `- Implement all ${specs.length} changes in a cohesive manner\n`;

  return prompt;
}

function generateWindsurfPrompt(spec: ElementSpec): string {
  let prompt = `## Implement: ${spec.elementInfo?.textContent.slice(0, 40) || 'Element'}\n\n`;
  prompt += `**Page:** ${spec.page}\n`;
  prompt += `**Priority:** ${spec.priority}\n`;
  prompt += `**Status:** ${spec.status}\n\n`;

  if (spec.elementInfo) {
    prompt += `### Element Details\n`;
    prompt += `- **Tag:** ${spec.elementInfo.tagName}\n`;
    prompt += `- **Selector:** \`${spec.elementInfo.selector}\`\n`;
    prompt += `- **Text:** "${spec.elementInfo.textContent.slice(0, 50)}"\n\n`;
  }

  prompt += `### Required Behavior\n`;
  prompt += `**Type:** ${spec.behaviorType}\n\n`;

  switch (spec.behaviorType) {
    case 'api-call':
      prompt += `When clicked:\n`;
      prompt += `1. Call \`${spec.apiMethod || 'GET'} ${spec.apiEndpoint || '/api/...'}\`\n`;
      if (spec.apiPayload) prompt += `2. Send payload: ${spec.apiPayload}\n`;
      break;
    case 'navigate':
      prompt += `When clicked, navigate to: ${spec.navigateTo || '...'}\n`;
      break;
    case 'workflow':
      prompt += `When clicked, trigger workflow: ${spec.workflowName || spec.workflowId || '...'}\n`;
      break;
    case 'sync-job':
      prompt += `When clicked, run sync job: ${spec.syncJobType || '...'}\n`;
      break;
    case 'open-modal':
      prompt += `When clicked, open a modal dialog\n`;
      break;
  }

  if (spec.uiFeedback?.loadingState) {
    prompt += `\n- Show loading spinner during operation\n`;
  }
  if (spec.uiFeedback?.refreshAfter) {
    prompt += `- Refresh data after completion\n`;
  }

  if (spec.description) {
    prompt += `\n### Additional Details\n${spec.description}\n`;
  }

  prompt += `\n### Implementation Notes\n`;
  prompt += `- Use existing API patterns from the codebase\n`;
  prompt += `- Follow the established component structure\n`;
  prompt += `- Add proper error handling and loading states\n`;

  return prompt;
}

// =============================================================================
// Styles
// =============================================================================

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#9ca3af',
  fontSize: '12px',
  marginBottom: '6px',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  backgroundColor: '#374151',
  border: '1px solid #4b5563',
  borderRadius: '6px',
  color: 'white',
  fontSize: '13px',
  outline: 'none',
};
