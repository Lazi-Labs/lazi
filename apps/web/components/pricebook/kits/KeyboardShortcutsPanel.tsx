'use client';

import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsPanel({ isOpen, onClose }: KeyboardShortcutsPanelProps) {
  if (!isOpen) return null;
  
  const shortcuts = [
    { category: 'Navigation', items: [
      { keys: ['↑', '↓'], desc: 'Move selection up/down' },
      { keys: ['←', '→'], desc: 'Collapse/expand group or move into/out of group' },
      { keys: ['Home'], desc: 'Jump to first item' },
      { keys: ['End'], desc: 'Jump to last item' },
      { keys: ['Tab'], desc: 'Move to quantity field' },
    ]},
    { category: 'Selection', items: [
      { keys: ['Space'], desc: 'Toggle selection' },
      { keys: ['Shift', '↑/↓'], desc: 'Extend selection' },
      { keys: ['Ctrl/⌘', 'A'], desc: 'Select all' },
      { keys: ['Esc'], desc: 'Clear selection' },
    ]},
    { category: 'Editing', items: [
      { keys: ['Enter'], desc: 'Edit quantity' },
      { keys: ['+', '='], desc: 'Increase quantity' },
      { keys: ['-'], desc: 'Decrease quantity' },
      { keys: ['Delete', 'Backspace'], desc: 'Remove selected' },
    ]},
    { category: 'Organization', items: [
      { keys: ['Ctrl/⌘', 'G'], desc: 'Group selected items' },
      { keys: ['Ctrl/⌘', 'Shift', 'G'], desc: 'Ungroup selected items' },
      { keys: ['Ctrl/⌘', '↑'], desc: 'Move up' },
      { keys: ['Ctrl/⌘', '↓'], desc: 'Move down' },
    ]},
    { category: 'Clipboard', items: [
      { keys: ['Ctrl/⌘', 'C'], desc: 'Copy selected' },
      { keys: ['Ctrl/⌘', 'V'], desc: 'Paste' },
      { keys: ['Ctrl/⌘', 'D'], desc: 'Duplicate selected' },
    ]},
  ];
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-blue-400" />
            <h2 className="font-semibold text-lg">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded"><X size={20} /></button>
        </div>
        <div className="p-4 overflow-auto max-h-[60vh] grid grid-cols-2 gap-6">
          {shortcuts.map(section => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold text-zinc-400 mb-2">{section.category}</h3>
              <div className="space-y-1">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1">
                    <span className="text-zinc-300">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, kidx) => (
                        <React.Fragment key={kidx}>
                          <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono">
                            {key}
                          </kbd>
                          {kidx < item.keys.length - 1 && <span className="text-zinc-600 text-xs">+</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
