// =============================================================================
// LAZI AI - DevMode 2.0 Floating Annotation Toolbar
// =============================================================================
// A floating toolbar that appears at the top-center when in Annotate mode
// Similar to macOS screenshot annotation tools
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useDevMode } from '../DevModeProvider';
import { AnnotationTool } from '../types/devmode.types';
import {
  MousePointer2,
  MoveRight,
  Square,
  Circle,
  Pencil,
  Type,
  StickyNote,
  Highlighter,
  Hash,
  Minus,
  Undo,
  Trash2,
  ChevronDown
} from 'lucide-react';

// Extended tool types for the floating toolbar
export type ExtendedAnnotationTool =
  | 'select'      // Selection/move tool
  | 'arrow'       // Arrow pointer
  | 'line'        // Straight line
  | 'rectangle'   // Rectangle/square
  | 'ellipse'     // Circle/ellipse
  | 'freehand'    // Freehand draw
  | 'highlighter' // Highlighter (semi-transparent)
  | 'text'        // Text box
  | 'note'        // Sticky note
  | 'marker';     // Numbered marker

interface ToolConfig {
  id: ExtendedAnnotationTool;
  icon: React.ElementType;
  label: string;
  shortcut?: string;
}

const TOOLS: ToolConfig[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'arrow', icon: MoveRight, label: 'Arrow', shortcut: 'A' },
  { id: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: 'O' },
  { id: 'freehand', icon: Pencil, label: 'Pen', shortcut: 'P' },
  { id: 'highlighter', icon: Highlighter, label: 'Highlight', shortcut: 'H' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  { id: 'note', icon: StickyNote, label: 'Note', shortcut: 'N' },
  { id: 'marker', icon: Hash, label: 'Marker', shortcut: 'M' },
];

// Preset colors
const COLORS = [
  { id: 'red', value: '#ef4444', label: 'Red' },
  { id: 'orange', value: '#f97316', label: 'Orange' },
  { id: 'yellow', value: '#eab308', label: 'Yellow' },
  { id: 'green', value: '#22c55e', label: 'Green' },
  { id: 'blue', value: '#3b82f6', label: 'Blue' },
  { id: 'purple', value: '#a855f7', label: 'Purple' },
  { id: 'pink', value: '#ec4899', label: 'Pink' },
  { id: 'white', value: '#ffffff', label: 'White' },
  { id: 'black', value: '#000000', label: 'Black' },
];

// Stroke sizes
const STROKE_SIZES = [
  { id: 'small', value: 2, label: '2pt' },
  { id: 'medium', value: 4, label: '4pt' },
  { id: 'large', value: 6, label: '6pt' },
  { id: 'xlarge', value: 10, label: '10pt' },
];

// Font sizes for text
const FONT_SIZES = [
  { id: 'small', value: 12, label: '12pt' },
  { id: 'medium', value: 16, label: '16pt' },
  { id: 'large', value: 20, label: '20pt' },
  { id: 'xlarge', value: 28, label: '28pt' },
  { id: 'huge', value: 36, label: '36pt' },
];

// Tool shortcuts mapping
const TOOL_SHORTCUTS: Record<string, ExtendedAnnotationTool> = {
  'v': 'select',
  'a': 'arrow',
  'l': 'line',
  'r': 'rectangle',
  'o': 'ellipse',
  'p': 'freehand',
  'h': 'highlighter',
  't': 'text',
  'n': 'note',
  'm': 'marker',
};

interface FloatingAnnotationToolbarProps {
  onDone?: () => void;
  onSaveAs?: () => void;
}

