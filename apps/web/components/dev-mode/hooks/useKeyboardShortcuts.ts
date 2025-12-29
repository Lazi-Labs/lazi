// =============================================================================
// LAZI AI - DevMode 2.0 Keyboard Shortcuts Hook
// =============================================================================
// Global keyboard shortcut handler for DevMode
// =============================================================================

'use client';

import { useEffect, useCallback } from 'react';
import { useDevMode } from '../DevModeProvider';
import { DevModeMode } from '../types/devmode.types';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const {
    state,
    dispatch,
    toggleEnabled,
    removeLastAnnotation,
    clearSession,
  } = useDevMode();

  const { isEnabled, currentMode } = state;

  // Mode shortcuts
  const setMode = useCallback(
    (mode: DevModeMode) => {
      if (isEnabled) {
        dispatch({ type: 'SET_MODE', payload: mode });
      }
    },
    [isEnabled, dispatch]
  );

  // Toggle panel
  const togglePanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_PANEL' });
  }, [dispatch]);

  // Define all shortcuts
  const shortcuts: ShortcutConfig[] = [
    // Toggle DevMode - Cmd+Shift+D
    {
      key: 'd',
      meta: true,
      shift: true,
      action: toggleEnabled,
      description: 'Toggle DevMode',
    },
    // Mode shortcuts (when DevMode is enabled)
    {
      key: '`',
      action: () => setMode('view'),
      description: 'Switch to View mode',
    },
    {
      key: '1',
      action: () => setMode('inspect'),
      description: 'Switch to Inspect mode',
    },
    {
      key: '2',
      action: () => setMode('add'),
      description: 'Switch to Add mode',
    },
    {
      key: '3',
      action: () => setMode('connect'),
      description: 'Switch to Connect mode',
    },
    {
      key: '4',
      action: () => setMode('annotate'),
      description: 'Switch to Annotate mode',
    },
    {
      key: '5',
      action: () => setMode('record'),
      description: 'Switch to Record mode',
    },
    // Toggle panel - Cmd+Shift+P
    {
      key: 'p',
      meta: true,
      shift: true,
      action: togglePanel,
      description: 'Toggle side panel',
    },
    // Undo annotation - Cmd+Z (only in annotate mode)
    {
      key: 'z',
      meta: true,
      action: () => {
        if (currentMode === 'annotate') {
          removeLastAnnotation();
        }
      },
      description: 'Undo last annotation',
    },
    // Clear annotations - Cmd+Shift+Z
    {
      key: 'z',
      meta: true,
      shift: true,
      action: () => {
        if (currentMode === 'annotate') {
          dispatch({ type: 'CLEAR_ANNOTATIONS' });
        }
      },
      description: 'Clear all annotations',
    },
    // Escape - deselect element or close panel
    {
      key: 'Escape',
      action: () => {
        if (state.selectedElement) {
          dispatch({ type: 'DESELECT_ELEMENT' });
        } else if (state.isPanelOpen) {
          dispatch({ type: 'TOGGLE_PANEL' });
        }
      },
      description: 'Deselect element or close panel',
    },
  ];

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Escape even in inputs
        if (e.key !== 'Escape') {
          return;
        }
      }

      // Check each shortcut
      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : true;
        const metaMatch = shortcut.meta ? e.metaKey || e.ctrlKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        // For mode shortcuts (`, 1-5), only trigger if DevMode is enabled
        if (['`', '1', '2', '3', '4', '5'].includes(shortcut.key) && !isEnabled) {
          continue;
        }

        // For shortcuts that require meta/ctrl, make sure it's pressed
        if (shortcut.meta && !e.metaKey && !e.ctrlKey) {
          continue;
        }

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEnabled, currentMode, state.selectedElement, state.isPanelOpen, shortcuts]);

  return {
    shortcuts: shortcuts.map((s) => ({
      key: s.key,
      modifiers: [
        s.meta ? '⌘' : '',
        s.ctrl ? 'Ctrl' : '',
        s.shift ? 'Shift' : '',
        s.alt ? 'Alt' : '',
      ]
        .filter(Boolean)
        .join('+'),
      description: s.description,
    })),
  };
}

// =============================================================================
// Shortcut Display Helper
// =============================================================================

export function formatShortcut(
  key: string,
  modifiers: { meta?: boolean; ctrl?: boolean; shift?: boolean; alt?: boolean }
): string {
  const parts: string[] = [];

  if (modifiers.meta) parts.push('⌘');
  if (modifiers.ctrl) parts.push('Ctrl');
  if (modifiers.shift) parts.push('⇧');
  if (modifiers.alt) parts.push('⌥');

  parts.push(key.toUpperCase());

  return parts.join('');
}

// =============================================================================
// Keyboard Shortcuts Help Panel Data
// =============================================================================

export const KEYBOARD_SHORTCUTS = [
  { keys: '⌘⇧D', description: 'Toggle DevMode' },
  { keys: '`', description: 'View mode (browse)' },
  { keys: '1', description: 'Inspect mode' },
  { keys: '2', description: 'Add mode' },
  { keys: '3', description: 'Connect mode' },
  { keys: '4', description: 'Annotate mode' },
  { keys: '5', description: 'Record mode' },
  { keys: '⌘⇧P', description: 'Toggle panel' },
  { keys: '⌘Z', description: 'Undo annotation' },
  { keys: 'Esc', description: 'Deselect/Close' },
];
