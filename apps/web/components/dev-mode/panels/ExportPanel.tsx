// =============================================================================
// LAZI AI - DevMode 2.0 Export Panel
// =============================================================================
// Panel for exporting DevMode data in various formats
// =============================================================================

'use client';

import React, { useState } from 'react';
import { useDevMode } from '../DevModeProvider';
import {
  ExportFormat,
  downloadExport,
  copyToClipboard,
  buildExportData,
} from '../utils/exportUtils';
import {
  Download,
  Copy,
  FileJson,
  FileText,
  Code,
  Wind,
  Check,
  Settings,
} from 'lucide-react';

const EXPORT_FORMATS: {
  id: ExportFormat;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    id: 'json',
    label: 'JSON',
    icon: FileJson,
    description: 'Raw data for programmatic use',
  },
  {
    id: 'markdown',
    label: 'Markdown',
    icon: FileText,
    description: 'Human-readable documentation',
  },
  {
    id: 'html',
    label: 'HTML Report',
    icon: Code,
    description: 'Styled report for sharing',
  },
  {
    id: 'windsurf',
    label: 'Windsurf Prompt',
    icon: Wind,
    description: 'AI-ready implementation prompt',
  },
];

export function ExportPanel() {
  const { state } = useDevMode();
  const { specs, annotations, recordingData } = state;

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('windsurf');
  const [options, setOptions] = useState({
    includeSpecs: true,
    includeAnnotations: true,
    includeRecording: true,
    includeScreenshots: false,
  });
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleCopy = async () => {
    const data = buildExportData(specs, annotations, recordingData, options);
    const success = await copyToClipboard(data, selectedFormat);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const data = buildExportData(specs, annotations, recordingData, options);
    downloadExport(data, selectedFormat);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const hasData = specs.length > 0 || annotations.length > 0 || recordingData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Download style={{ width: '16px', height: '16px', color: '#10b981' }} />
        <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
          Export Data
        </span>
      </div>

      {/* Data Summary */}
      <div
        style={{
          padding: '12px',
          backgroundColor: '#374151',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            color: '#9ca3af',
            fontSize: '11px',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Available Data
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <DataStat label="Specs" value={specs.length} />
          <DataStat label="Annotations" value={annotations.length} />
          <DataStat
            label="Recording"
            value={recordingData ? 'Yes' : 'No'}
          />
        </div>
      </div>

      {/* Format Selection */}
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
          Export Format
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {EXPORT_FORMATS.map((format) => {
            const Icon = format.icon;
            const isSelected = selectedFormat === format.id;
            return (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: isSelected ? '#1d4ed8' : '#374151',
                  border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <Icon
                  style={{
                    width: '20px',
                    height: '20px',
                    color: isSelected ? 'white' : '#9ca3af',
                  }}
                />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '13px' }}>
                    {format.label}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '11px' }}>
                    {format.description}
                  </div>
                </div>
                {isSelected && (
                  <Check
                    style={{
                      width: '16px',
                      height: '16px',
                      marginLeft: 'auto',
                      color: '#10b981',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Export Options */}
      <div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#9ca3af',
            fontSize: '11px',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          <Settings style={{ width: '12px', height: '12px' }} />
          Options
        </label>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            backgroundColor: '#374151',
            borderRadius: '8px',
          }}
        >
          <CheckboxOption
            label="Include element specs"
            checked={options.includeSpecs}
            onChange={(checked) =>
              setOptions((prev) => ({ ...prev, includeSpecs: checked }))
            }
            disabled={specs.length === 0}
          />
          <CheckboxOption
            label="Include annotations"
            checked={options.includeAnnotations}
            onChange={(checked) =>
              setOptions((prev) => ({ ...prev, includeAnnotations: checked }))
            }
            disabled={annotations.length === 0}
          />
          <CheckboxOption
            label="Include recording data"
            checked={options.includeRecording}
            onChange={(checked) =>
              setOptions((prev) => ({ ...prev, includeRecording: checked }))
            }
            disabled={!recordingData}
          />
          <CheckboxOption
            label="Include screenshots"
            checked={options.includeScreenshots}
            onChange={(checked) =>
              setOptions((prev) => ({ ...prev, includeScreenshots: checked }))
            }
            disabled={!recordingData || !recordingData.screenshots.length}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleCopy}
          disabled={!hasData}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: copied ? '#10b981' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: hasData ? 'pointer' : 'not-allowed',
            opacity: hasData ? 1 : 0.5,
            fontWeight: 500,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          {copied ? (
            <>
              <Check style={{ width: '16px', height: '16px' }} />
              Copied!
            </>
          ) : (
            <>
              <Copy style={{ width: '16px', height: '16px' }} />
              Copy
            </>
          )}
        </button>
        <button
          onClick={handleDownload}
          disabled={!hasData}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: downloaded ? '#10b981' : '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: hasData ? 'pointer' : 'not-allowed',
            opacity: hasData ? 1 : 0.5,
            fontWeight: 500,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
        >
          {downloaded ? (
            <>
              <Check style={{ width: '16px', height: '16px' }} />
              Downloaded!
            </>
          ) : (
            <>
              <Download style={{ width: '16px', height: '16px' }} />
              Download
            </>
          )}
        </button>
      </div>

      {/* Help Text */}
      {!hasData && (
        <div
          style={{
            textAlign: 'center',
            padding: '16px',
            color: '#6b7280',
            fontSize: '12px',
          }}
        >
          No data to export. Start by inspecting elements, adding annotations, or
          recording a session.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function DataStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color: 'white', fontSize: '18px', fontWeight: 600 }}>
        {value}
      </div>
      <div style={{ color: '#6b7280', fontSize: '10px' }}>{label}</div>
    </div>
  );
}

function CheckboxOption({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked && !disabled}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        style={{
          width: '16px',
          height: '16px',
          accentColor: '#3b82f6',
        }}
      />
      <span style={{ color: '#e5e7eb', fontSize: '12px' }}>{label}</span>
    </label>
  );
}
