// =============================================================================
// LAZI AI - Element Inspector Overlay
// =============================================================================
// This component highlights elements on hover and captures clicks
// Location: src/components/dev-mode/ElementInspector.tsx
// =============================================================================

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDevMode } from './DevModeProvider';

interface HighlightBox {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
}

export function ElementInspector() {
  const { isEnabled, isInspecting, selectElement } = useDevMode();
  const [highlight, setHighlight] = useState<HighlightBox | null>(null);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isInspecting) return;
    
    // Get element under cursor, ignoring our overlay
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const target = elements.find(el => 
      !el.closest('[data-dev-mode-overlay]') && 
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
  }, [isInspecting, hoveredElement]);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!isInspecting || !hoveredElement) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    selectElement(hoveredElement);
    setHighlight(null);
    setHoveredElement(null);
  }, [isInspecting, hoveredElement, selectElement]);

  useEffect(() => {
    if (!isEnabled || !isInspecting) {
      setHighlight(null);
      setHoveredElement(null);
      return;
    }

    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
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
        <span>🎯 Inspector Mode</span>
        <span style={{ opacity: 0.8 }}>Click any element to configure its behavior</span>
        <span style={{ opacity: 0.6, fontSize: '11px' }}>Press ESC to cancel</span>
      </div>
    </>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function findMeaningfulElement(element: HTMLElement): HTMLElement {
  // Walk up the tree to find the most meaningful interactive element
  let current: HTMLElement | null = element;
  
  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const role = current.getAttribute('role');
    
    // Interactive elements
    if (
      tag === 'button' ||
      tag === 'a' ||
      tag === 'input' ||
      tag === 'select' ||
      tag === 'textarea' ||
      role === 'button' ||
      role === 'link' ||
      role === 'menuitem' ||
      role === 'tab' ||
      current.onclick ||
      current.hasAttribute('onclick') ||
      current.classList.contains('cursor-pointer')
    ) {
      return current;
    }
    
    // Container elements that are likely meaningful
    if (
      tag === 'tr' ||
      tag === 'li' ||
      role === 'row' ||
      role === 'listitem' ||
      current.classList.contains('card') ||
      current.hasAttribute('data-clickable')
    ) {
      return current;
    }
    
    current = current.parentElement;
  }
  
  return element;
}

function getElementLabel(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  const type = element.getAttribute('type');
  const text = element.textContent?.trim().slice(0, 30) || '';
  const ariaLabel = element.getAttribute('aria-label');
  const title = element.getAttribute('title');
  const placeholder = element.getAttribute('placeholder');
  const id = element.id;
  const className = element.className?.toString().split(' ')[0];
  
  let label = tag;
  
  if (role) label = role;
  if (tag === 'input' && type) label = `input[${type}]`;
  if (tag === 'button') label = 'button';
  if (tag === 'a') label = 'link';
  
  const identifier = ariaLabel || title || placeholder || text || id || className || '';
  
  if (identifier) {
    label += ` "${identifier.slice(0, 25)}${identifier.length > 25 ? '...' : ''}"`;
  }
  
  return label;
}
