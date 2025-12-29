// =============================================================================
// LAZI AI - DevMode 2.0 Annotate Mode
// =============================================================================
// Main component for annotation mode
// =============================================================================

'use client';

import React from 'react';
import { useDevMode } from '../DevModeProvider';
import { AnnotationCanvas } from '../canvas/AnnotationCanvas';

export function AnnotateMode() {
  const { state } = useDevMode();
  const { isEnabled, currentMode } = state;

  const isAnnotateMode = isEnabled && currentMode === 'annotate';

  if (!isAnnotateMode) {
    return null;
  }

  return <AnnotationCanvas />;
}
