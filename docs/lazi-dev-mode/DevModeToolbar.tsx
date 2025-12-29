// =============================================================================
// LAZI AI - DevMode Toolbar
// =============================================================================
// Floating toolbar to control Developer Mode
// Location: src/components/dev-mode/DevModeToolbar.tsx
// =============================================================================

'use client';

import React, { useState } from 'react';
import { useDevMode } from './DevModeProvider';

export function DevModeToolbar() {
  const {
    isEnabled,
    isInspecting,
    toggleDevMode,
    startInspecting,
    stopInspecting,
    savedSpecs,
    currentPage,
    exportToWindsurf,
    exportToJSON,
  } = useDevMode();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Don't render if dev mode is disabled
  if (!isEnabled) {
    // Just show a small toggle button
    return (
      <button
        onClick={toggleDevMode}
        title="Enable Developer Mode (Ctrl+Shift+D)"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#374151',
          border: '2px solid #4b5563',
          color: '#9ca3af',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          zIndex: 99990,
          transition: 'all 0.2s',
          opacity: 0.6,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.backgroundColor = '#4b5563';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = '0.6';
          e.currentTarget.style.backgroundColor = '#374151';
        }}
      >
        🛠️
      </button>
    );
  }

  const pageSpecs = savedSpecs.filter(s => s.pageRoute === currentPage);

  const handleExportWindsurf = () => {
    const markdown = exportToWindsurf();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lazi-specs-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportJSON = () => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lazi-specs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleCopyWindsurf = () => {
    const markdown = exportToWindsurf();
    navigator.clipboard.writeText(markdown);
    setShowExportMenu(false);
  };

  return (
    <div
      data-dev-mode-overlay
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 99990,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
      }}
    >
      {/* Expanded Menu */}
      {isExpanded && (
        <div
          style={{
            backgroundColor: '#1f2937',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            minWidth: '200px',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid #374151',
          }}>
            <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
              Dev Mode
            </span>
            <span style={{
              backgroundColor: '#10b981',
              color: 'white',
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
            }}>
              Active
            </span>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '12px',
          }}>
            <div style={{
              backgroundColor: '#374151',
              padding: '8px',
              borderRadius: '6px',
              textAlign: 'center',
            }}>
              <div style={{ color: '#3b82f6', fontSize: '18px', fontWeight: 600 }}>
                {savedSpecs.length}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '10px' }}>Total Specs</div>
            </div>
            <div style={{
              backgroundColor: '#374151',
              padding: '8px',
              borderRadius: '6px',
              textAlign: 'center',
            }}>
              <div style={{ color: '#10b981', fontSize: '18px', fontWeight: 600 }}>
                {pageSpecs.length}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '10px' }}>This Page</div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => {
                if (isInspecting) {
                  stopInspecting();
                } else {
                  startInspecting();
                }
              }}
              style={{
                padding: '10px 12px',
                backgroundColor: isInspecting ? '#ef4444' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isInspecting ? '⏹️ Stop Inspecting' : '🎯 Start Inspecting'}
            </button>

            {/* Export Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={savedSpecs.length === 0}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: savedSpecs.length > 0 ? '#374151' : '#1f2937',
                  color: savedSpecs.length > 0 ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: savedSpecs.length > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: 500,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>📤 Export Specs</span>
                <span>{showExportMenu ? '▲' : '▼'}</span>
              </button>
              
              {showExportMenu && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#374151',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  overflow: 'hidden',
                }}>
                  <button
                    onClick={handleCopyWindsurf}
                    style={exportMenuButtonStyle}
                  >
                    📋 Copy Windsurf Prompt
                  </button>
                  <button
                    onClick={handleExportWindsurf}
                    style={exportMenuButtonStyle}
                  >
                    📝 Download Markdown
                  </button>
                  <button
                    onClick={handleExportJSON}
                    style={exportMenuButtonStyle}
                  >
                    💾 Download JSON
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={toggleDevMode}
              style={{
                padding: '10px 12px',
                backgroundColor: '#374151',
                color: '#ef4444',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🚫 Disable Dev Mode
            </button>
          </div>

          {/* Current Page */}
          <div style={{
            marginTop: '12px',
            paddingTop: '8px',
            borderTop: '1px solid #374151',
          }}>
            <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '4px' }}>
              Current Page
            </div>
            <div style={{
              color: '#9ca3af',
              fontSize: '12px',
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {currentPage}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #374151',
          }}>
            <div style={{ color: '#6b7280', fontSize: '10px' }}>
              <kbd style={kbdStyle}>Ctrl</kbd>+<kbd style={kbdStyle}>Shift</kbd>+<kbd style={kbdStyle}>D</kbd> Toggle
              <span style={{ margin: '0 8px' }}>|</span>
              <kbd style={kbdStyle}>ESC</kbd> Cancel
            </div>
          </div>
        </div>
      )}

      {/* Main Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isExpanded ? '✕' : '🛠️'}
      </button>

      {/* Active Indicator */}
      {isInspecting && (
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#ef4444',
            border: '2px solid #1f2937',
            animation: 'pulse 1s infinite',
          }}
        />
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// Styles
// =============================================================================

const exportMenuButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: 'transparent',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  fontSize: '12px',
  textAlign: 'left',
  transition: 'background-color 0.15s',
};

const kbdStyle: React.CSSProperties = {
  backgroundColor: '#4b5563',
  padding: '1px 4px',
  borderRadius: '3px',
  fontSize: '9px',
  marginLeft: '2px',
  marginRight: '2px',
};
