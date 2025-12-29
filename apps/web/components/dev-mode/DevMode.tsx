// =============================================================================
// LAZI AI - DevMode 2.0 Main Component
// =============================================================================
// This wraps all DevMode components together
// =============================================================================

'use client';

import React from 'react';
import { DevModeProvider } from './DevModeProvider';
import { ElementInspector } from './ElementInspector';
import { DevModeToolbar } from './DevModeToolbar';
import { DevModePanel } from './panels/DevModePanel';
import { DevModeCommandBar } from './panels/DevModeCommandBar';
import { AddMode } from './modes/AddMode';
import { AnnotateMode } from './modes/AnnotateMode';
import { RecordMode } from './modes/RecordMode';
import { KeyboardShortcutsHandler } from './KeyboardShortcutsHandler';

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
  storageKey = 'lazi-devmode-2.0-specs',
  devOnly = true,
}: DevModeProps) {
  // Don't render DevMode tools in production unless devOnly is false
  if (devOnly && process.env.NODE_ENV === 'production') {
    return <>{children}</>;
  }

  return (
    <DevModeProvider storageKey={storageKey}>
      {children}

      {/* Inspector overlay - highlights elements on hover in inspect mode */}
      <ElementInspector />

      {/* Add mode - click anywhere to add elements */}
      <AddMode />

      {/* Annotate mode - draw annotations on the page */}
      <AnnotateMode />

      {/* Record mode - shows recording indicator */}
      <RecordMode />

      {/* Command bar - top bar with all controls */}
      <DevModeCommandBar />

      {/* Side panel - persistent configuration panel */}
      <DevModePanel />

      {/* Floating toolbar - toggle button when DevMode is disabled */}
      <DevModeToolbar />

      {/* Keyboard shortcuts handler */}
      <KeyboardShortcutsHandler />
    </DevModeProvider>
  );
}

// =============================================================================
// Standalone Component Exports
// =============================================================================

/**
 * ViewSpecsButton - Standalone button to open specs panel
 * Can be added anywhere in your UI
 */
export function ViewSpecsButton() {
  return (
    <button
      onClick={() => {
        // This would need to be connected to the context
        console.log('View specs button clicked');
      }}
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
      View Specs
    </button>
  );
}
