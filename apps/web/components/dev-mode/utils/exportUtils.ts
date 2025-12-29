// =============================================================================
// LAZI AI - DevMode 2.0 Export Utilities
// =============================================================================
// Functions for exporting DevMode data in various formats
// =============================================================================

import {
  ElementSpec,
  Annotation,
  RecordingData,
  ExportData,
  ConsoleError,
  InteractionEvent,
  NetworkRequest,
  Screenshot,
  ColumnBinding,
} from '../types/devmode.types';

// =============================================================================
// Export Format Types
// =============================================================================

export type ExportFormat = 'json' | 'markdown' | 'html' | 'windsurf';

interface ExportOptions {
  includeSpecs?: boolean;
  includeAnnotations?: boolean;
  includeRecording?: boolean;
  includeScreenshots?: boolean;
  format?: ExportFormat;
}

// =============================================================================
// Main Export Functions
// =============================================================================

export function exportToJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

export function exportToMarkdown(data: ExportData): string {
  let md = `# DevMode Export\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Page:** ${data.page}\n\n`;

  // Specs
  if (data.specs && data.specs.length > 0) {
    md += `## Element Specifications (${data.specs.length})\n\n`;

    data.specs.forEach((spec: ElementSpec, i: number) => {
      md += `### ${i + 1}. ${spec.elementInfo?.tagName || 'Element'}\n\n`;
      md += `- **Selector:** \`${spec.elementInfo?.selector || 'N/A'}\`\n`;
      md += `- **Type:** ${spec.behaviorType || 'Unknown'}\n`;
      md += `- **Priority:** ${spec.priority || 'medium'}\n`;

      if (spec.behaviorType) {
        md += `\n**Behavior:**\n`;
        md += `- Action: ${spec.behaviorType}\n`;
        if (spec.description) {
          md += `- Description: ${spec.description}\n`;
        }
      }

      // Add element location info
      if (spec.addElementConfig) {
        md += `\n**Add Element Location:**\n`;
        md += `- Element Type: ${spec.addElementConfig.elementType}\n`;
        md += `- Position: x=${Math.round(spec.addElementConfig.position.x)}px, y=${Math.round(spec.addElementConfig.position.y)}px\n`;
        md += `- Target Container: \`${spec.addElementConfig.targetContainer}\`\n`;
        if (Object.keys(spec.addElementConfig.config || {}).length > 0) {
          md += `- Config: ${JSON.stringify(spec.addElementConfig.config)}\n`;
        }
      }

      if (spec.dataBinding) {
        md += `\n**Data Binding:**\n`;
        md += `- Schema: ${spec.dataBinding.schema}\n`;
        md += `- Table: ${spec.dataBinding.table}\n`;
        if (spec.dataBinding.columns) {
          md += `- Columns: ${spec.dataBinding.columns.map((c: ColumnBinding) => c.columnName).join(', ')}\n`;
        }
      }

      if (spec.description) {
        md += `\n**Notes:** ${spec.description}\n`;
      }

      md += '\n---\n\n';
    });
  }

  // Annotations
  if (data.annotations && data.annotations.length > 0) {
    md += `## Annotations (${data.annotations.length})\n\n`;

    const byType = groupBy(data.annotations, 'type');

    Object.entries(byType).forEach(([type, annotations]: [string, Annotation[]]) => {
      md += `### ${capitalize(type)} (${annotations.length})\n\n`;
      annotations.forEach((ann: Annotation, i: number) => {
        md += `${i + 1}. **${ann.tool}** at (${ann.points[0]?.x}, ${ann.points[0]?.y})`;
        if (ann.text) {
          md += `: "${ann.text}"`;
        }
        md += '\n';
      });
      md += '\n';
    });
  }

  // Recording
  if (data.recording) {
    md += `## Recording Session\n\n`;
    md += `- **Duration:** ${formatDuration(data.recording.startTime, data.recording.endTime)}\n`;
    md += `- **Interactions:** ${data.recording.interactions?.length || 0}\n`;
    md += `- **Errors:** ${data.recording.errors?.length || 0}\n`;
    md += `- **Network Requests:** ${data.recording.networkRequests?.length || 0}\n\n`;

    // Errors
    if (data.recording.errors && data.recording.errors.length > 0) {
      md += `### Errors\n\n`;
      data.recording.errors.forEach((err: ConsoleError, i: number) => {
        md += `${i + 1}. **${err.type}:** ${err.message}\n`;
        if (err.stack) {
          md += `   \`\`\`\n   ${err.stack.split('\n').slice(0, 3).join('\n   ')}\n   \`\`\`\n`;
        }
      });
      md += '\n';
    }

    // Failed requests
    const failedRequests = data.recording.networkRequests?.filter(
      (r: NetworkRequest) => r.status >= 400 || r.status === 0
    );
    if (failedRequests && failedRequests.length > 0) {
      md += `### Failed Requests\n\n`;
      failedRequests.forEach((req: NetworkRequest, i: number) => {
        md += `${i + 1}. **${req.method}** ${req.url} - ${req.status} ${req.statusText}\n`;
      });
      md += '\n';
    }
  }

  return md;
}

