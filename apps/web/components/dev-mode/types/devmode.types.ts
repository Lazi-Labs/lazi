// =============================================================================
// LAZI AI - DevMode 2.0 Types
// =============================================================================
// Complete type definitions for the enhanced DevMode system
// =============================================================================

// Mode types - 'view' is the default passive mode
export type DevModeMode = 'view' | 'inspect' | 'add' | 'connect' | 'annotate' | 'record';

export type AnnotationType = 'bug' | 'improvement' | 'feature' | 'question';

export type AnnotationTool = 'arrow' | 'rectangle' | 'freehand' | 'text' | 'marker';

// Extended annotation tools for the floating toolbar
export type ExtendedAnnotationTool =
  | 'select'
  | 'arrow'
  | 'line'
  | 'rectangle'
  | 'ellipse'
  | 'freehand'
  | 'highlighter'
  | 'text'
  | 'note'
  | 'marker';

// Annotation configuration for drawing settings
export interface AnnotationConfig {
  extendedTool: ExtendedAnnotationTool;
  color: string;
  strokeSize: number;
  fontSize: number;
  fillColor?: string;
  opacity?: number;
}

export type BehaviorType =
  | 'api-call'
  | 'navigate'
  | 'workflow'
  | 'sync-job'
  | 'open-modal'
  | 'custom'
  | 'add-element'
  | 'data-display'
  | 'form-field';

// Core state interface
export interface DevModeState {
  // Core state
  isEnabled: boolean;
  currentMode: DevModeMode;
  isPanelOpen: boolean;
  isPanelCollapsed: boolean;

  // Selection state
  selectedElement: SelectedElement | null;
  hoveredElement: HTMLElement | null;

  // Specs state
  specs: ElementSpec[];
  currentSpec: ElementSpec | null;

  // Annotation state
  annotations: Annotation[];
  activeAnnotationTool: AnnotationTool | null;
  activeAnnotationType: AnnotationType;
  annotationConfig: AnnotationConfig;
  isDrawing: boolean;

  // Recording state
  isRecording: boolean;
  recordingData: RecordingData | null;

  // Database state
  selectedSchema: string | null;
  selectedTable: string | null;
  selectedColumns: string[];

  // UI state
  currentPage: string;
  sessionId: string;
  activeTab: 'config' | 'data' | 'actions' | 'windsurf' | 'prompts' | 'annotate' | 'record' | 'export';
}

// Selected element information
export interface SelectedElement {
  element: HTMLElement;
  selector: string;
  tagName: string;
  className: string;
  id: string;
  textContent: string;
  boundingRect: DOMRect;
  computedStyles: Partial<CSSStyleDeclaration>;
  parentPath: string[];
  attributes: Record<string, string>;
}

// Element specification
export interface ElementSpec {
  id: string;
  elementInfo: SelectedElement | null;
  behaviorType: BehaviorType;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'ready' | 'implemented';
  dataBinding?: DataBinding;
  uiFeedback?: UIFeedback;
  annotations: Annotation[];
  createdAt: Date;
  updatedAt: Date;
  page: string;

  // API Call config (for api-call behavior)
  apiEndpoint?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  apiPayload?: string;

  // Navigation config (for navigate behavior)
  navigateTo?: string;

  // Workflow config (for workflow behavior)
  workflowId?: string;
  workflowName?: string;

  // Sync job config (for sync-job behavior)
  syncJobType?: string;

  // Add element config (for add-element behavior)
  addElementConfig?: AddElementConfig;

  // Windsurf prompt
  windsurfPrompt?: string;
}

// Add element configuration
export interface AddElementConfig {
  elementType: string;
  position: Point;
  targetContainer: string;
  config: Record<string, any>;
}

// Data binding configuration
export interface DataBinding {
  schema: string;
  table: string;
  columns: ColumnBinding[];
  filters?: FilterConfig[];
  sorting?: SortConfig;
  pagination?: PaginationConfig;
}

export interface ColumnBinding {
  columnName: string;
  columnType: string;
  displayAs: 'text' | 'number' | 'currency' | 'date' | 'badge' | 'link' | 'image';
  label?: string;
  format?: string;
  width?: string;
}

export interface FilterConfig {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in';
  value: any;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  pageSize: number;
  showPageNumbers: boolean;
  showTotal: boolean;
}

// Annotation types
export interface Annotation {
  id: string;
  type: AnnotationType;
  tool: AnnotationTool;
  points: Point[];
  text?: string;
  color: string;
  screenshot?: string;
  createdAt: Date;
  specId?: string;
}

export interface Point {
  x: number;
  y: number;
}

// Recording types
export interface RecordingData {
  startTime: Date;
  endTime?: Date;
  interactions: InteractionEvent[];
  consoleErrors: ConsoleError[];
  errors: ConsoleError[]; // Alias for consoleErrors for convenience
  networkRequests: NetworkRequest[];
  screenshots: Screenshot[];
  finalError?: ErrorCapture;
}

export interface InteractionEvent {
  type: 'click' | 'input' | 'scroll' | 'navigation' | 'keydown';
  timestamp: Date;
  target: string;
  value?: string;
  coordinates?: Point;
}

export interface ConsoleError {
  type: 'error' | 'warning' | 'log';
  message: string;
  stack?: string;
  timestamp: Date;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  statusText: string;
  requestBody?: any;
  responseBody?: any;
  duration: number;
  timestamp: Date;
  error?: string;
}

export interface Screenshot {
  dataUrl: string;
  timestamp: Date;
  label?: string;
}

export interface ErrorCapture {
  message: string;
  stack: string;
  componentStack?: string;
  timestamp: Date;
}

