// =============================================================================
// LAZI AI - Element Configuration Modal
// =============================================================================
// Modal that appears when you click an element to configure its behavior
// Location: src/components/dev-mode/ConfigModal.tsx
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useDevMode, ElementSpec } from './DevModeProvider';

export function ConfigModal() {
  const { 
    isEnabled, 
    currentSpec, 
    selectedElement, 
    clearSelection, 
    saveSpec,
    currentPage 
  } = useDevMode();
  
  const [spec, setSpec] = useState<Partial<ElementSpec>>({});
  const [activeTab, setActiveTab] = useState<'behavior' | 'ui' | 'windsurf'>('behavior');

  useEffect(() => {
    if (currentSpec) {
      setSpec(currentSpec);
    }
  }, [currentSpec]);

  if (!isEnabled || !currentSpec || !selectedElement) return null;

  const updateField = <K extends keyof ElementSpec>(key: K, value: ElementSpec[K]) => {
    setSpec(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (spec.id && spec.description) {
      saveSpec(spec as ElementSpec);
    }
  };

  const handleCancel = () => {
    clearSelection();
  };

  const generateWindsurfPrompt = () => {
    let prompt = `## Implement: ${spec.elementText || 'Element'} on ${currentPage}\n\n`;
    prompt += `### Element Details\n`;
    prompt += `- Type: ${spec.elementType}\n`;
    prompt += `- Location: ${spec.elementLocation}\n`;
    prompt += `- Selector: \`${spec.elementSelector}\`\n\n`;
    prompt += `### Required Behavior\n`;
    
    switch (spec.actionType) {
      case 'api-call':
        prompt += `When clicked:\n`;
        prompt += `1. Call \`${spec.apiMethod} ${spec.apiEndpoint}\`\n`;
        if (spec.apiPayload) prompt += `2. Send payload: ${spec.apiPayload}\n`;
        if (spec.showLoading) prompt += `3. Show loading spinner during request\n`;
        if (spec.successMessage) prompt += `4. On success: Display toast "${spec.successMessage}"\n`;
        if (spec.errorMessage) prompt += `5. On error: Display toast "${spec.errorMessage}"\n`;
        if (spec.refreshAfter) prompt += `6. Refresh table/page data after completion\n`;
        break;
      case 'navigate':
        prompt += `When clicked, navigate to: ${spec.navigateTo}\n`;
        break;
      case 'workflow':
        prompt += `When clicked, trigger workflow: ${spec.workflowName || spec.workflowId}\n`;
        break;
      case 'sync-job':
        prompt += `When clicked:\n`;
        prompt += `1. Trigger sync job: ${spec.syncJobType}\n`;
        prompt += `2. Call the appropriate API endpoint\n`;
        if (spec.showLoading) prompt += `3. Show loading state\n`;
        if (spec.refreshAfter) prompt += `4. Refresh data when complete\n`;
        break;
      case 'modal':
        prompt += `When clicked, open a modal dialog\n`;
        break;
    }
    
    if (spec.description) {
      prompt += `\n### Additional Details\n${spec.description}\n`;
    }
    
    prompt += `\n### Implementation Notes\n`;
    prompt += `- Use existing API patterns from the codebase\n`;
    prompt += `- Follow the established component structure\n`;
    prompt += `- Add proper error handling and loading states\n`;
    
    return prompt;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        data-dev-mode-overlay
        onClick={handleCancel}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100000,
        }}
      />
      
      {/* Modal */}
      <div
        data-dev-mode-overlay
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '85vh',
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          zIndex: 100001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
              Configure Element
            </h2>
            <p style={{ color: '#9ca3af', margin: '4px 0 0', fontSize: '13px' }}>
              {spec.elementType}: "{spec.elementText?.slice(0, 40) || 'Unnamed'}"
            </p>
          </div>
          <button
            onClick={handleCancel}
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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #374151',
          padding: '0 20px',
        }}>
          {(['behavior', 'ui', 'windsurf'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab ? '#3b82f6' : '#9ca3af',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {tab === 'ui' ? 'UI Feedback' : tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1,
        }}>
          {activeTab === 'behavior' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Action Type */}
              <div>
                <label style={labelStyle}>What should this element do?</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { value: 'api-call', label: '🔌 API Call', desc: 'Call an endpoint' },
                    { value: 'navigate', label: '🔗 Navigate', desc: 'Go to page' },
                    { value: 'workflow', label: '⚡ Workflow', desc: 'Trigger n8n' },
                    { value: 'sync-job', label: '🔄 Sync Job', desc: 'ServiceTitan sync' },
                    { value: 'modal', label: '📦 Open Modal', desc: 'Show dialog' },
                    { value: 'custom', label: '✏️ Custom', desc: 'Describe behavior' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => updateField('actionType', option.value as ElementSpec['actionType'])}
                      style={{
                        padding: '12px',
                        backgroundColor: spec.actionType === option.value ? '#3b82f6' : '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
                        {option.label}
                      </div>
                      <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '2px' }}>
                        {option.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* API Call Config */}
              {spec.actionType === 'api-call' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                    <div>
                      <label style={labelStyle}>Method</label>
                      <select
                        value={spec.apiMethod || 'GET'}
                        onChange={e => updateField('apiMethod', e.target.value as ElementSpec['apiMethod'])}
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
                        onChange={e => updateField('apiEndpoint', e.target.value)}
                        placeholder="/api/sync/pricebook-categories"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Payload (JSON)</label>
                    <textarea
                      value={spec.apiPayload || ''}
                      onChange={e => updateField('apiPayload', e.target.value)}
                      placeholder='{"categoryId": "..."}'
                      style={{ ...inputStyle, minHeight: '80px', fontFamily: 'monospace' }}
                    />
                  </div>
                </>
              )}

              {/* Navigate Config */}
              {spec.actionType === 'navigate' && (
                <div>
                  <label style={labelStyle}>Navigate to</label>
                  <input
                    type="text"
                    value={spec.navigateTo || ''}
                    onChange={e => updateField('navigateTo', e.target.value)}
                    placeholder="/dashboard/categories/[id]"
                    style={inputStyle}
                  />
                </div>
              )}

              {/* Workflow Config */}
              {spec.actionType === 'workflow' && (
                <>
                  <div>
                    <label style={labelStyle}>Workflow Name</label>
                    <input
                      type="text"
                      value={spec.workflowName || ''}
                      onChange={e => updateField('workflowName', e.target.value)}
                      placeholder="sync-servicetitan-categories"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>n8n Workflow ID (optional)</label>
                    <input
                      type="text"
                      value={spec.workflowId || ''}
                      onChange={e => updateField('workflowId', e.target.value)}
                      placeholder="abc123"
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {/* Sync Job Config */}
              {spec.actionType === 'sync-job' && (
                <div>
                  <label style={labelStyle}>Sync Job Type</label>
                  <select
                    value={spec.syncJobType || ''}
                    onChange={e => updateField('syncJobType', e.target.value)}
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

              {/* Description */}
              <div>
                <label style={labelStyle}>
                  Description <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={spec.description || ''}
                  onChange={e => updateField('description', e.target.value)}
                  placeholder="Describe what this element should do in detail. Be specific about data sources, transformations, and expected outcomes..."
                  style={{ ...inputStyle, minHeight: '100px' }}
                />
              </div>

              {/* Priority & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Priority</label>
                  <select
                    value={spec.priority || 'medium'}
                    onChange={e => updateField('priority', e.target.value as ElementSpec['priority'])}
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
                    value={spec.status || 'draft'}
                    onChange={e => updateField('status', e.target.value as ElementSpec['status'])}
                    style={inputStyle}
                  >
                    <option value="draft">Draft</option>
                    <option value="testing">Testing</option>
                    <option value="implemented">Implemented</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ui' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Loading State */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="showLoading"
                  checked={spec.showLoading || false}
                  onChange={e => updateField('showLoading', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="showLoading" style={{ color: 'white', cursor: 'pointer' }}>
                  Show loading spinner during operation
                </label>
              </div>

              {/* Refresh After */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="refreshAfter"
                  checked={spec.refreshAfter || false}
                  onChange={e => updateField('refreshAfter', e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <label htmlFor="refreshAfter" style={{ color: 'white', cursor: 'pointer' }}>
                  Refresh page/table data after completion
                </label>
              </div>

              {/* Success Message */}
              <div>
                <label style={labelStyle}>Success Message</label>
                <input
                  type="text"
                  value={spec.successMessage || ''}
                  onChange={e => updateField('successMessage', e.target.value)}
                  placeholder="Successfully synced 42 categories"
                  style={inputStyle}
                />
              </div>

              {/* Error Message */}
              <div>
                <label style={labelStyle}>Error Message</label>
                <input
                  type="text"
                  value={spec.errorMessage || ''}
                  onChange={e => updateField('errorMessage', e.target.value)}
                  placeholder="Failed to sync data. Please try again."
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {activeTab === 'windsurf' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0 }}>
                This prompt will be generated from your configuration. You can also add custom instructions.
              </p>
              
              {/* Generated Prompt Preview */}
              <div>
                <label style={labelStyle}>Generated Windsurf Prompt</label>
                <pre style={{
                  ...inputStyle,
                  minHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  overflow: 'auto',
                }}>
                  {generateWindsurfPrompt()}
                </pre>
              </div>

              {/* Custom Instructions */}
              <div>
                <label style={labelStyle}>Additional Instructions (optional)</label>
                <textarea
                  value={spec.windsurfPrompt || ''}
                  onChange={e => updateField('windsurfPrompt', e.target.value)}
                  placeholder="Add any additional context or requirements for Windsurf..."
                  style={{ ...inputStyle, minHeight: '80px' }}
                />
              </div>

              {/* Copy Button */}
              <button
                onClick={() => {
                  const fullPrompt = generateWindsurfPrompt() + (spec.windsurfPrompt ? `\n\n${spec.windsurfPrompt}` : '');
                  navigator.clipboard.writeText(fullPrompt);
                }}
                style={{
                  padding: '12px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                📋 Copy Prompt to Clipboard
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #374151',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!spec.description}
            style={{
              padding: '10px 20px',
              backgroundColor: spec.description ? '#3b82f6' : '#1f2937',
              color: spec.description ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '6px',
              cursor: spec.description ? 'pointer' : 'not-allowed',
              fontWeight: 500,
            }}
          >
            Save Specification
          </button>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// Styles
// =============================================================================

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#9ca3af',
  fontSize: '13px',
  marginBottom: '6px',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#374151',
  border: '1px solid #4b5563',
  borderRadius: '6px',
  color: 'white',
  fontSize: '14px',
  outline: 'none',
};