export function FloatingAnnotationToolbar({ onDone, onSaveAs }: FloatingAnnotationToolbarProps) {
  const { state, dispatch, removeLastAnnotation } = useDevMode();
  const [selectedTool, setSelectedTool] = useState<ExtendedAnnotationTool>('arrow');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [strokeSize, setStrokeSize] = useState(STROKE_SIZES[1]);
  const [fontSize, setFontSize] = useState(FONT_SIZES[1]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);

  // Handle keyboard shortcuts for tools
  useEffect(() => {
    if (state.currentMode !== 'annotate' || !state.isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Skip if meta/ctrl/alt is pressed
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
      if (tool) {
        e.preventDefault();
        handleToolSelect(tool);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.currentMode, state.isEnabled]);

  // Close pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowColorPicker(false);
      setShowSizePicker(false);
    };

    if (showColorPicker || showSizePicker) {
      // Delay to allow the click that opened the picker
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside, { once: true });
      }, 100);
    }
  }, [showColorPicker, showSizePicker]);

  // Only show in annotate mode
  if (state.currentMode !== 'annotate' || !state.isEnabled) {
    return null;
  }

  const handleToolSelect = (tool: ExtendedAnnotationTool) => {
    setSelectedTool(tool);

    // Map extended tool to base annotation tool for the canvas
    const toolMapping: Record<ExtendedAnnotationTool, AnnotationTool> = {
      'select': 'arrow',
      'arrow': 'arrow',
      'line': 'arrow',
      'rectangle': 'rectangle',
      'ellipse': 'rectangle',
      'freehand': 'freehand',
      'highlighter': 'freehand',
      'text': 'text',
      'note': 'text',
      'marker': 'marker',
    };

    dispatch({ type: 'SET_ANNOTATION_TOOL', payload: toolMapping[tool] });

    // Store extended tool info for canvas to use
    dispatch({
      type: 'SET_ANNOTATION_CONFIG',
      payload: {
        extendedTool: tool,
        color: selectedColor.value,
        strokeSize: strokeSize.value,
        fontSize: fontSize.value,
      }
    });
  };

  const handleColorSelect = (color: typeof COLORS[0]) => {
    setSelectedColor(color);
    setShowColorPicker(false);
    dispatch({
      type: 'SET_ANNOTATION_CONFIG',
      payload: { color: color.value }
    });
  };

  const handleSizeSelect = (size: typeof STROKE_SIZES[0] | typeof FONT_SIZES[0]) => {
    if (selectedTool === 'text' || selectedTool === 'note') {
      setFontSize(size);
      dispatch({ type: 'SET_ANNOTATION_CONFIG', payload: { fontSize: size.value } });
    } else {
      setStrokeSize(size);
      dispatch({ type: 'SET_ANNOTATION_CONFIG', payload: { strokeSize: size.value } });
    }
    setShowSizePicker(false);
  };

  const handleUndo = () => {
    removeLastAnnotation();
  };

  const handleClearAll = () => {
    if (confirm('Clear all annotations?')) {
      dispatch({ type: 'CLEAR_ANNOTATIONS' });
    }
  };

  const handleDone = () => {
    dispatch({ type: 'SET_MODE', payload: 'inspect' });
    onDone?.();
  };

  const isTextTool = selectedTool === 'text' || selectedTool === 'note';
  const currentSizes = isTextTool ? FONT_SIZES : STROKE_SIZES;
  const currentSize = isTextTool ? fontSize : strokeSize;

  return (
    <div
      data-devmode-panel
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100002,
        animation: 'slideInFromTop 0.2s ease-out',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 8px',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid #475569',
      }}>

        {/* Drawing Tools */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          paddingRight: '8px',
          borderRight: '1px solid #475569',
        }}>
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isSelected = selectedTool === tool.id;

            return (
              <button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id)}
                title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  backgroundColor: isSelected ? '#2563eb' : 'transparent',
                  color: isSelected ? 'white' : '#94a3b8',
                  boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.4)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#334155';
                    e.currentTarget.style.color = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <Icon style={{ width: '16px', height: '16px' }} />
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '24px', backgroundColor: '#475569', margin: '0 4px' }} />

        {/* Color Picker */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker(!showColorPicker);
              setShowSizePicker(false);
            }}
            title="Color"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              backgroundColor: selectedColor.value,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
            }} />
            <ChevronDown style={{ width: '12px', height: '12px', color: '#94a3b8' }} />
          </button>

          {showColorPicker && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid #475569',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '4px',
                zIndex: 10,
              }}
            >
              {COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleColorSelect(color)}
                  title={color.label}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: selectedColor.id === color.id ? '2px solid white' : '2px solid transparent',
                    backgroundColor: color.value,
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                    transform: selectedColor.id === color.id ? 'scale(1.1)' : 'scale(1)',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedColor.id !== color.id) {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedColor.id !== color.id) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Size Picker */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSizePicker(!showSizePicker);
              setShowColorPicker(false);
            }}
            title="Size"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
              color: '#cbd5e1',
              fontSize: '13px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {currentSize.label}
            <ChevronDown style={{ width: '12px', height: '12px', color: '#94a3b8' }} />
          </button>

          {showSizePicker && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                marginTop: '8px',
                padding: '4px',
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid #475569',
                minWidth: '80px',
                zIndex: 10,
              }}
            >
              {currentSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => handleSizeSelect(size)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '6px 12px',
                    textAlign: 'left',
                    fontSize: '13px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: currentSize.id === size.id ? '#60a5fa' : '#cbd5e1',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {size.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '24px', backgroundColor: '#475569', margin: '0 4px' }} />

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', paddingLeft: '4px' }}>
          <button
            onClick={handleUndo}
            disabled={state.annotations.length === 0}
            title="Undo (⌘Z)"
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: state.annotations.length === 0 ? '#475569' : '#94a3b8',
              cursor: state.annotations.length === 0 ? 'not-allowed' : 'pointer',
              opacity: state.annotations.length === 0 ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (state.annotations.length > 0) {
                e.currentTarget.style.backgroundColor = '#334155';
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = state.annotations.length === 0 ? '#475569' : '#94a3b8';
            }}
          >
            <Undo style={{ width: '16px', height: '16px' }} />
          </button>

          <button
            onClick={handleClearAll}
            disabled={state.annotations.length === 0}
            title="Clear All"
            style={{
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: state.annotations.length === 0 ? '#475569' : '#94a3b8',
              cursor: state.annotations.length === 0 ? 'not-allowed' : 'pointer',
              opacity: state.annotations.length === 0 ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (state.annotations.length > 0) {
                e.currentTarget.style.backgroundColor = 'rgba(127, 29, 29, 0.3)';
                e.currentTarget.style.color = '#f87171';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = state.annotations.length === 0 ? '#475569' : '#94a3b8';
            }}
          >
            <Trash2 style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Separator */}
        <div style={{ width: '1px', height: '24px', backgroundColor: '#475569', margin: '0 4px' }} />

        {/* Save / Done */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '4px' }}>
          {onSaveAs && (
            <button
              onClick={onSaveAs}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                color: '#cbd5e1',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#334155';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              Save as...
            </button>
          )}

          <button
            onClick={handleDone}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'white',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            Done
          </button>
        </div>
      </div>

      {/* Annotation count badge */}
      {state.annotations.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '2px 8px',
          backgroundColor: '#2563eb',
          color: 'white',
          fontSize: '11px',
          fontWeight: 500,
          borderRadius: '9999px',
        }}>
          {state.annotations.length} annotation{state.annotations.length !== 1 ? 's' : ''}
        </div>
      )}

      <style>{`
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
