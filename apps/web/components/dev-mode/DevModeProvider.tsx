// =============================================================================
// LAZI AI - DevMode 2.0 Provider
// =============================================================================
// Enhanced context provider with multi-mode support and full state management
// =============================================================================

'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  DevModeState,
  DevModeMode,
  DevModeAction,
  DevModeContextValue,
  SelectedElement,
  ElementSpec,
  Annotation,
  RecordingData,
  InteractionEvent,
  ConsoleError,
  NetworkRequest,
  Screenshot,
  ExportOptions,
  AnnotationType,
  AnnotationTool,
} from './types/devmode.types';
import { generateId } from './utils/elementUtils';

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'lazi-devmode-2.0-specs';

// =============================================================================
// Initial State
// =============================================================================

const createInitialState = (): DevModeState => ({
  isEnabled: false,
  currentMode: 'view',
  isPanelOpen: false,
  isPanelCollapsed: false,
  selectedElement: null,
  hoveredElement: null,
  specs: [],
  currentSpec: null,
  annotations: [],
  activeAnnotationTool: null,
  activeAnnotationType: 'bug',
  annotationConfig: {
    extendedTool: 'arrow',
    color: '#ef4444',
    strokeSize: 4,
    fontSize: 16,
  },
  isDrawing: false,
  isRecording: false,
  recordingData: null,
  selectedSchema: null,
  selectedTable: null,
  selectedColumns: [],
  currentPage: typeof window !== 'undefined' ? window.location.pathname : '',
  sessionId: generateId(),
  activeTab: 'config',
});

// =============================================================================
// Reducer
// =============================================================================

