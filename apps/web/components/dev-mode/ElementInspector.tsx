// =============================================================================
// LAZI AI - DevMode 2.0 Element Inspector
// =============================================================================
// Enhanced element inspection overlay for inspect mode
// =============================================================================

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDevMode } from './DevModeProvider';
import {
  findMeaningfulElement,
  getElementLabel,
  extractElementInfo,
  isDevModeElement,
} from './utils/elementUtils';

interface HighlightBox {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
}

export function ElementInspector() {
  const { state, selectElement, addSpec, dispatch } = useDevMode();
  const { isEnabled, currentMode, selectedElement } = state;

  const [highlight, setHighlight] = useState<HighlightBox | null>(null);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const isInspecting = isEnabled && currentMode === 'inspect';

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isInspecting) return;

      // Check if DevMode is paused (user interacting with command bar)
      if (document.body.hasAttribute('data-devmode-paused')) {
        setHighlight(null);
        setHoveredElement(null);
        return;
      }

      // Get element under cursor, ignoring our overlay
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const target = elements.find(
        (el) =>
          !isDevModeElement(el as HTMLElement) &&
          el !== document.body &&
          el !== document.documentElement
      ) as HTMLElement | undefined;

      if (!target) {
        setHighlight(null);
        setHoveredElement(null);
        return;
      }

      // Find the most meaningful element (button, link, input, etc.)
      const meaningfulElement = findMeaningfulElement(target);

      if (meaningfulElement !== hoveredElement) {
        setHoveredElement(meaningfulElement);

        const rect = meaningfulElement.getBoundingClientRect();
        setHighlight({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
          label: getElementLabel(meaningfulElement),
        });
      }
    },
    [isInspecting, hoveredElement]
  );

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!isInspecting || !hoveredElement) return;

      // Check if DevMode is paused (user interacting with command bar)
      if (document.body.hasAttribute('data-devmode-paused')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Extract element info and select it
      const elementInfo = extractElementInfo(hoveredElement);
      selectElement(elementInfo);

      // Auto-create a draft spec
      addSpec({
        elementInfo,
        behaviorType: 'custom',
        description: '',
        priority: 'medium',
        status: 'draft',
        annotations: [],
        page: window.location.pathname,
      });

      // Open the panel
      dispatch({ type: 'SET_PANEL_OPEN', payload: true });

      setHighlight(null);
      setHoveredElement(null);
    },
    [isInspecting, hoveredElement, selectElement, addSpec, dispatch]
  );

  useEffect(() => {
    if (!isEnabled || !isInspecting) {
      setHighlight(null);
      setHoveredElement(null);
      return;
    }

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);

    // Add cursor style to body
    document.body.style.cursor = 'crosshair';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.body.style.cursor = '';
    };
  }, [isEnabled, isInspecting, handleMouseMove, handleClick]);

  if (!isEnabled || !isInspecting) return null;

  return (
    <>
      {/* Full screen overlay to capture events */}
      <div
        data-dev-mode-overlay
        ref={overlayRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          cursor: 'crosshair',
          pointerEvents: 'none',
        }}
      />

      {/* Highlight box */}
      {highlight && (
        <div
          data-dev-mode-overlay
          style={{
            position: 'absolute',
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            border: '2px solid #3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            pointerEvents: 'none',
            zIndex: 99999,
            transition: 'all 0.1s ease-out',
          }}
        >
          {/* Label */}
          <div
            style={{
              position: 'absolute',
              top: -24,
              left: -2,
              backgroundColor: '#3b82f6',
              color: 'white',
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '2px 6px',
              borderRadius: '3px 3px 0 0',
              whiteSpace: 'nowrap',
              maxWidth: '300px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {highlight.label}
          </div>

          {/* Click instruction */}
          <div
            style={{
              position: 'absolute',
              bottom: -20,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#1f2937',
              color: 'white',
              fontSize: '10px',
              padding: '2px 8px',
              borderRadius: '3px',
              whiteSpace: 'nowrap',
            }}
          >
            Click to configure
          </div>
        </div>
      )}

      {/* Selected element highlight (persistent) */}
      {selectedElement && selectedElement.element && (
        <div
          data-dev-mode-overlay
          style={{
            position: 'absolute',
            top:
              selectedElement.boundingRect.top + window.scrollY,
            left:
              selectedElement.boundingRect.left + window.scrollX,
            width: selectedElement.boundingRect.width,
            height: selectedElement.boundingRect.height,
            border: '2px solid #10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            pointerEvents: 'none',
            zIndex: 99997,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -24,
              left: -2,
              backgroundColor: '#10b981',
              color: 'white',
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '2px 6px',
              borderRadius: '3px 3px 0 0',
              whiteSpace: 'nowrap',
            }}
          >
            Selected
          </div>
        </div>
      )}

      {/* Instructions banner */}
      <div
        data-dev-mode-overlay
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#3b82f6',
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
        }}
      >
        <span>🎯 Inspect Mode</span>
        <span style={{ opacity: 0.8 }}>
          Click any element to configure its behavior
        </span>
        <span style={{ opacity: 0.6, fontSize: '11px' }}>
          Press ESC to cancel
        </span>
      </div>
    </>
  );
}