export function exportToWindsurf(data: ExportData): string {
  let prompt = `# Implementation Request from DevMode\n\n`;
  prompt += `**Page:** ${data.page}\n\n`;

  // Specs as implementation tasks
  if (data.specs && data.specs.length > 0) {
    prompt += `## Elements to Implement\n\n`;

    data.specs.forEach((spec: ElementSpec, i: number) => {
      prompt += `### Task ${i + 1}: ${spec.behaviorType || 'Element'}\n\n`;

      // For add-element specs, show location instead of selector
      if (spec.addElementConfig) {
        prompt += `**Add New Element:**\n`;
        prompt += `- Element Type: ${spec.addElementConfig.elementType}\n`;
        prompt += `- Position: x=${Math.round(spec.addElementConfig.position.x)}px, y=${Math.round(spec.addElementConfig.position.y)}px (viewport coordinates)\n`;
        prompt += `- Insert inside: \`${spec.addElementConfig.targetContainer}\`\n`;
        if (Object.keys(spec.addElementConfig.config || {}).length > 0) {
          prompt += `- Default config: ${JSON.stringify(spec.addElementConfig.config)}\n`;
        }
        prompt += '\n';
      } else {
        prompt += `**Selector:** \`${spec.elementInfo?.selector}\`\n\n`;
      }

      if (spec.behaviorType && spec.behaviorType !== 'add-element') {
        prompt += `**Required Behavior:**\n`;
        prompt += `- Action: ${spec.behaviorType}\n`;
        if (spec.apiEndpoint) {
          prompt += `- Endpoint: ${spec.apiEndpoint}\n`;
        }
        if (spec.description) {
          prompt += `- Details: ${spec.description}\n`;
        }
        prompt += '\n';
      }

      if (spec.dataBinding) {
        prompt += `**Data Source:**\n`;
        prompt += `- Connect to: \`${spec.dataBinding.schema}.${spec.dataBinding.table}\`\n`;
        if (spec.dataBinding.columns) {
          prompt += `- Fields: ${spec.dataBinding.columns.map((c: ColumnBinding) => `${c.columnName} (${c.columnType})`).join(', ')}\n`;
        }
        prompt += '\n';
      }

      if (spec.description) {
        prompt += `**Additional Notes:** ${spec.description}\n\n`;
      }
    });
  }

  // Annotations as issues/features
  if (data.annotations && data.annotations.length > 0) {
    const bugs = data.annotations.filter((a: Annotation) => a.type === 'bug');
    const features = data.annotations.filter((a: Annotation) => a.type === 'feature');
    const improvements = data.annotations.filter((a: Annotation) => a.type === 'improvement');

    if (bugs.length > 0) {
      prompt += `## Bugs to Fix\n\n`;
      bugs.forEach((bug: Annotation, i: number) => {
        prompt += `${i + 1}. ${bug.text || 'Issue marked on page'} (at position ${bug.points[0]?.x}, ${bug.points[0]?.y})\n`;
      });
      prompt += '\n';
    }

    if (features.length > 0) {
      prompt += `## Features to Add\n\n`;
      features.forEach((feat: Annotation, i: number) => {
        prompt += `${i + 1}. ${feat.text || 'Feature request marked on page'}\n`;
      });
      prompt += '\n';
    }

    if (improvements.length > 0) {
      prompt += `## Improvements\n\n`;
      improvements.forEach((imp: Annotation, i: number) => {
        prompt += `${i + 1}. ${imp.text || 'Improvement marked on page'}\n`;
      });
      prompt += '\n';
    }
  }

  // Recording errors
  if (data.recording?.errors && data.recording.errors.length > 0) {
    prompt += `## Console Errors to Address\n\n`;
    data.recording.errors
      .filter((e: ConsoleError) => e.type === 'error')
      .forEach((err: ConsoleError, i: number) => {
        prompt += `${i + 1}. \`${err.message}\`\n`;
      });
    prompt += '\n';
  }

  prompt += `---\n\n`;
  prompt += `Please implement the above changes following the existing codebase patterns and conventions.\n`;

  return prompt;
}

