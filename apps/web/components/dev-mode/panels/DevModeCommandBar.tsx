// =============================================================================
// LAZI AI - DevMode 2.0 Command Bar
// =============================================================================
// A top command bar that appears when DevMode is enabled
// Contains mode selection, tools, and settings in one unified interface
// =============================================================================

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDevMode } from '../DevModeProvider';
import { DevModeMode, AnnotationTool } from '../types/devmode.types';
import {
  Search,
  Plus,
  Link2,
  Pencil,
  Circle,
  X,
  Download,
  Trash2,
  Settings,
  ChevronDown,
  Undo,
  MousePointer2,
  MoveRight,
  Square,
  Minus,
  Type,
  StickyNote,
  Highlighter,
  Hash,
  PanelRight,
  Eye,
  EyeOff,
  Save,
  Copy,
  FileText,
  Monitor,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface ModeConfig {
  id: DevModeMode;
  icon: React.ElementType;
  label: string;
  shortcut: string;
  description: string;
}

interface ToolConfig {
  id: string;
  icon: React.ElementType;
  label: string;
  shortcut?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const MODES: ModeConfig[] = [
  { id: 'view', icon: Monitor, label: 'View', shortcut: '`', description: 'Browse without selecting' },
  { id: 'inspect', icon: Search, label: 'Inspect', shortcut: '1', description: 'Select and inspect elements' },
  { id: 'add', icon: Plus, label: 'Add', shortcut: '2', description: 'Add new elements' },
  { id: 'connect', icon: Link2, label: 'Connect', shortcut: '3', description: 'Connect to data' },
  { id: 'annotate', icon: Pencil, label: 'Annotate', shortcut: '4', description: 'Draw annotations' },
  { id: 'record', icon: Circle, label: 'Record', shortcut: '5', description: 'Record interactions' },
];

const ANNOTATION_TOOLS: ToolConfig[] = [
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

const COLORS = [
  { id: 'red', value: '#ef4444' },
  { id: 'orange', value: '#f97316' },
  { id: 'yellow', value: '#eab308' },
  { id: 'green', value: '#22c55e' },
  { id: 'blue', value: '#3b82f6' },
  { id: 'purple', value: '#a855f7' },
  { id: 'pink', value: '#ec4899' },
  { id: 'white', value: '#ffffff' },
  { id: 'black', value: '#000000' },
];

const STROKE_SIZES = [
  { id: 'small', value: 2, label: '2px' },
  { id: 'medium', value: 4, label: '4px' },
  { id: 'large', value: 6, label: '6px' },
  { id: 'xlarge', value: 10, label: '10px' },
];

// =============================================================================
// Component
// =============================================================================

export function DevModeCommandBar() {
  const { state, dispatch, setMode, toggleEnabled, removeLastAnnotation, clearSession, exportSpecs } = useDevMode();
  const { isEnabled, currentMode, isPanelOpen, specs, annotations, isRecording } = state;

  const [isHovering, setIsHovering] = useState(false);
  const [selectedTool, setSelectedTool] = useState('arrow');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [strokeSize, setStrokeSize] = useState(STROKE_SIZES[1]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const barRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
        setShowSizePicker(false);
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pause element selection when hovering over command bar
  useEffect(() => {
    if (isHovering) {
      document.body.setAttribute('data-devmode-paused', 'true');
    } else {
      document.body.removeAttribute('data-devmode-paused');
    }
  }, [isHovering]);

  if (!isEnabled) {
    return null;
  }

  const handleModeChange = (mode: DevModeMode) => {
    if (isRecording && mode !== 'record') {
      // Don't allow mode change while recording
      return;
    }
    setMode(mode);
  };

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);

    const toolMapping: Record<string, AnnotationTool> = {
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

    dispatch({ type: 'SET_ANNOTATION_TOOL', payload: toolMapping[toolId] });
    dispatch({
      type: 'SET_ANNOTATION_CONFIG',
      payload: {
        extendedTool: toolId as any,
        color: selectedColor.value,
        strokeSize: strokeSize.value,
      }
    });
  };

  const handleColorSelect = (color: typeof COLORS[0]) => {
    setSelectedColor(color);
    setShowColorPicker(false);
    dispatch({ type: 'SET_ANNOTATION_CONFIG', payload: { color: color.value } });
  };

  const handleExport = async (format: 'markdown' | 'json') => {
    await exportSpecs({
      format,
      includeScreenshots: true,
      includeAnnotations: true,
      includeRecordingData: true,
    });
    setShowExportMenu(false);
  };

  const handleClear = () => {
    if (confirm('Clear all specs and annotations?')) {
      clearSession();
    }
  };

  const togglePanel = () => {
    dispatch({ type: 'SET_PANEL_OPEN', payload: !isPanelOpen });
  };

  const currentModeConfig = MODES.find(m => m.id === currentMode);

  return (
    <div
      ref={barRef}
      data-devmode-panel
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100003,
        animation: 'slideDown 0.2s ease-out',
      }}
    >
      {/* Main Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: 'rgba(15, 23, 42, 0.98)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #334155',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}>

        {/* Left Section: Logo + Mode Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* DevMode Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingRight: '16px',
            borderRight: '1px solid #334155',
          }}>
            <span style={{ fontSize: '18px' }}>🛠️</span>
            <span style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>DevMode</span>
            {isRecording && (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                backgroundColor: '#dc2626',
                borderRadius: '4px',
                fontSize: '11px',
                color: 'white',
                fontWeight: 500,
                animation: 'pulse 1s infinite',
              }}>
                <Circle style={{ width: '8px', height: '8px', fill: 'currentColor' }} />
                REC
              </span>
            )}
          </div>

          {/* Mode Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = currentMode === mode.id;
              const isDisabled = isRecording && mode.id !== 'record';

              return (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  disabled={isDisabled}
                  title={`${mode.label} (${mode.shortcut}) - ${mode.description}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    backgroundColor: isActive ? '#2563eb' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: isActive ? 'white' : '#94a3b8',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                    transition: 'all 0.15s',
                    fontSize: '13px',
                    fontWeight: isActive ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive && !isDisabled) {
                      e.currentTarget.style.backgroundColor = '#1e293b';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#94a3b8';
                    }
                  }}
                >
                  <Icon style={{ width: '16px', height: '16px' }} />
                  <span>{mode.label}</span>
                  <kbd style={{
                    padding: '2px 5px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#1e293b',
                    borderRadius: '3px',
                    fontSize: '10px',
                    color: isActive ? 'white' : '#64748b',
                  }}>
                    {mode.shortcut}
                  </kbd>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Section: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Stats */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '0 12px',
            borderRight: '1px solid #334155',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: '14px' }}>{specs.length}</span>
              <span style={{ color: '#64748b', fontSize: '12px' }}>specs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#10b981', fontWeight: 600, fontSize: '14px' }}>{annotations.length}</span>
              <span style={{ color: '#64748b', fontSize: '12px' }}>notes</span>
            </div>
          </div>

          {/* Toggle Panel */}
          <button
            onClick={togglePanel}
            title={isPanelOpen ? 'Hide Panel' : 'Show Panel'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: isPanelOpen ? '#1e293b' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontSize: '13px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1e293b';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isPanelOpen ? '#1e293b' : 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <PanelRight style={{ width: '16px', height: '16px' }} />
            Panel
          </button>

          {/* Export Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={specs.length === 0 && annotations.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: specs.length === 0 && annotations.length === 0 ? '#475569' : '#94a3b8',
                cursor: specs.length === 0 && annotations.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                fontSize: '13px',
              }}
              onMouseEnter={(e) => {
                if (specs.length > 0 || annotations.length > 0) {
                  e.currentTarget.style.backgroundColor = '#1e293b';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = specs.length === 0 && annotations.length === 0 ? '#475569' : '#94a3b8';
              }}
            >
              <Download style={{ width: '16px', height: '16px' }} />
              Export
              <ChevronDown style={{ width: '12px', height: '12px' }} />
            </button>

            {showExportMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                padding: '4px',
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                border: '1px solid #334155',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                minWidth: '160px',
                zIndex: 10,
              }}>
                <button
                  onClick={() => handleExport('markdown')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <FileText style={{ width: '14px', height: '14px' }} />
                  Markdown
                </button>
                <button
                  onClick={() => handleExport('json')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    fontSize: '13px',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Copy style={{ width: '14px', height: '14px' }} />
                  JSON
                </button>
              </div>
            )}
          </div>

          {/* Clear */}
          <button
            onClick={handleClear}
            disabled={specs.length === 0 && annotations.length === 0}
            title="Clear all"
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: specs.length === 0 && annotations.length === 0 ? '#475569' : '#94a3b8',
              cursor: specs.length === 0 && annotations.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (specs.length > 0 || annotations.length > 0) {
                e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.2)';
                e.currentTarget.style.color = '#f87171';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = specs.length === 0 && annotations.length === 0 ? '#475569' : '#94a3b8';
            }}
          >
            <Trash2 style={{ width: '16px', height: '16px' }} />
          </button>

          {/* Close DevMode */}
          <button
            onClick={toggleEnabled}
            title="Close DevMode (⌘⇧D)"
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1e293b';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>
      </div>

      {/* Tool Bar - Shows contextual tools based on mode */}
      {currentMode === 'annotate' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          borderBottom: '1px solid #334155',
        }}>
          {/* Annotation Tools */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '4px',
            backgroundColor: '#0f172a',
            borderRadius: '8px',
          }}>
            {ANNOTATION_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = selectedTool === tool.id;

              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
                  style={{
                    padding: '8px',
                    backgroundColor: isActive ? '#2563eb' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: isActive ? 'white' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#1e293b';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
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
          <div style={{ width: '1px', height: '24px', backgroundColor: '#334155' }} />

          {/* Color Picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowSizePicker(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: '#0f172a',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: selectedColor.value,
                border: '2px solid rgba(255,255,255,0.3)',
              }} />
              <ChevronDown style={{ width: '12px', height: '12px', color: '#94a3b8' }} />
            </button>

            {showColorPicker && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                border: '1px solid #334155',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '4px',
                zIndex: 10,
              }}>
                {COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => handleColorSelect(color)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: color.value,
                      border: selectedColor.id === color.id ? '2px solid white' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Size Picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setShowSizePicker(!showSizePicker);
                setShowColorPicker(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                backgroundColor: '#0f172a',
                border: 'none',
                borderRadius: '6px',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {strokeSize.label}
              <ChevronDown style={{ width: '12px', height: '12px', color: '#94a3b8' }} />
            </button>

            {showSizePicker && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '8px',
                padding: '4px',
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                border: '1px solid #334155',
                minWidth: '80px',
                zIndex: 10,
              }}>
                {STROKE_SIZES.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => {
                      setStrokeSize(size);
                      setShowSizePicker(false);
                      dispatch({ type: 'SET_ANNOTATION_CONFIG', payload: { strokeSize: size.value } });
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '4px',
                      color: strokeSize.id === size.id ? '#60a5fa' : '#e2e8f0',
                      cursor: 'pointer',
                      fontSize: '13px',
                      textAlign: 'left',
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
          <div style={{ width: '1px', height: '24px', backgroundColor: '#334155' }} />

          {/* Undo */}
          <button
            onClick={() => removeLastAnnotation()}
            disabled={annotations.length === 0}
            title="Undo (⌘Z)"
            style={{
              padding: '8px',
              backgroundColor: '#0f172a',
              border: 'none',
              borderRadius: '6px',
              color: annotations.length === 0 ? '#475569' : '#94a3b8',
              cursor: annotations.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (annotations.length > 0) {
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = annotations.length === 0 ? '#475569' : '#94a3b8';
            }}
          >
            <Undo style={{ width: '16px', height: '16px' }} />
          </button>

          {/* Clear Annotations */}
          <button
            onClick={() => {
              if (confirm('Clear all annotations?')) {
                dispatch({ type: 'CLEAR_ANNOTATIONS' });
              }
            }}
            disabled={annotations.length === 0}
            title="Clear annotations"
            style={{
              padding: '8px',
              backgroundColor: '#0f172a',
              border: 'none',
              borderRadius: '6px',
              color: annotations.length === 0 ? '#475569' : '#94a3b8',
              cursor: annotations.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (annotations.length > 0) {
                e.currentTarget.style.color = '#f87171';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = annotations.length === 0 ? '#475569' : '#94a3b8';
            }}
          >
            <Trash2 style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      )}

      {/* Record Mode Tools */}
      {currentMode === 'record' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '8px 16px',
          backgroundColor: isRecording ? 'rgba(127, 29, 29, 0.3)' : 'rgba(30, 41, 59, 0.95)',
          borderBottom: '1px solid #334155',
        }}>
          <button
            onClick={() => {
              if (isRecording) {
                dispatch({ type: 'STOP_RECORDING' });
              } else {
                dispatch({ type: 'START_RECORDING' });
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: isRecording ? '#dc2626' : '#16a34a',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            <Circle style={{
              width: '12px',
              height: '12px',
              fill: isRecording ? 'currentColor' : 'none',
            }} />
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>

          {isRecording && state.recordingData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#94a3b8', fontSize: '13px' }}>
              <span>Interactions: <strong style={{ color: 'white' }}>{state.recordingData.interactions.length}</strong></span>
              <span>Errors: <strong style={{ color: state.recordingData.errors.length > 0 ? '#f87171' : 'white' }}>{state.recordingData.errors.length}</strong></span>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
