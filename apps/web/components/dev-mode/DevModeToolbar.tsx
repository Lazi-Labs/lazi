// =============================================================================
// LAZI AI - DevMode 2.0 Toolbar
// =============================================================================
// Simple toggle button that appears when DevMode is disabled
// When enabled, the DevModeCommandBar takes over
// =============================================================================

'use client';

import React from 'react';
import { useDevMode } from './DevModeProvider';

export function DevModeToolbar() {
  const { state, toggleEnabled } = useDevMode();
  const { isEnabled } = state;

  // Only show toggle button when DevMode is disabled
  // When enabled, the CommandBar handles everything
  if (isEnabled) {
    return null;
  }

  return (
    <button
      onClick={toggleEnabled}
      title="Enable Developer Mode (Cmd+Shift+D)"
      data-dev-mode-overlay
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
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.backgroundColor = '#4b5563';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.6';
        e.currentTarget.style.backgroundColor = '#374151';
      }}
    >
      <span role="img" aria-label="Developer Mode">
        🛠️
      </span>
    </button>
  );
}
