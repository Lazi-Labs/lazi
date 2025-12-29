// =============================================================================
// LAZI AI - DevMode 2.0 Keyboard Shortcuts Handler
// =============================================================================
// Component that activates keyboard shortcut listening
// =============================================================================

'use client';

import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

/**
 * KeyboardShortcutsHandler
 *
 * This component activates keyboard shortcuts for DevMode.
 * It doesn't render anything - it just sets up the event listeners.
 */
export function KeyboardShortcutsHandler() {
  // Activate keyboard shortcuts
  useKeyboardShortcuts();

  return null;
}
