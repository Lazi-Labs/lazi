// =============================================================================
// LAZI AI - DevMode 2.0 Annotation Canvas
// =============================================================================
// SVG overlay for drawing annotations on the page
// =============================================================================

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDevMode } from '../DevModeProvider';
import { Point, Annotation, ANNOTATION_COLORS } from '../types/devmode.types';
import { isDevModeElement } from '../utils/elementUtils';

export function AnnotationCanvas() {
  const { state, addAnnotation, dispatch } = useDevMode();
  const {
    isEnabled,
    currentMode,
    annotations,
    activeAnnotationTool,
    activeAnnotationType,
    isDrawing,
  } = state;

  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [textInput, setTextInput] = useState<{ position: Point; show: boolean }>({
    position: { x: 0, y: 0 },
    show: false,
  });
  const [textValue, setTextValue] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<SVGSVGElement>(null);

  const isAnnotateMode = isEnabled && currentMode === 'annotate';
  const currentColor = activeAnnotationType
    ? ANNOTATION_COLORS[activeAnnotationType]
    : '#3b82f6';

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!isAnnotateMode || !activeAnnotationTool) return;

      const target = e.target as HTMLElement;
      if (isDevModeElement(target)) return;

      e.preventDefault();

      const point: Point = {
        x: e.clientX,
        y: e.clientY,
      };

      if (activeAnnotationTool === 'text') {
        // Show text input at click position
        setTextInput({ position: point, show: true });
        setTextValue('');
        setTimeout(() => textInputRef.current?.focus(), 0);
        return;
      }

      if (activeAnnotationTool === 'marker') {
        // Add marker immediately
        addAnnotation({
          type: activeAnnotationType,
          tool: 'marker',
          points: [point],
          color: currentColor,
        });
        return;
      }

      // Start drawing
      dispatch({ type: 'SET_IS_DRAWING', payload: true });
      setCurrentPoints([point]);
    },
    [isAnnotateMode, activeAnnotationTool, activeAnnotationType, currentColor, addAnnotation, dispatch]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDrawing || !activeAnnotationTool) return;

      const point: Point = {
        x: e.clientX,
        y: e.clientY,
      };

      if (activeAnnotationTool === 'freehand') {
        setCurrentPoints((prev) => [...prev, point]);
      } else {
        // For arrow and rectangle, just update the end point
        setCurrentPoints((prev) => [prev[0], point]);
      }
    },
    [isDrawing, activeAnnotationTool]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentPoints.length < 2) {
      dispatch({ type: 'SET_IS_DRAWING', payload: false });
      setCurrentPoints([]);
      return;
    }

    // Create the annotation
    addAnnotation({
      type: activeAnnotationType,
      tool: activeAnnotationTool!,
      points: currentPoints,
      color: currentColor,
    });

    dispatch({ type: 'SET_IS_DRAWING', payload: false });
    setCurrentPoints([]);
  }, [isDrawing, currentPoints, activeAnnotationType, activeAnnotationTool, currentColor, addAnnotation, dispatch]);

  const handleTextSubmit = useCallback(() => {
    if (!textValue.trim()) {
      setTextInput({ position: { x: 0, y: 0 }, show: false });
      return;
    }

    addAnnotation({
      type: activeAnnotationType,
      tool: 'text',
      points: [textInput.position],
      text: textValue.trim(),
      color: currentColor,
    });

    setTextInput({ position: { x: 0, y: 0 }, show: false });
    setTextValue('');
  }, [textValue, textInput.position, activeAnnotationType, currentColor, addAnnotation]);

  // Event listeners
  useEffect(() => {
    if (!isAnnotateMode) return;

    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
    };
  }, [isAnnotateMode, handleMouseDown, handleMouseMove, handleMouseUp]);

  if (!isAnnotateMode) return null;

  return (
    <>
      {/* SVG Canvas */}
      <svg
        ref={canvasRef}
        data-dev-mode-overlay
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 99996,
        }}
      >
        {/* Render existing annotations */}
        {annotations.map((annotation) => (
          <AnnotationShape key={annotation.id} annotation={annotation} />
        ))}

        {/* Render current drawing */}
        {isDrawing && currentPoints.length > 0 && (
          <AnnotationShape
            annotation={{
              id: 'current',
              type: activeAnnotationType,
              tool: activeAnnotationTool!,
              points: currentPoints,
              color: currentColor,
              createdAt: new Date(),
            }}
            isPreview
          />
        )}
      </svg>

      {/* Text Input Popup */}
      {textInput.show && (
        <div
          data-devmode-panel
          style={{
            position: 'fixed',
            left: textInput.position.x,
            top: textInput.position.y,
            zIndex: 100002,
          }}
        >
          <input
            ref={textInputRef}
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit();
              if (e.key === 'Escape') {
                setTextInput({ position: { x: 0, y: 0 }, show: false });
                setTextValue('');
              }
            }}
            onBlur={handleTextSubmit}
            placeholder="Type annotation..."
            style={{
              padding: '8px 12px',
              backgroundColor: '#1f2937',
              border: `2px solid ${currentColor}`,
              borderRadius: '6px',
              color: 'white',
              fontSize: '13px',
              outline: 'none',
              minWidth: '200px',
            }}
          />
        </div>
      )}

      {/* Instructions Banner */}
      <div
        data-dev-mode-overlay
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: currentColor,
          color: 'white',
          padding: '8px 16px',
          borderRadius: '0 0 8px 8px',
          fontSize: '13px',
          fontWeight: 500,
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
        }}
      >
        <span>✏️ Annotate Mode</span>
        <span style={{ opacity: 0.8 }}>
          {activeAnnotationTool === 'text'
            ? 'Click to add text'
            : activeAnnotationTool === 'marker'
              ? 'Click to place marker'
              : 'Click and drag to draw'}
        </span>
      </div>
    </>
  );
}