function devModeReducer(state: DevModeState, action: DevModeAction): DevModeState {
  switch (action.type) {
    case 'TOGGLE_ENABLED':
      return {
        ...state,
        isEnabled: !state.isEnabled,
        isPanelOpen: !state.isEnabled ? true : state.isPanelOpen,
      };

    case 'SET_ENABLED':
      return { ...state, isEnabled: action.payload };

    case 'SET_MODE':
      return {
        ...state,
        currentMode: action.payload,
        selectedElement: null,
        hoveredElement: null,
        activeAnnotationTool: action.payload === 'annotate' ? 'arrow' : null,
        isDrawing: false,
      };

    case 'SET_PANEL_OPEN':
      return { ...state, isPanelOpen: action.payload };

    case 'SET_PANEL_COLLAPSED':
      return { ...state, isPanelCollapsed: action.payload };

    case 'TOGGLE_PANEL':
      return { ...state, isPanelOpen: !state.isPanelOpen };

    case 'SET_SELECTED_ELEMENT':
      return { ...state, selectedElement: action.payload };

    case 'DESELECT_ELEMENT':
      return { ...state, selectedElement: null, currentSpec: null };

    case 'SET_HOVERED_ELEMENT':
      return { ...state, hoveredElement: action.payload };

    case 'ADD_SPEC':
      return { ...state, specs: [...state.specs, action.payload] };

    case 'UPDATE_SPEC':
      return {
        ...state,
        specs: state.specs.map((spec) =>
          spec.id === action.payload.id
            ? { ...spec, ...action.payload.updates, updatedAt: new Date() }
            : spec
        ),
        currentSpec:
          state.currentSpec?.id === action.payload.id
            ? { ...state.currentSpec, ...action.payload.updates, updatedAt: new Date() }
            : state.currentSpec,
      };

    case 'REMOVE_SPEC':
      return {
        ...state,
        specs: state.specs.filter((spec) => spec.id !== action.payload),
        currentSpec:
          state.currentSpec?.id === action.payload ? null : state.currentSpec,
      };

    case 'SET_CURRENT_SPEC':
      return { ...state, currentSpec: action.payload };

    case 'CLEAR_SPECS':
      return { ...state, specs: [], currentSpec: null };

    case 'LOAD_SPECS':
      return { ...state, specs: action.payload };

    case 'ADD_ANNOTATION':
      return { ...state, annotations: [...state.annotations, action.payload] };

    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map((ann) =>
          ann.id === action.payload.id
            ? { ...ann, ...action.payload.updates }
            : ann
        ),
      };

    case 'REMOVE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.filter((ann) => ann.id !== action.payload),
      };

    case 'REMOVE_LAST_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.slice(0, -1),
      };

    case 'CLEAR_ANNOTATIONS':
      return { ...state, annotations: [] };

    case 'SET_ANNOTATION_TOOL':
      return { ...state, activeAnnotationTool: action.payload };

    case 'SET_ANNOTATION_TYPE':
      return { ...state, activeAnnotationType: action.payload };

    case 'SET_ANNOTATION_CONFIG':
      return {
        ...state,
        annotationConfig: {
          ...state.annotationConfig,
          ...action.payload,
        },
      };

    case 'SET_IS_DRAWING':
      return { ...state, isDrawing: action.payload };

    case 'START_RECORDING':
      const errors: ConsoleError[] = [];
      return {
        ...state,
        isRecording: true,
        currentMode: 'record',
        recordingData: {
          startTime: new Date(),
          interactions: [],
          consoleErrors: errors,
          errors: errors, // Alias for convenience
          networkRequests: [],
          screenshots: [],
        },
      };

    case 'STOP_RECORDING':
      return {
        ...state,
        isRecording: false,
        recordingData: state.recordingData
          ? { ...state.recordingData, endTime: new Date() }
          : null,
      };

    case 'UPDATE_RECORDING_DATA':
      return {
        ...state,
        recordingData: state.recordingData
          ? { ...state.recordingData, ...action.payload }
          : null,
      };

    case 'ADD_RECORDING_INTERACTION':
      return {
        ...state,
        recordingData: state.recordingData
          ? {
              ...state.recordingData,
              interactions: [...state.recordingData.interactions, action.payload],
            }
          : null,
      };

    case 'ADD_RECORDING_ERROR':
      const newErrors = state.recordingData
        ? [...state.recordingData.consoleErrors, action.payload]
        : [action.payload];
      return {
        ...state,
        recordingData: state.recordingData
          ? {
              ...state.recordingData,
              consoleErrors: newErrors,
              errors: newErrors, // Keep alias in sync
            }
          : null,
      };

    case 'ADD_RECORDING_REQUEST':
      return {
        ...state,
        recordingData: state.recordingData
          ? {
              ...state.recordingData,
              networkRequests: [...state.recordingData.networkRequests, action.payload],
            }
          : null,
      };

    case 'ADD_RECORDING_SCREENSHOT':
      return {
        ...state,
        recordingData: state.recordingData
          ? {
              ...state.recordingData,
              screenshots: [...state.recordingData.screenshots, action.payload],
            }
          : null,
      };

    case 'CLEAR_RECORDING':
      return { ...state, recordingData: null };

    case 'SET_SELECTED_SCHEMA':
      return {
        ...state,
        selectedSchema: action.payload,
        selectedTable: null,
        selectedColumns: [],
      };

    case 'SET_SELECTED_TABLE':
      return {
        ...state,
        selectedTable: action.payload,
        selectedColumns: [],
      };

    case 'SET_SELECTED_COLUMNS':
      return { ...state, selectedColumns: action.payload };

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };

    case 'RESET_STATE':
      return { ...createInitialState(), sessionId: generateId() };

    default:
      return state;
  }
}

// =============================================================================
// Context
// =============================================================================

const DevModeContext = createContext<DevModeContextValue | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

interface DevModeProviderProps {
  children: ReactNode;
  storageKey?: string;
}

