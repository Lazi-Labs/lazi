// =============================================================================
// LAZI AI - DevMode 2.0 Recording Controls
// =============================================================================
// Panel for controlling interaction recording and viewing stats
// =============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { useDevMode } from '../DevModeProvider';
import { useRecorder } from '../hooks/useRecorder';
import {
  Play,
  Square,
  Camera,
  Clock,
  MousePointer,
  AlertCircle,
  Wifi,
  Activity,
  Download,
  Trash2,
} from 'lucide-react';

export function RecordingControls() {
  const { state, dispatch } = useDevMode();
  const { recordingData } = state;
  const {
    isRecording,
    startRecording,
    stopRecording,
    addScreenshot,
    duration,
  } = useRecorder();

  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second when recording
  useEffect(() => {
    if (!isRecording || !recordingData) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.round(
        (new Date().getTime() - recordingData.startTime.getTime()) / 1000
      );
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, recordingData]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartStop = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleCaptureScreenshot = () => {
    const label = `Screenshot at ${formatTime(elapsedTime)}`;
    addScreenshot(label);
  };

  const handleExportRecording = () => {
    if (!recordingData) return;

    const exportData = {
      startTime: recordingData.startTime.toISOString(),
      endTime: recordingData.endTime?.toISOString() || new Date().toISOString(),
      duration: elapsedTime,
      interactions: recordingData.interactions,
      errors: recordingData.errors,
      networkRequests: recordingData.networkRequests,
      screenshots: recordingData.screenshots.map((s) => ({
        ...s,
        dataUrl: s.dataUrl === 'screenshot-placeholder' ? '[placeholder]' : s.dataUrl,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devmode-recording-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearRecording = () => {
    if (window.confirm('Clear all recording data?')) {
      dispatch({ type: 'CLEAR_RECORDING' });
    }
  };

  const stats = recordingData
    ? {
        interactions: recordingData.interactions.length,
        errors: recordingData.errors.filter((e) => e.type === 'error').length,
        warnings: recordingData.errors.filter((e) => e.type === 'warning').length,
        requests: recordingData.networkRequests.length,
        screenshots: recordingData.screenshots.length,
      }
    : { interactions: 0, errors: 0, warnings: 0, requests: 0, screenshots: 0 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Recording Status */}
      <div
        style={{
          padding: '16px',
          backgroundColor: isRecording ? '#7f1d1d' : '#374151',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        {isRecording ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                  animation: 'pulse 1s ease-in-out infinite',
                }}
              />
              <span style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 500 }}>
                Recording...
              </span>
            </div>
            <div style={{ color: 'white', fontSize: '32px', fontWeight: 600 }}>
              {formatTime(elapsedTime)}
            </div>
          </>
        ) : (
          <>
            <Clock
              style={{
                width: '24px',
                height: '24px',
                color: '#6b7280',
                marginBottom: '8px',
              }}
            />
            <div style={{ color: '#9ca3af', fontSize: '13px' }}>
              Ready to record
            </div>
          </>
        )}
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleStartStop}
          style={{
            flex: 2,
            padding: '12px',
            backgroundColor: isRecording ? '#dc2626' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {isRecording ? (
            <>
              <Square style={{ width: '16px', height: '16px' }} />
              Stop
            </>
          ) : (
            <>
              <Play style={{ width: '16px', height: '16px' }} />
              Start Recording
            </>
          )}
        </button>
        <button
          onClick={handleCaptureScreenshot}
          disabled={!isRecording}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: isRecording ? '#374151' : '#1f2937',
            color: isRecording ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px',
            cursor: isRecording ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '12px',
          }}
          title="Capture Screenshot"
        >
          <Camera style={{ width: '16px', height: '16px' }} />
        </button>
      </div>

      {/* Live Stats */}
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
          {isRecording ? 'Live Stats' : 'Session Stats'}
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
          }}
        >
          <StatCard
            icon={MousePointer}
            label="Interactions"
            value={stats.interactions}
            color="#3b82f6"
          />
          <StatCard
            icon={AlertCircle}
            label="Errors"
            value={stats.errors}
            color="#ef4444"
          />
          <StatCard
            icon={Activity}
            label="Warnings"
            value={stats.warnings}
            color="#f59e0b"
          />
          <StatCard
            icon={Wifi}
            label="Requests"
            value={stats.requests}
            color="#10b981"
          />
        </div>
      </div>

      {/* Screenshots */}
      {stats.screenshots > 0 && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#374151',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'white',
              fontSize: '13px',
            }}
          >
            <Camera style={{ width: '14px', height: '14px' }} />
            {stats.screenshots} screenshot{stats.screenshots !== 1 ? 's' : ''} captured
          </div>
        </div>
      )}

      {/* Export & Clear */}
      {recordingData && !isRecording && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExportRecording}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Download style={{ width: '14px', height: '14px' }} />
            Export Recording
          </button>
          <button
            onClick={handleClearRecording}
            style={{
              padding: '10px 16px',
              backgroundColor: '#374151',
              color: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Trash2 style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !recordingData && (
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
              lineHeight: '1.6',
            }}
          >
            <strong style={{ color: 'white' }}>What gets recorded:</strong>
            <br />
            • User interactions (clicks, inputs, scrolls)
            <br />
            • Console errors and warnings
            <br />
            • Network requests with timing
            <br />
            • Manual screenshots
            <br />
            <br />
            <strong style={{ color: 'white' }}>Tip:</strong> Start recording, then
            reproduce the issue. Stop to review captured data.
          </div>
        </div>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: '#374151',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          backgroundColor: `${color}20`,
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon style={{ width: '16px', height: '16px', color }} />
      </div>
      <div>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 600 }}>
          {value}
        </div>
        <div style={{ color: '#9ca3af', fontSize: '10px' }}>{label}</div>
      </div>
    </div>
  );
}
