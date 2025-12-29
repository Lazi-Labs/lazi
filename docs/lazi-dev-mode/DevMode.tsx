// =============================================================================
// LAZI AI - DevMode Main Component
// =============================================================================
// This wraps all DevMode components together
// Location: src/components/dev-mode/DevMode.tsx
// =============================================================================

'use client';

import React, { useState } from 'react';
import { DevModeProvider } from './DevModeProvider';
import { ElementInspector } from './ElementInspector';
import { ConfigModal } from './ConfigModal';
import { DevModeToolbar } from './DevModeToolbar';
import { SpecsPanel } from './SpecsPanel';

interface DevModeProps {
  children: React.ReactNode;
  /** Enable DevMode by default (useful for development) */
  defaultEnabled?: boolean;
  /** Storage key for persisting specs */
  storageKey?: string;
  /** Only show in development mode */
  devOnly?: boolean;
}

export function DevMode({ 
  children, 
  defaultEnabled = false,
  storageKey = 'lazi-dev-mode-specs',
  devOnly = true,
}: DevModeProps) {
  const [showSpecsPanel, setShowSpecsPanel] = useState(false);

  // Don't render DevMode tools in production unless devOnly is false
  if (devOnly && process.env.NODE_ENV === 'production') {
    return <>{children}</>;
  }

  return (
    <DevModeProvider storageKey={storageKey}>
      {children}
      
      {/* Inspector overlay - highlights elements on hover */}
      <ElementInspector />
      
      {/* Configuration modal - appears when element is clicked */}
      <ConfigModal />
      
      {/* Floating toolbar - controls for DevMode */}
      <DevModeToolbar />
      
      {/* Specs panel - view and manage saved specs */}
      <SpecsPanel 
        isOpen={showSpecsPanel} 
        onClose={() => setShowSpecsPanel(false)} 
      />
    </DevModeProvider>
  );
}

// =============================================================================
// Standalone Specs Button (can be added anywhere in your UI)
// =============================================================================

export function ViewSpecsButton() {
  const [showPanel, setShowPanel] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        style={{
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        📋 View Specs
      </button>
      <SpecsPanel isOpen={showPanel} onClose={() => setShowPanel(false)} />
    </>
  );
}