export function DevModeProvider({
  children,
  storageKey = STORAGE_KEY,
}: DevModeProviderProps) {
  const [state, dispatch] = useReducer(devModeReducer, null, createInitialState);

  // Load saved specs from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const specs = JSON.parse(saved);
        // Convert date strings back to Date objects
        const parsedSpecs = specs.map((spec: any) => ({
          ...spec,
          createdAt: new Date(spec.createdAt),
          updatedAt: new Date(spec.updatedAt),
          annotations: spec.annotations?.map((ann: any) => ({
            ...ann,
            createdAt: new Date(ann.createdAt),
          })) || [],
        }));
        dispatch({ type: 'LOAD_SPECS', payload: parsedSpecs });
      }
    } catch (e) {
      console.error('Failed to load saved specs:', e);
    }
  }, [storageKey]);

  // Save specs to localStorage when they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (state.specs.length === 0) return;

    try {
      // Strip out non-serializable data (HTMLElement references)
      const serializableSpecs = state.specs.map((spec) => ({
        ...spec,
        elementInfo: spec.elementInfo
          ? {
              ...spec.elementInfo,
              element: null,
              boundingRect: null,
            }
          : null,
      }));
      localStorage.setItem(storageKey, JSON.stringify(serializableSpecs));
    } catch (e) {
      console.error('Failed to save specs:', e);
    }
  }, [state.specs, storageKey]);

  // Update current page on navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRouteChange = () => {
      // Update current page in state
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Keyboard shortcut: Cmd+Shift+D to toggle dev mode
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + D to toggle
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_ENABLED' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // =============================================================================
  // Convenience Methods
  // =============================================================================

  const toggleEnabled = useCallback(() => {
    dispatch({ type: 'TOGGLE_ENABLED' });
  }, []);

  const setMode = useCallback((mode: DevModeMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  }, []);

  const selectElement = useCallback((element: SelectedElement | null) => {
    dispatch({ type: 'SET_SELECTED_ELEMENT', payload: element });
  }, []);

  const addSpec = useCallback(
    (specData: Omit<ElementSpec, 'id' | 'createdAt' | 'updatedAt'>): ElementSpec => {
      const spec: ElementSpec = {
        ...specData,
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dispatch({ type: 'ADD_SPEC', payload: spec });
      dispatch({ type: 'SET_CURRENT_SPEC', payload: spec });
      return spec;
    },
    []
  );

  const updateSpec = useCallback((id: string, updates: Partial<ElementSpec>) => {
    dispatch({ type: 'UPDATE_SPEC', payload: { id, updates } });
  }, []);

  const removeSpec = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_SPEC', payload: id });
  }, []);

  const startRecording = useCallback(() => {
    dispatch({ type: 'START_RECORDING' });
  }, []);

  const stopRecording = useCallback(() => {
    dispatch({ type: 'STOP_RECORDING' });
  }, []);

  const addAnnotation = useCallback(
    (annotationData: Omit<Annotation, 'id' | 'createdAt'>) => {
      const annotation: Annotation = {
        ...annotationData,
        id: generateId(),
        createdAt: new Date(),
      };
      dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
    },
    []
  );

  const removeLastAnnotation = useCallback(() => {
    dispatch({ type: 'REMOVE_LAST_ANNOTATION' });
  }, []);

  const clearSession = useCallback(() => {
    dispatch({ type: 'CLEAR_SPECS' });
    dispatch({ type: 'CLEAR_ANNOTATIONS' });
    dispatch({ type: 'CLEAR_RECORDING' });
  }, []);

  const exportSpecs = useCallback(
    async (options: ExportOptions): Promise<void> => {
      const { format, includeScreenshots, includeAnnotations, specIds } = options;
      const specsToExport = specIds
        ? state.specs.filter((s) => specIds.includes(s.id))
        : state.specs;

      if (format === 'json') {
        const data = JSON.stringify(specsToExport, null, 2);
        downloadFile(data, 'lazi-specs.json', 'application/json');
      } else if (format === 'markdown') {
        const markdown = generateMarkdownExport(specsToExport, state.annotations);
        downloadFile(markdown, 'lazi-specs.md', 'text/markdown');
      } else if (format === 'zip') {
        // For ZIP export, would need to implement JSZip
        console.log('ZIP export not yet implemented');
      }
    },
    [state.specs, state.annotations]
  );

  // =============================================================================
  // Context Value
  // =============================================================================

  const value: DevModeContextValue = {
    state,
    dispatch,
    toggleEnabled,
    setMode,
    selectElement,
    addSpec,
    updateSpec,
    removeSpec,
    startRecording,
    stopRecording,
    addAnnotation,
    removeLastAnnotation,
    clearSession,
    exportSpecs,
  };

  return (
    <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useDevMode(): DevModeContextValue {
  const context = useContext(DevModeContext);
  if (!context) {
    throw new Error('useDevMode must be used within a DevModeProvider');
  }
  return context;
}

// =============================================================================
// Helper Functions
// =============================================================================

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function generateMarkdownExport(
  specs: ElementSpec[],
  annotations: Annotation[]
): string {
  let markdown = `# LAZI CRM - UI Specifications\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n\n`;
  markdown += `---\n\n`;

  // Group specs by page
  const groupedByPage = specs.reduce(
    (acc, spec) => {
      if (!acc[spec.page]) acc[spec.page] = [];
      acc[spec.page].push(spec);
      return acc;
    },
    {} as Record<string, ElementSpec[]>
  );

  for (const [page, pageSpecs] of Object.entries(groupedByPage)) {
    markdown += `## Page: ${page}\n\n`;

    for (const spec of pageSpecs) {
      markdown += `### ${spec.behaviorType}: "${spec.elementInfo?.textContent?.slice(0, 40) || 'Unnamed element'}"\n\n`;
      markdown += `- **Type:** ${spec.behaviorType}\n`;
      markdown += `- **Priority:** ${spec.priority}\n`;
      markdown += `- **Status:** ${spec.status}\n`;

      if (spec.elementInfo) {
        markdown += `- **Location:** ${spec.elementInfo.selector}\n`;
      }

      markdown += `\n**Description:**\n\n${spec.description}\n`;

      // Add behavior-specific details
      if (spec.behaviorType === 'api-call' && spec.apiEndpoint) {
        markdown += `\n**API Call:**\n`;
        markdown += `- Method: ${spec.apiMethod || 'GET'}\n`;
        markdown += `- Endpoint: ${spec.apiEndpoint}\n`;
        if (spec.apiPayload) {
          markdown += `- Payload: ${spec.apiPayload}\n`;
        }
      }

      if (spec.behaviorType === 'navigate' && spec.navigateTo) {
        markdown += `\n**Navigation:** ${spec.navigateTo}\n`;
      }

      if (spec.behaviorType === 'workflow' && spec.workflowName) {
        markdown += `\n**Workflow:** ${spec.workflowName}\n`;
      }

      if (spec.dataBinding) {
        markdown += `\n**Data Binding:**\n`;
        markdown += `- Schema: ${spec.dataBinding.schema}\n`;
        markdown += `- Table: ${spec.dataBinding.table}\n`;
        markdown += `- Columns: ${spec.dataBinding.columns.map((c) => c.columnName).join(', ')}\n`;
      }

      if (spec.windsurfPrompt) {
        markdown += `\n**Windsurf Prompt:**\n\`\`\`\n${spec.windsurfPrompt}\n\`\`\`\n`;
      }

      // Add annotations for this spec
      const specAnnotations = annotations.filter((a) => a.specId === spec.id);
      if (specAnnotations.length > 0) {
        markdown += `\n**Annotations:**\n`;
        for (const ann of specAnnotations) {
          markdown += `- [${ann.type}] ${ann.text || '(visual annotation)'}\n`;
        }
      }

      markdown += `\n---\n\n`;
    }
  }

  return markdown;
}

// =============================================================================
// Re-export types for convenience
// =============================================================================

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
  RecordingData,
  DataBinding,
  ColumnBinding,
  ExportOptions,
} from './types/devmode.types';
