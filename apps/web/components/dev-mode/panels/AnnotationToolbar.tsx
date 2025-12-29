// =============================================================================
// LAZI AI - DevMode 2.0 Annotation Toolbar
// =============================================================================
// Toolbar for selecting annotation tools and types
// =============================================================================

'use client';

import React from 'react';
import { useDevMode } from '../DevModeProvider';
import { AnnotationTool, AnnotationType, ANNOTATION_COLORS } from '../types/devmode.types';
import {
  ArrowUpRight,
  Square,
  Pencil,
  Type,
  Circle,
  Undo,
  Trash2,
  Bug,
  Lightbulb,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

const TOOLS: { id: AnnotationTool; icon: React.ElementType; label: string }[] = [
  { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'freehand', icon: Pencil, label: 'Freehand' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'marker', icon: Circle, label: 'Marker' },
];

const TYPES: { id: AnnotationType; icon: React.ElementType; label: string }[] = [
  { id: 'bug', icon: Bug, label: 'Bug' },
  { id: 'improvement', icon: Lightbulb, label: 'Improvement' },
  { id: 'feature', icon: Sparkles, label: 'Feature' },
  { id: 'question', icon: HelpCircle, label: 'Question' },
];

export function AnnotationToolbar() {
  const { state, dispatch, removeLastAnnotation } = useDevMode();
  const { activeAnnotationTool, activeAnnotationType, annotations } = state;

  const setTool = (tool: AnnotationTool) => {
    dispatch({ type: 'SET_ANNOTATION_TOOL', payload: tool });
  };

  const setType = (type: AnnotationType) => {
    dispatch({ type: 'SET_ANNOTATION_TYPE', payload: type });
  };

  const clearAllAnnotations = () => {
    if (annotations.length === 0) return;
    if (window.confirm(`Clear all ${annotations.length} annotations?`)) {
      dispatch({ type: 'CLEAR_ANNOTATIONS' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Tool Selection */}
      <div>
        <label
          style={{
            display: 'block',
            color: '#9ca3af',
            fontSize: '11px',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Drawing Tool
        </label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeAnnotationTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setTool(tool.id)}
                title={tool.label}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  backgroundColor: isActive ? '#3b82f6' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  color: isActive ? 'white' : '#9ca3af',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                }}
              >
                <Icon style={{ width: '16px', height: '16px' }} />
                <span style={{ fontSize: '9px' }}>{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Annotation Type */}
      <div>
        <label
          style={{
            display: 'block',
            color: '#9ca3af',
            fontSize: '11px',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Annotation Type
        </label>
        <div style={{ display: 'flex', gap: '4px' }}>
          {TYPES.map((type) => {
            const Icon = type.icon;
            const isActive = activeAnnotationType === type.id;
            const color = ANNOTATION_COLORS[type.id];
            return (
              <button
                key={type.id}
                onClick={() => setType(type.id)}
                title={type.label}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  backgroundColor: isActive ? color : '#374151',
                  border: isActive ? 'none' : `2px solid ${color}`,
                  borderRadius: '6px',
                  color: isActive ? 'white' : color,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                }}
              >
                <Icon style={{ width: '16px', height: '16px' }} />
                <span style={{ fontSize: '9px' }}>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Annotations Count */}
      <div
        style={{
          padding: '12px',
          backgroundColor: '#374151',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <div style={{ color: 'white', fontSize: '24px', fontWeight: 600 }}>
          {annotations.length}
        </div>
        <div style={{ color: '#9ca3af', fontSize: '11px' }}>
          Annotation{annotations.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={removeLastAnnotation}
          disabled={annotations.length === 0}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: annotations.length > 0 ? '#374151' : '#1f2937',
            color: annotations.length > 0 ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '6px',
            cursor: annotations.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Undo style={{ width: '14px', height: '14px' }} />
          Undo
        </button>
        <button
          onClick={clearAllAnnotations}
          disabled={annotations.length === 0}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: annotations.length > 0 ? '#374151' : '#1f2937',
            color: annotations.length > 0 ? '#ef4444' : '#6b7280',
            border: 'none',
            borderRadius: '6px',
            cursor: annotations.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <Trash2 style={{ width: '14px', height: '14px' }} />
          Clear All
        </button>
      </div>

      {/* Instructions */}
      <div
        style={{
          padding: '12px',
          backgroundColor: '#111827',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            color: '#9ca3af',
            fontSize: '11px',
            lineHeight: '1.5',
          }}
        >
          <strong style={{ color: 'white' }}>How to use:</strong>
          <br />
          1. Select a tool and annotation type
          <br />
          2. Click and drag on the page to draw
          <br />
          3. For text, click to place a text box
          <br />
          <kbd
            style={{
              backgroundColor: '#374151',
              padding: '1px 4px',
              borderRadius: '3px',
              fontSize: '10px',
            }}
          >
            ⌘Z
          </kbd>{' '}
          to undo last annotation
        </div>
      </div>
    </div>
  );
}
