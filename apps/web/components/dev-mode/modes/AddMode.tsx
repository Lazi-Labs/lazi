// =============================================================================
// LAZI AI - DevMode 2.0 Add Mode
// =============================================================================
// Click anywhere to add new elements with the element palette
// =============================================================================

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDevMode } from '../DevModeProvider';
import { Point } from '../types/devmode.types';
import { ElementPalette } from '../panels/ElementPalette';
import { AddModeOverlay } from '../canvas/AddModeOverlay';
import { generateSelector, isDevModeElement } from '../utils/elementUtils';

export function AddMode() {
  const { state, addSpec, dispatch } = useDevMode();
  const { isEnabled, currentMode } = state;

  const [clickPosition, setClickPosition] = useState<Point | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [targetContainer, setTargetContainer] = useState<string | null>(null);

  const isAddMode = isEnabled && currentMode === 'add';

  const handleCanvasClick = useCallback(
    (e: MouseEvent) => {
      if (!isAddMode) return;

      // Don't capture clicks on the DevMode panel itself
      const target = e.target as HTMLElement;
      if (isDevModeElement(target)) return;

      e.preventDefault();
      e.stopPropagation();

      // Get click position relative to viewport
      const position: Point = {
        x: e.clientX,
        y: e.clientY,
      };

      // Find the container element at this position
      const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
      const container = elementsAtPoint.find((el) => {
        // Skip devmode elements and body/html
        if (isDevModeElement(el as HTMLElement)) return false;
        if (el.tagName === 'BODY' || el.tagName === 'HTML') return false;
        return true;
      });

      if (container) {
        // Generate a selector for the container
        const selector = generateSelector(container as HTMLElement);
        setTargetContainer(selector);
      }

      setClickPosition(position);
      setIsPaletteOpen(true);
    },
    [isAddMode]
  );

  const handleElementSelect = useCallback(
    (elementType: string, config: any) => {
      if (!clickPosition || !targetContainer) return;

      // Create a spec for the new element
      addSpec({
        elementInfo: null, // No existing element
        behaviorType: 'add-element',
        description: `Add ${elementType} element`,
        priority: 'medium',
        status: 'draft',
        annotations: [],
        page: window.location.pathname,
        addElementConfig: {
          elementType,
          position: clickPosition,
          targetContainer,
          config,
        },
      });

      // Open the panel to configure
      dispatch({ type: 'SET_PANEL_OPEN', payload: true });

      setIsPaletteOpen(false);
      setClickPosition(null);
      setTargetContainer(null);
    },
    [clickPosition, targetContainer, addSpec, dispatch]
  );

  const handleClose = useCallback(() => {
    setIsPaletteOpen(false);
    setClickPosition(null);
    setTargetContainer(null);
  }, []);

  // Register click handler when in add mode
  useEffect(() => {
    if (!isAddMode) return;

    document.addEventListener('click', handleCanvasClick, true);

    // Add cursor style to body
    document.body.style.cursor = 'crosshair';
    document.body.setAttribute('data-devmode-add', 'true');

    return () => {
      document.removeEventListener('click', handleCanvasClick, true);
      document.body.style.cursor = '';
      document.body.removeAttribute('data-devmode-add');
    };
  }, [isAddMode, handleCanvasClick]);

  if (!isAddMode) {
    return null;
  }

  return (
    <>
      <AddModeOverlay
        clickPosition={clickPosition}
        targetContainer={targetContainer}
      />

      {isPaletteOpen && clickPosition && (
        <ElementPalette
          position={clickPosition}
          targetContainer={targetContainer || undefined}
          onSelect={handleElementSelect}
          onClose={handleClose}
        />
      )}
    </>
  );
}