// =============================================================================
// Annotation Shape Component
// =============================================================================

interface AnnotationShapeProps {
  annotation: Annotation;
  isPreview?: boolean;
}

function AnnotationShape({ annotation, isPreview }: AnnotationShapeProps) {
  const { tool, points, color, text } = annotation;

  if (points.length === 0) return null;

  const opacity = isPreview ? 0.7 : 1;

  switch (tool) {
    case 'arrow':
      if (points.length < 2) return null;
      const [start, end] = points;
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const arrowLength = 15;
      const arrowAngle = Math.PI / 6;

      return (
        <g opacity={opacity}>
          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <polygon
            points={`
              ${end.x},${end.y}
              ${end.x - arrowLength * Math.cos(angle - arrowAngle)},${end.y - arrowLength * Math.sin(angle - arrowAngle)}
              ${end.x - arrowLength * Math.cos(angle + arrowAngle)},${end.y - arrowLength * Math.sin(angle + arrowAngle)}
            `}
            fill={color}
          />
        </g>
      );

    case 'rectangle':
      if (points.length < 2) return null;
      const [p1, p2] = points;
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const width = Math.abs(p2.x - p1.x);
      const height = Math.abs(p2.y - p1.y);

      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          opacity={opacity}
        />
      );

    case 'freehand':
      if (points.length < 2) return null;
      const pathData = points.reduce((acc, point, i) => {
        return i === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
      }, '');

      return (
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={opacity}
        />
      );

    case 'text':
      const [textPos] = points;
      return (
        <g opacity={opacity}>
          <rect
            x={textPos.x - 4}
            y={textPos.y - 16}
            width={text ? text.length * 8 + 16 : 100}
            height={24}
            fill="#1f2937"
            rx="4"
          />
          <text
            x={textPos.x}
            y={textPos.y}
            fill={color}
            fontSize="14"
            fontFamily="sans-serif"
            fontWeight="500"
          >
            {text || ''}
          </text>
        </g>
      );

    case 'marker':
      const [markerPos] = points;
      return (
        <g opacity={opacity}>
          <circle
            cx={markerPos.x}
            cy={markerPos.y}
            r="12"
            fill={color}
          />
          <text
            x={markerPos.x}
            y={markerPos.y + 4}
            fill="white"
            fontSize="12"
            fontFamily="sans-serif"
            fontWeight="bold"
            textAnchor="middle"
          >
            !
          </text>
        </g>
      );

    default:
      return null;
  }
}
