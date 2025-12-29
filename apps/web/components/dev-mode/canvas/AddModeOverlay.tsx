// =============================================================================
// LAZI AI - DevMode 2.0 Add Mode Overlay
// =============================================================================
// Visual overlay for Add mode showing crosshair cursor and click position
// =============================================================================

'use client';

import React from 'react';
import { Point } from '../types/devmode.types';
import { Plus } from 'lucide-react';

interface AddModeOverlayProps {
  clickPosition: Point | null;
  targetContainer: string | null;
}

export function AddModeOverlay({ clickPosition, targetContainer }: AddModeOverlayProps) {
  return (
    <>
      {/* Click position marker */}
      {clickPosition && (
        <div
          data-dev-mode-overlay
          style={{
            position: 'fixed',
            left: clickPosition.x - 12,
            top: clickPosition.y - 12,
            pointerEvents: 'none',
            zIndex: 99999,
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.3)',
              border: '2px solid #3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 1s infinite',
            }}
          >
            <Plus style={{ width: '12px', height: '12px', color: '#3b82f6' }} />
          </div>
        </div>
      )}

      {/* Instructions overlay */}
      <div
        data-dev-mode-overlay
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99998,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '0 0 8px 8px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Plus style={{ width: '16px', height: '16px' }} />
          <span>Add Mode</span>
          <span style={{ opacity: 0.8 }}>Click anywhere to add an element</span>
        </div>
      </div>

      {/* Target container indicator */}
      {targetContainer && (
        <div
          data-dev-mode-overlay
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1f2937',
            color: '#9ca3af',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            fontFamily: 'monospace',
            maxWidth: '400px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            zIndex: 99998,
            pointerEvents: 'none',
          }}
        >
          Container: {targetContainer}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.7;
          }
        }
      `}</style>
    </>
  );
}