export function exportToHTML(data: ExportData): string {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>DevMode Export - ${data.page}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: #111827; color: #e5e7eb; }
    h1 { color: #3b82f6; }
    h2 { color: #60a5fa; border-bottom: 1px solid #374151; padding-bottom: 8px; }
    h3 { color: #93c5fd; }
    code { background: #1f2937; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #1f2937; padding: 16px; border-radius: 8px; overflow-x: auto; }
    .spec { background: #1f2937; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6; }
    .annotation { padding: 8px 0; border-bottom: 1px solid #374151; }
    .error { color: #fca5a5; }
    .warning { color: #fcd34d; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8em; margin-right: 8px; }
    .badge.bug { background: #dc2626; }
    .badge.feature { background: #8b5cf6; }
    .badge.improvement { background: #f59e0b; }
    .badge.question { background: #3b82f6; }
  </style>
</head>
<body>
  <h1>DevMode Export</h1>
  <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
  <p><strong>Page:</strong> ${data.page}</p>
`;

  // Specs
  if (data.specs && data.specs.length > 0) {
    html += `<h2>Element Specifications (${data.specs.length})</h2>`;
    data.specs.forEach((spec: ElementSpec, i: number) => {
      html += `<div class="spec">
        <h3>${i + 1}. ${spec.elementInfo?.tagName || 'Element'}</h3>
        <p><code>${spec.elementInfo?.selector}</code></p>
        <p><strong>Type:</strong> ${spec.behaviorType || 'Unknown'}</p>
        ${spec.behaviorType ? `<p><strong>Action:</strong> ${spec.behaviorType}</p>` : ''}
        ${spec.dataBinding ? `<p><strong>Data:</strong> ${spec.dataBinding.schema}.${spec.dataBinding.table}</p>` : ''}
        ${spec.description ? `<p><strong>Notes:</strong> ${spec.description}</p>` : ''}
      </div>`;
    });
  }

  // Annotations
  if (data.annotations && data.annotations.length > 0) {
    html += `<h2>Annotations (${data.annotations.length})</h2>`;
    data.annotations.forEach((ann: Annotation) => {
      html += `<div class="annotation">
        <span class="badge ${ann.type}">${ann.type}</span>
        ${ann.text || `${ann.tool} at (${ann.points[0]?.x}, ${ann.points[0]?.y})`}
      </div>`;
    });
  }

  // Recording
  if (data.recording) {
    html += `<h2>Recording Session</h2>`;
    html += `<p><strong>Duration:</strong> ${formatDuration(data.recording.startTime, data.recording.endTime)}</p>`;

    if (data.recording.errors && data.recording.errors.length > 0) {
      html += `<h3>Errors</h3><ul>`;
      data.recording.errors.forEach((err: ConsoleError) => {
        html += `<li class="${err.type}">${err.message}</li>`;
      });
      html += `</ul>`;
    }
  }

  html += `</body></html>`;
  return html;
}

// =============================================================================
// Download Helper
// =============================================================================

export function downloadExport(
  data: ExportData,
  format: ExportFormat = 'json'
): void {
  let content: string;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'markdown':
      content = exportToMarkdown(data);
      mimeType = 'text/markdown';
      extension = 'md';
      break;
    case 'html':
      content = exportToHTML(data);
      mimeType = 'text/html';
      extension = 'html';
      break;
    case 'windsurf':
      content = exportToWindsurf(data);
      mimeType = 'text/markdown';
      extension = 'md';
      break;
    default:
      content = exportToJSON(data);
      mimeType = 'application/json';
      extension = 'json';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `devmode-export-${new Date().toISOString().slice(0, 10)}.${extension}`;
  a.click();
  URL.revokeObjectURL(url);
}

// =============================================================================
// Clipboard Helper
// =============================================================================

export async function copyToClipboard(data: ExportData, format: ExportFormat = 'windsurf'): Promise<boolean> {
  let content: string;

  switch (format) {
    case 'markdown':
      content = exportToMarkdown(data);
      break;
    case 'windsurf':
      content = exportToWindsurf(data);
      break;
    default:
      content = exportToJSON(data);
  }

  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDuration(start: Date, end?: Date): string {
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();
  const seconds = Math.round((endTime - startTime) / 1000);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

// =============================================================================
// Build Export Data from State
// =============================================================================

export function buildExportData(
  specs: ElementSpec[],
  annotations: Annotation[],
  recording: RecordingData | null,
  options: ExportOptions = {}
): ExportData {
  const data: ExportData = {
    version: '2.0',
    exportedAt: new Date(),
    page: typeof window !== 'undefined' ? window.location.pathname : '',
    specs: options.includeSpecs !== false ? specs : [],
    annotations: options.includeAnnotations !== false ? annotations : [],
  };

  if (recording && options.includeRecording !== false) {
    data.recording = {
      startTime: recording.startTime,
      endTime: recording.endTime,
      interactions: recording.interactions,
      errors: recording.errors,
      networkRequests: recording.networkRequests,
      screenshots: options.includeScreenshots !== false ? recording.screenshots : [],
    };
  }

  return data;
}
