// =============================================================================
// LAZI AI - DevMode 2.0 Record Mode
// =============================================================================
// Main component for recording mode - shows recording indicator overlay
// =============================================================================

'use client';

import React from 'react';
import { useDevMode } from '../DevModeProvider';
import { useRecorder } from '../hooks/useRecorder';

export function RecordMode() {
  const { state } = useDevMode();
  const { isEnabled, currentMode } = state;
  const { isRecording } = useRecorder();

  const isRecordMode = isEnabled && currentMode === 'record';

  // Only show overlay when in record mode and actively recording
  if (!isRecordMode || !isRecording) {
    return null;
  }

  return (
    <>
      {/* Recording Indicator - Top Banner */}
      <div
        data-dev-mode-overlay
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '8px 20px',
          borderRadius: '0 0 8px 8px',
          fontSize: '13px',
          fontWeight: 500,
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '10px',
            height: '10px',
            backgroundColor: 'white',
            borderRadius: '50%',
            animation: 'recordPulse 1s ease-in-out infinite',
          }}
        />
        <span>Recording Session</span>
        <span style={{ opacity: 0.7, fontSize: '11px' }}>
          Interactions are being captured
        </span>
      </div>

      {/* Corner Recording Indicator */}
      <div
        data-dev-mode-overlay
        style={{
          position: 'fixed',
          top: '60px',
          right: '16px',
          backgroundColor: 'rgba(220, 38, 38, 0.9)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 500,
          zIndex: 99997,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            backgroundColor: 'white',
            borderRadius: '50%',
            animation: 'recordPulse 1s ease-in-out infinite',
          }}
        />
        REC
      </div>

      {/* Border Overlay to indicate recording */}
      <div
        data-dev-mode-overlay
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: '3px solid rgba(220, 38, 38, 0.5)',
          pointerEvents: 'none',
          zIndex: 99995,
        }}
      />

      {/* CSS Animation */}
      <style>{`
        @keyframes recordPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
      `}</style>
    </>
  );
}
