// =============================================================================
// LAZI AI - DevMode 2.0 Index
// =============================================================================
// Central exports for the DevMode module
// =============================================================================

// Main components
export { DevMode, ViewSpecsButton } from './DevMode';
export { DevModeProvider, useDevMode } from './DevModeProvider';
export { ElementInspector } from './ElementInspector';
export { DevModeToolbar } from './DevModeToolbar';
export { KeyboardShortcutsHandler } from './KeyboardShortcutsHandler';

// Mode components
export { AddMode } from './modes/AddMode';
export { AnnotateMode } from './modes/AnnotateMode';
export { RecordMode } from './modes/RecordMode';

// Panel components
export { DevModePanel } from './panels/DevModePanel';
export { DevModeCommandBar } from './panels/DevModeCommandBar';
export { ElementPalette } from './panels/ElementPalette';
export { DatabaseBrowser } from './panels/DatabaseBrowser';
export { QuickActionPrompts } from './panels/QuickActionPrompts';
export { AnnotationToolbar } from './panels/AnnotationToolbar';
export { FloatingAnnotationToolbar } from './panels/FloatingAnnotationToolbar';
export { RecordingControls } from './panels/RecordingControls';
export { ExportPanel } from './panels/ExportPanel';

// Canvas components
export { AddModeOverlay } from './canvas/AddModeOverlay';
export { AnnotationCanvas } from './canvas/AnnotationCanvas';

// Hooks
export { useDatabaseSchema } from './hooks/useDatabaseSchema';
export { useRecorder } from './hooks/useRecorder';
export { useKeyboardShortcuts, KEYBOARD_SHORTCUTS, formatShortcut } from './hooks/useKeyboardShortcuts';

// Legacy exports (for backwards compatibility)
export { SpecsPanel } from './SpecsPanel';
export { ConfigModal } from './ConfigModal';

// Types
export type {
  DevModeState,
  DevModeMode,
  DevModeAction,
  DevModeContextValue,
  SelectedElement,
  ElementSpec,
  Annotation,
  AnnotationType,
  AnnotationTool,
  ExtendedAnnotationTool,
  AnnotationConfig,
  RecordingData,
  DataBinding,
  ColumnBinding,
  ExportOptions,
  ExportData,
  BehaviorType,
  Point,
  PromptTemplate,
  InteractionEvent,
  ConsoleError,
  NetworkRequest,
  Screenshot,
} from './types/devmode.types';

// Utilities
export {
  generateId,
  generateSelector,
  detectElementType,
  getElementLocation,
  getElementLabel,
  findMeaningfulElement,
  extractElementInfo,
  isDevModeElement,
} from './utils/elementUtils';

export {
  PROMPT_TEMPLATES,
  fillTemplate,
  getTemplatesByCategory,
  getTemplateById,
  generateContextualPrompt,
} from './utils/promptTemplates';

export {
  exportToJSON,
  exportToMarkdown,
  exportToHTML,
  exportToWindsurf,
  downloadExport,
  copyToClipboard,
  buildExportData,
} from './utils/exportUtils';

export type { ExportFormat } from './utils/exportUtils';

// Constants
export {
  ANNOTATION_COLORS,
  PRIORITY_COLORS,
  STATUS_COLORS,
} from './types/devmode.types';