// UI Feedback configuration
export interface UIFeedback {
  loadingState: boolean;
  successMessage?: string;
  errorMessage?: string;
  refreshAfter?: boolean;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'email' | 'min' | 'max' | 'pattern' | 'custom';
  value?: string | number;
  message: string;
}

// Quick action prompt templates
export interface PromptTemplate {
  id: string;
  name: string;
  category: 'element' | 'data' | 'page' | 'error';
  template: string;
  variables: string[];
  description?: string;
}

// Database schema types
export interface DatabaseSchema {
  name: string;
  tables: DatabaseTable[];
}

export interface DatabaseTable {
  name: string;
  columnCount: number;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  maxLength: number | null;
}

// Element palette types
export interface ElementOption {
  id: string;
  label: string;
  icon: string;
  category: 'ui' | 'data' | 'action' | 'layout';
  description: string;
  defaultConfig: Record<string, any>;
}

// Export format types
export type ExportFormat = 'markdown' | 'json' | 'zip' | 'html' | 'windsurf';

export interface ExportOptions {
  format: ExportFormat;
  includeScreenshots: boolean;
  includeAnnotations: boolean;
  includeRecordingData: boolean;
  specIds?: string[];
}

// Export data structure
export interface ExportData {
  version: string;
  exportedAt: Date;
  page: string;
  specs: ElementSpec[];
  annotations: Annotation[];
  recording?: {
    startTime: Date;
    endTime?: Date;
    interactions: InteractionEvent[];
    errors: ConsoleError[];
    networkRequests: NetworkRequest[];
    screenshots: Screenshot[];
  };
}

// Action types for reducer
export type DevModeAction =
  | { type: 'TOGGLE_ENABLED' }
  | { type: 'SET_ENABLED'; payload: boolean }
  | { type: 'SET_MODE'; payload: DevModeMode }
  | { type: 'SET_PANEL_OPEN'; payload: boolean }
  | { type: 'SET_PANEL_COLLAPSED'; payload: boolean }
  | { type: 'TOGGLE_PANEL' }
  | { type: 'SET_SELECTED_ELEMENT'; payload: SelectedElement | null }
  | { type: 'DESELECT_ELEMENT' }
  | { type: 'SET_HOVERED_ELEMENT'; payload: HTMLElement | null }
  | { type: 'ADD_SPEC'; payload: ElementSpec }
  | { type: 'UPDATE_SPEC'; payload: { id: string; updates: Partial<ElementSpec> } }
  | { type: 'REMOVE_SPEC'; payload: string }
  | { type: 'SET_CURRENT_SPEC'; payload: ElementSpec | null }
  | { type: 'CLEAR_SPECS' }
  | { type: 'LOAD_SPECS'; payload: ElementSpec[] }
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; updates: Partial<Annotation> } }
  | { type: 'REMOVE_ANNOTATION'; payload: string }
  | { type: 'REMOVE_LAST_ANNOTATION' }
  | { type: 'CLEAR_ANNOTATIONS' }
  | { type: 'SET_ANNOTATION_TOOL'; payload: AnnotationTool | null }
  | { type: 'SET_ANNOTATION_TYPE'; payload: AnnotationType }
  | { type: 'SET_ANNOTATION_CONFIG'; payload: Partial<AnnotationConfig> }
  | { type: 'SET_IS_DRAWING'; payload: boolean }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'UPDATE_RECORDING_DATA'; payload: Partial<RecordingData> }
  | { type: 'ADD_RECORDING_INTERACTION'; payload: InteractionEvent }
  | { type: 'ADD_RECORDING_ERROR'; payload: ConsoleError }
  | { type: 'ADD_RECORDING_REQUEST'; payload: NetworkRequest }
  | { type: 'ADD_RECORDING_SCREENSHOT'; payload: Screenshot }
  | { type: 'CLEAR_RECORDING' }
  | { type: 'SET_SELECTED_SCHEMA'; payload: string | null }
  | { type: 'SET_SELECTED_TABLE'; payload: string | null }
  | { type: 'SET_SELECTED_COLUMNS'; payload: string[] }
  | { type: 'SET_ACTIVE_TAB'; payload: DevModeState['activeTab'] }
  | { type: 'RESET_STATE' };

// Context value type
export interface DevModeContextValue {
  state: DevModeState;
  dispatch: React.Dispatch<DevModeAction>;

  // Convenience methods
  toggleEnabled: () => void;
  setMode: (mode: DevModeMode) => void;
  selectElement: (element: SelectedElement | null) => void;
  addSpec: (spec: Omit<ElementSpec, 'id' | 'createdAt' | 'updatedAt'>) => ElementSpec;
  updateSpec: (id: string, updates: Partial<ElementSpec>) => void;
  removeSpec: (id: string) => void;
  startRecording: () => void;
  stopRecording: () => void;
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'createdAt'>) => void;
  removeLastAnnotation: () => void;
  clearSession: () => void;
  exportSpecs: (options: ExportOptions) => Promise<void>;
}

// Color mappings for annotation types
export const ANNOTATION_COLORS: Record<AnnotationType, string> = {
  bug: '#ef4444',      // red
  improvement: '#3b82f6', // blue
  feature: '#10b981',  // green
  question: '#f59e0b', // amber
};

// Priority colors
export const PRIORITY_COLORS: Record<ElementSpec['priority'], string> = {
  low: '#6b7280',     // gray
  medium: '#3b82f6',  // blue
  high: '#f59e0b',    // amber
  critical: '#ef4444', // red
};

// Status colors
export const STATUS_COLORS: Record<ElementSpec['status'], string> = {
  draft: '#f59e0b',      // amber
  ready: '#3b82f6',      // blue
  implemented: '#10b981', // green
};
