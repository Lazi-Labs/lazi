# DevMode 2.0 - Complete Implementation Specification

## Project Overview

**Project Name:** DevMode 2.0 - Visual Development Environment  
**Platform:** LAZI AI (Next.js/React with Payload CMS backend)  
**Purpose:** Enable non-developers to visually configure UI behavior, connect data sources, annotate issues, and generate AI-ready implementation prompts  

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Feature 1: Multi-Mode System](#2-feature-1-multi-mode-system)
3. [Feature 2: Add Mode - Element Palette](#3-feature-2-add-mode---element-palette)
4. [Feature 3: Database Schema Browser](#4-feature-3-database-schema-browser)
5. [Feature 4: Quick Action Prompts](#5-feature-4-quick-action-prompts)
6. [Feature 5: Continuous Inspection Flow (Sidebar Panel)](#6-feature-5-continuous-inspection-flow)
7. [Feature 6: Annotation Tools](#7-feature-6-annotation-tools)
8. [Feature 7: Error Recording Mode](#8-feature-7-error-recording-mode)
9. [Feature 8: Keyboard Shortcuts](#9-feature-8-keyboard-shortcuts)
10. [Feature 9: Export Enhancements](#10-feature-9-export-enhancements)
11. [Database Schema & API Endpoints](#11-database-schema--api-endpoints)
12. [Implementation Order & Dependencies](#12-implementation-order--dependencies)

---

## 1. Architecture Overview

### File Structure

```
src/
├── components/
│   └── devmode/
│       ├── DevModeProvider.tsx          # Global context provider
│       ├── DevModePanel.tsx             # Main sidebar panel (replaces modal)
│       ├── DevModeToggle.tsx            # Floating toggle button
│       ├── ModeToolbar.tsx              # Mode switching toolbar
│       ├── modes/
│       │   ├── InspectMode.tsx          # Element inspection (existing, enhanced)
│       │   ├── AddMode.tsx              # Add new elements
│       │   ├── ConnectMode.tsx          # Data binding mode
│       │   ├── AnnotateMode.tsx         # Drawing/annotation mode
│       │   └── RecordMode.tsx           # Error recording mode
│       ├── panels/
│       │   ├── ElementConfigurator.tsx  # Element configuration (from modal)
│       │   ├── DatabaseBrowser.tsx      # Schema explorer
│       │   ├── PromptBuilder.tsx        # Windsurf prompt generation
│       │   ├── AnnotationToolbar.tsx    # Drawing tools
│       │   └── RecordingControls.tsx    # Recording UI
│       ├── canvas/
│       │   ├── AnnotationCanvas.tsx     # SVG overlay for annotations
│       │   ├── SelectionOverlay.tsx     # Element highlight overlay
│       │   └── AddModeOverlay.tsx       # Click-to-add overlay
│       ├── hooks/
│       │   ├── useDevMode.ts            # Main devmode hook
│       │   ├── useElementSelection.ts   # Element selection logic
│       │   ├── useRecorder.ts           # Error/interaction recording
│       │   ├── useAnnotations.ts        # Annotation state management
│       │   ├── useDatabaseSchema.ts     # Schema fetching
│       │   └── useKeyboardShortcuts.ts  # Keyboard handling
│       ├── utils/
│       │   ├── elementUtils.ts          # DOM utilities
│       │   ├── promptGenerator.ts       # Prompt building utilities
│       │   ├── exportUtils.ts           # Export formatting
│       │   └── screenshotUtils.ts       # Screenshot capture
│       └── types/
│           └── devmode.types.ts         # TypeScript interfaces
├── app/
│   └── api/
│       └── devmode/
│           ├── schema/
│           │   └── route.ts             # Database schema endpoint
│           ├── specs/
│           │   └── route.ts             # Save/load specs endpoint
│           └── export/
│               └── route.ts             # Export endpoint
└── styles/
    └── devmode.css                      # DevMode-specific styles
```

### Global State Shape

```typescript
// src/components/devmode/types/devmode.types.ts

export type DevModeMode = 'inspect' | 'add' | 'connect' | 'annotate' | 'record';

export type AnnotationType = 'bug' | 'improvement' | 'feature' | 'question';

export interface DevModeState {
  // Core state
  isEnabled: boolean;
  currentMode: DevModeMode;
  isPanelOpen: boolean;
  
  // Selection state
  selectedElement: SelectedElement | null;
  hoveredElement: HTMLElement | null;
  
  // Specs state
  specs: ElementSpec[];
  currentSpec: ElementSpec | null;
  
  // Annotation state
  annotations: Annotation[];
  activeAnnotationTool: AnnotationTool | null;
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
}

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
  displayAs: 'text' | 'number' | 'currency' | 'date' | 'badge' | 'link';
  label?: string;
  format?: string;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  tool: AnnotationTool;
  points: Point[];
  text?: string;
  color: string;
  screenshot?: string;
  createdAt: Date;
}

export type AnnotationTool = 'arrow' | 'rectangle' | 'freehand' | 'text' | 'marker';

export interface Point {
  x: number;
  y: number;
}

export interface RecordingData {
  startTime: Date;
  endTime?: Date;
  interactions: InteractionEvent[];
  consoleErrors: ConsoleError[];
  networkRequests: NetworkRequest[];
  screenshots: Screenshot[];
  finalError?: ErrorCapture;
}

export interface InteractionEvent {
  type: 'click' | 'input' | 'scroll' | 'navigation';
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

export interface UIFeedback {
  loadingState: boolean;
  successMessage?: string;
  errorMessage?: string;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'email' | 'min' | 'max' | 'pattern';
  value?: string | number;
  message: string;
}

export interface FilterConfig {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'in';
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

// Quick action prompt templates
export interface PromptTemplate {
  id: string;
  name: string;
  category: 'element' | 'data' | 'page' | 'error';
  template: string;
  variables: string[];
}
```

---

## 2. Feature 1: Multi-Mode System

### Overview
Replace the single "Start Inspecting" button with a multi-mode toolbar that allows switching between different interaction modes.

### Implementation

#### 2.1 ModeToolbar.tsx

```typescript
// src/components/devmode/ModeToolbar.tsx

'use client';

import React from 'react';
import { useDevMode } from './hooks/useDevMode';
import { DevModeMode } from './types/devmode.types';
import { 
  Search, 
  Plus, 
  Link2, 
  Pencil, 
  Circle,
  LucideIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ModeConfig {
  id: DevModeMode;
  icon: LucideIcon;
  label: string;
  shortcut: string;
  description: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'inspect',
    icon: Search,
    label: 'Inspect',
    shortcut: '1',
    description: 'Select and inspect existing elements',
  },
  {
    id: 'add',
    icon: Plus,
    label: 'Add',
    shortcut: '2',
    description: 'Click anywhere to add new elements',
  },
  {
    id: 'connect',
    icon: Link2,
    label: 'Connect',
    shortcut: '3',
    description: 'Connect elements to data sources',
  },
  {
    id: 'annotate',
    icon: Pencil,
    label: 'Annotate',
    shortcut: '4',
    description: 'Draw and add notes on the screen',
  },
  {
    id: 'record',
    icon: Circle,
    label: 'Record',
    shortcut: '5',
    description: 'Record interactions and capture errors',
  },
];

export function ModeToolbar() {
  const { state, setMode } = useDevMode();
  const { currentMode, isRecording } = state;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          const isRecordingMode = mode.id === 'record';
          
          return (
            <Tooltip key={mode.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setMode(mode.id)}
                  disabled={isRecording && !isRecordingMode}
                  className={cn(
                    'p-2 rounded-md transition-all duration-200',
                    'hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isActive && 'bg-blue-600 text-white',
                    !isActive && 'text-slate-400',
                    isRecording && !isRecordingMode && 'opacity-50 cursor-not-allowed',
                    isRecordingMode && isRecording && 'bg-red-600 text-white animate-pulse'
                  )}
                  aria-label={mode.label}
                  aria-pressed={isActive}
                >
                  <Icon className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{mode.label}</span>
                    <kbd className="px-1.5 py-0.5 text-xs bg-slate-700 rounded">
                      {mode.shortcut}
                    </kbd>
                  </div>
                  <span className="text-xs text-slate-400">{mode.description}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
```

#### 2.2 Mode-Specific Event Handlers

```typescript
// src/components/devmode/hooks/useDevMode.ts

'use client';

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  useEffect,
  ReactNode 
} from 'react';
import { 
  DevModeState, 
  DevModeMode, 
  SelectedElement,
  ElementSpec,
  Annotation,
  RecordingData
} from '../types/devmode.types';
import { generateId } from '../utils/elementUtils';

// Initial state
const initialState: DevModeState = {
  isEnabled: false,
  currentMode: 'inspect',
  isPanelOpen: false,
  selectedElement: null,
  hoveredElement: null,
  specs: [],
  currentSpec: null,
  annotations: [],
  activeAnnotationTool: null,
  isDrawing: false,
  isRecording: false,
  recordingData: null,
  selectedSchema: null,
  selectedTable: null,
  selectedColumns: [],
  currentPage: typeof window !== 'undefined' ? window.location.pathname : '',
  sessionId: generateId(),
};

// Action types
type DevModeAction =
  | { type: 'TOGGLE_ENABLED' }
  | { type: 'SET_ENABLED'; payload: boolean }
  | { type: 'SET_MODE'; payload: DevModeMode }
  | { type: 'SET_PANEL_OPEN'; payload: boolean }
  | { type: 'SET_SELECTED_ELEMENT'; payload: SelectedElement | null }
  | { type: 'SET_HOVERED_ELEMENT'; payload: HTMLElement | null }
  | { type: 'ADD_SPEC'; payload: ElementSpec }
  | { type: 'UPDATE_SPEC'; payload: { id: string; updates: Partial<ElementSpec> } }
  | { type: 'REMOVE_SPEC'; payload: string }
  | { type: 'SET_CURRENT_SPEC'; payload: ElementSpec | null }
  | { type: 'CLEAR_SPECS' }
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'UPDATE_ANNOTATION'; payload: { id: string; updates: Partial<Annotation> } }
  | { type: 'REMOVE_ANNOTATION'; payload: string }
  | { type: 'CLEAR_ANNOTATIONS' }
  | { type: 'SET_ANNOTATION_TOOL'; payload: DevModeState['activeAnnotationTool'] }
  | { type: 'SET_IS_DRAWING'; payload: boolean }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING' }
  | { type: 'UPDATE_RECORDING_DATA'; payload: Partial<RecordingData> }
  | { type: 'CLEAR_RECORDING' }
  | { type: 'SET_SELECTED_SCHEMA'; payload: string | null }
  | { type: 'SET_SELECTED_TABLE'; payload: string | null }
  | { type: 'SET_SELECTED_COLUMNS'; payload: string[] }
  | { type: 'RESET_STATE' };

// Reducer
function devModeReducer(state: DevModeState, action: DevModeAction): DevModeState {
  switch (action.type) {
    case 'TOGGLE_ENABLED':
      return { 
        ...state, 
        isEnabled: !state.isEnabled,
        isPanelOpen: !state.isEnabled ? true : state.isPanelOpen
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
      };
    
    case 'SET_PANEL_OPEN':
      return { ...state, isPanelOpen: action.payload };
    
    case 'SET_SELECTED_ELEMENT':
      return { ...state, selectedElement: action.payload };
    
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
      };
    
    case 'REMOVE_SPEC':
      return {
        ...state,
        specs: state.specs.filter((spec) => spec.id !== action.payload),
        currentSpec: state.currentSpec?.id === action.payload ? null : state.currentSpec,
      };
    
    case 'SET_CURRENT_SPEC':
      return { ...state, currentSpec: action.payload };
    
    case 'CLEAR_SPECS':
      return { ...state, specs: [], currentSpec: null };
    
    case 'ADD_ANNOTATION':
      return { ...state, annotations: [...state.annotations, action.payload] };
    
    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map((ann) =>
          ann.id === action.payload.id ? { ...ann, ...action.payload.updates } : ann
        ),
      };
    
    case 'REMOVE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.filter((ann) => ann.id !== action.payload),
      };
    
    case 'CLEAR_ANNOTATIONS':
      return { ...state, annotations: [] };
    
    case 'SET_ANNOTATION_TOOL':
      return { ...state, activeAnnotationTool: action.payload };
    
    case 'SET_IS_DRAWING':
      return { ...state, isDrawing: action.payload };
    
    case 'START_RECORDING':
      return {
        ...state,
        isRecording: true,
        recordingData: {
          startTime: new Date(),
          interactions: [],
          consoleErrors: [],
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
    
    case 'RESET_STATE':
      return { ...initialState, sessionId: generateId() };
    
    default:
      return state;
  }
}

// Context
interface DevModeContextValue {
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
  clearSession: () => void;
}

const DevModeContext = createContext<DevModeContextValue | null>(null);

// Provider
export function DevModeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(devModeReducer, initialState);

  const toggleEnabled = useCallback(() => {
    dispatch({ type: 'TOGGLE_ENABLED' });
  }, []);

  const setMode = useCallback((mode: DevModeMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  }, []);

  const selectElement = useCallback((element: SelectedElement | null) => {
    dispatch({ type: 'SET_SELECTED_ELEMENT', payload: element });
  }, []);

  const addSpec = useCallback((specData: Omit<ElementSpec, 'id' | 'createdAt' | 'updatedAt'>) => {
    const spec: ElementSpec = {
      ...specData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dispatch({ type: 'ADD_SPEC', payload: spec });
    return spec;
  }, []);

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

  const addAnnotation = useCallback((annotationData: Omit<Annotation, 'id' | 'createdAt'>) => {
    const annotation: Annotation = {
      ...annotationData,
      id: generateId(),
      createdAt: new Date(),
    };
    dispatch({ type: 'ADD_ANNOTATION', payload: annotation });
  }, []);

  const clearSession = useCallback(() => {
    dispatch({ type: 'CLEAR_SPECS' });
    dispatch({ type: 'CLEAR_ANNOTATIONS' });
    dispatch({ type: 'CLEAR_RECORDING' });
  }, []);

  // Update current page on navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleRouteChange = () => {
      // This will be called on route changes in Next.js
    };

    return () => {
      // Cleanup
    };
  }, []);

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
    clearSession,
  };

  return (
    <DevModeContext.Provider value={value}>
      {children}
    </DevModeContext.Provider>
  );
}

// Hook
export function useDevMode() {
  const context = useContext(DevModeContext);
  if (!context) {
    throw new Error('useDevMode must be used within a DevModeProvider');
  }
  return context;
}
```

---

## 3. Feature 2: Add Mode - Element Palette

### Overview
When in "Add" mode, clicking anywhere on the page opens an element palette allowing the user to specify what component to add at that location.

### Implementation

#### 3.1 AddMode.tsx

```typescript
// src/components/devmode/modes/AddMode.tsx

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDevMode } from '../hooks/useDevMode';
import { Point } from '../types/devmode.types';
import { ElementPalette } from '../panels/ElementPalette';
import { AddModeOverlay } from '../canvas/AddModeOverlay';

export function AddMode() {
  const { state, addSpec, dispatch } = useDevMode();
  const [clickPosition, setClickPosition] = useState<Point | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [targetContainer, setTargetContainer] = useState<string | null>(null);

  const handleCanvasClick = useCallback((e: MouseEvent) => {
    if (state.currentMode !== 'add') return;
    
    // Don't capture clicks on the DevMode panel itself
    const target = e.target as HTMLElement;
    if (target.closest('[data-devmode-panel]')) return;
    
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
      if (el.closest('[data-devmode]')) return false;
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
  }, [state.currentMode]);

  const handleElementSelect = useCallback((elementType: string, config: any) => {
    if (!clickPosition || !targetContainer) return;
    
    // Create a spec for the new element
    addSpec({
      elementInfo: null, // No existing element
      behaviorType: 'add-element',
      description: `Add ${elementType} at position (${clickPosition.x}, ${clickPosition.y})`,
      priority: 'medium',
      status: 'draft',
      annotations: [],
      page: window.location.pathname,
      // Custom data for add mode
      addElementConfig: {
        elementType,
        position: clickPosition,
        targetContainer,
        config,
      },
    } as any);
    
    setIsPaletteOpen(false);
    setClickPosition(null);
    setTargetContainer(null);
  }, [clickPosition, targetContainer, addSpec]);

  const handleClose = useCallback(() => {
    setIsPaletteOpen(false);
    setClickPosition(null);
    setTargetContainer(null);
  }, []);

  // Register click handler when in add mode
  useEffect(() => {
    if (state.currentMode !== 'add' || !state.isEnabled) return;
    
    document.addEventListener('click', handleCanvasClick, true);
    
    return () => {
      document.removeEventListener('click', handleCanvasClick, true);
    };
  }, [state.currentMode, state.isEnabled, handleCanvasClick]);

  if (state.currentMode !== 'add' || !state.isEnabled) {
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
          onSelect={handleElementSelect}
          onClose={handleClose}
        />
      )}
    </>
  );
}

// Helper to generate a unique selector for an element
function generateSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }
  
  const path: string[] = [];
  let current: HTMLElement | null = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.className) {
      const classes = current.className.split(' ').filter(Boolean).slice(0, 2);
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}
```

#### 3.2 ElementPalette.tsx

```typescript
// src/components/devmode/panels/ElementPalette.tsx

'use client';

import React, { useState } from 'react';
import { Point } from '../types/devmode.types';
import { 
  MousePointer2,
  Type,
  ToggleLeft,
  ChevronDown,
  Table,
  Square,
  Columns,
  Search,
  Filter,
  FormInput,
  BarChart3,
  Badge,
  Loader,
  PanelTop,
  List,
  Calendar,
  Hash,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ElementPaletteProps {
  position: Point;
  onSelect: (elementType: string, config: any) => void;
  onClose: () => void;
}

interface ElementOption {
  id: string;
  label: string;
  icon: React.ElementType;
  category: 'ui' | 'data' | 'action' | 'layout';
  description: string;
  defaultConfig: Record<string, any>;
}

const ELEMENT_OPTIONS: ElementOption[] = [
  // UI Components
  {
    id: 'button',
    label: 'Button',
    icon: MousePointer2,
    category: 'ui',
    description: 'Clickable button with customizable action',
    defaultConfig: { variant: 'primary', size: 'medium' },
  },
  {
    id: 'dropdown',
    label: 'Dropdown',
    icon: ChevronDown,
    category: 'ui',
    description: 'Select from a list of options',
    defaultConfig: { placeholder: 'Select...', searchable: false },
  },
  {
    id: 'input-text',
    label: 'Text Input',
    icon: Type,
    category: 'ui',
    description: 'Single-line text input field',
    defaultConfig: { placeholder: '', validation: null },
  },
  {
    id: 'input-number',
    label: 'Number Input',
    icon: Hash,
    category: 'ui',
    description: 'Numeric input with optional min/max',
    defaultConfig: { min: null, max: null, step: 1 },
  },
  {
    id: 'input-date',
    label: 'Date Picker',
    icon: Calendar,
    category: 'ui',
    description: 'Date selection input',
    defaultConfig: { format: 'MM/DD/YYYY' },
  },
  {
    id: 'toggle',
    label: 'Toggle Switch',
    icon: ToggleLeft,
    category: 'ui',
    description: 'On/off toggle control',
    defaultConfig: { defaultValue: false },
  },
  
  // Data Components
  {
    id: 'data-table',
    label: 'Data Table',
    icon: Table,
    category: 'data',
    description: 'Display data in a sortable table',
    defaultConfig: { columns: [], pagination: true, pageSize: 10 },
  },
  {
    id: 'data-list',
    label: 'Data List',
    icon: List,
    category: 'data',
    description: 'Display data as a list',
    defaultConfig: { layout: 'vertical' },
  },
  {
    id: 'chart',
    label: 'Chart',
    icon: BarChart3,
    category: 'data',
    description: 'Visual data representation',
    defaultConfig: { type: 'bar', data: [] },
  },
  {
    id: 'status-badge',
    label: 'Status Badge',
    icon: Badge,
    category: 'data',
    description: 'Display status indicator',
    defaultConfig: { variant: 'default' },
  },
  {
    id: 'loading-indicator',
    label: 'Loading State',
    icon: Loader,
    category: 'data',
    description: 'Show loading/progress',
    defaultConfig: { type: 'spinner' },
  },
  
  // Action Components
  {
    id: 'search-bar',
    label: 'Search Bar',
    icon: Search,
    category: 'action',
    description: 'Search input with filtering',
    defaultConfig: { debounce: 300 },
  },
  {
    id: 'filter-bar',
    label: 'Filter Controls',
    icon: Filter,
    category: 'action',
    description: 'Multiple filter options',
    defaultConfig: { filters: [] },
  },
  {
    id: 'form-section',
    label: 'Form Section',
    icon: FormInput,
    category: 'action',
    description: 'Group of form fields',
    defaultConfig: { fields: [], layout: 'vertical' },
  },
  
  // Layout Components
  {
    id: 'card',
    label: 'Card / Panel',
    icon: Square,
    category: 'layout',
    description: 'Container with border/shadow',
    defaultConfig: { padding: 'medium', shadow: true },
  },
  {
    id: 'tabs',
    label: 'Tabs',
    icon: PanelTop,
    category: 'layout',
    description: 'Tabbed content sections',
    defaultConfig: { tabs: [], defaultTab: 0 },
  },
  {
    id: 'columns',
    label: 'Columns',
    icon: Columns,
    category: 'layout',
    description: 'Multi-column layout',
    defaultConfig: { columns: 2, gap: 'medium' },
  },
];

const CATEGORIES = [
  { id: 'ui', label: 'UI Controls' },
  { id: 'data', label: 'Data Display' },
  { id: 'action', label: 'Actions' },
  { id: 'layout', label: 'Layout' },
];

export function ElementPalette({ position, onSelect, onClose }: ElementPaletteProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate palette position to stay within viewport
  const paletteStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 320),
    top: Math.min(position.y, window.innerHeight - 400),
    zIndex: 10001,
  };

  const filteredOptions = ELEMENT_OPTIONS.filter((option) => {
    const matchesCategory = !selectedCategory || option.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelect = (option: ElementOption) => {
    onSelect(option.id, option.defaultConfig);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[10000]"
        onClick={onClose}
      />
      
      {/* Palette */}
      <div 
        style={paletteStyle}
        className="w-80 bg-slate-900 rounded-lg shadow-2xl border border-slate-700 overflow-hidden"
        data-devmode-panel
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-700">
          <h3 className="text-sm font-medium text-white">Add Element</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Search */}
        <div className="p-2 border-b border-slate-700">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search elements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        
        {/* Category Tabs */}
        <div className="flex gap-1 p-2 border-b border-slate-700 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-2 py-1 text-xs rounded whitespace-nowrap transition-colors',
              !selectedCategory
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            )}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'px-2 py-1 text-xs rounded whitespace-nowrap transition-colors',
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
        
        {/* Elements Grid */}
        <div className="max-h-64 overflow-y-auto p-2">
          <div className="grid grid-cols-2 gap-2">
            {filteredOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelect(option)}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 transition-colors group"
                >
                  <Icon className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
                  <span className="text-xs text-white font-medium">{option.label}</span>
                </button>
              );
            })}
          </div>
          
          {filteredOptions.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No elements found
            </div>
          )}
        </div>
        
        {/* Position Info */}
        <div className="p-2 border-t border-slate-700 bg-slate-800/50">
          <p className="text-xs text-slate-400 text-center">
            Click position: ({Math.round(position.x)}, {Math.round(position.y)})
          </p>
        </div>
      </div>
    </>
  );
}
```

#### 3.3 AddModeOverlay.tsx

```typescript
// src/components/devmode/canvas/AddModeOverlay.tsx

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
      {/* Cursor indicator */}
      <style jsx global>{`
        body[data-devmode-add] * {
          cursor: crosshair !important;
        }
      `}</style>
      
      {/* Click position marker */}
      {clickPosition && (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: clickPosition.x - 12,
            top: clickPosition.y - 12,
          }}
        >
          <div className="w-6 h-6 rounded-full bg-blue-500/30 border-2 border-blue-500 flex items-center justify-center animate-pulse">
            <Plus className="w-3 h-3 text-blue-500" />
          </div>
        </div>
      )}
      
      {/* Instructions overlay */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none">
        <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">
          Click anywhere to add an element
        </div>
      </div>
    </>
  );
}
```

---

## 4. Feature 3: Database Schema Browser

### Overview
A new tab in the element configurator that allows browsing database schemas, tables, and columns to bind data to UI elements.

### Implementation

#### 4.1 API Endpoint for Schema

```typescript
// src/app/api/devmode/schema/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Initialize connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const schema = searchParams.get('schema');
  const table = searchParams.get('table');

  try {
    // If requesting specific table columns
    if (schema && table) {
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `;
      
      const result = await pool.query(columnsQuery, [schema, table]);
      
      // Also get a sample of data
      const sampleQuery = `
        SELECT * FROM "${schema}"."${table}" LIMIT 5
      `;
      
      let sampleData = [];
      try {
        const sampleResult = await pool.query(sampleQuery);
        sampleData = sampleResult.rows;
      } catch (e) {
        // Ignore sample errors
      }
      
      return NextResponse.json({
        columns: result.rows.map((row) => ({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default,
          maxLength: row.character_maximum_length,
        })),
        sample: sampleData,
      });
    }
    
    // If requesting tables for a schema
    if (schema) {
      const tablesQuery = `
        SELECT 
          table_name,
          (
            SELECT count(*) 
            FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = t.table_name
          ) as column_count
        FROM information_schema.tables t
        WHERE table_schema = $1 AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      const result = await pool.query(tablesQuery, [schema]);
      
      return NextResponse.json({
        tables: result.rows.map((row) => ({
          name: row.table_name,
          columnCount: parseInt(row.column_count),
        })),
      });
    }
    
    // Get all schemas
    const schemasQuery = `
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY 
        CASE 
          WHEN schema_name = 'master' THEN 1
          WHEN schema_name = 'crm' THEN 2
          WHEN schema_name = 'raw' THEN 3
          ELSE 4
        END,
        schema_name
    `;
    
    const result = await pool.query(schemasQuery);
    
    return NextResponse.json({
      schemas: result.rows.map((row) => row.schema_name),
    });
    
  } catch (error) {
    console.error('Schema API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schema information' },
      { status: 500 }
    );
  }
}
```

#### 4.2 useDatabaseSchema Hook

```typescript
// src/components/devmode/hooks/useDatabaseSchema.ts

'use client';

import { useState, useEffect, useCallback } from 'react';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  maxLength: number | null;
}

interface Table {
  name: string;
  columnCount: number;
}

interface SchemaState {
  schemas: string[];
  tables: Table[];
  columns: Column[];
  sampleData: Record<string, any>[];
  isLoading: boolean;
  error: string | null;
}

export function useDatabaseSchema() {
  const [state, setState] = useState<SchemaState>({
    schemas: [],
    tables: [],
    columns: [],
    sampleData: [],
    isLoading: false,
    error: null,
  });
  
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Fetch schemas on mount
  useEffect(() => {
    async function fetchSchemas() {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const response = await fetch('/api/devmode/schema');
        if (!response.ok) throw new Error('Failed to fetch schemas');
        
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          schemas: data.schemas,
          isLoading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false,
        }));
      }
    }
    
    fetchSchemas();
  }, []);

  // Fetch tables when schema changes
  useEffect(() => {
    if (!selectedSchema) {
      setState((prev) => ({ ...prev, tables: [], columns: [], sampleData: [] }));
      return;
    }
    
    async function fetchTables() {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const response = await fetch(`/api/devmode/schema?schema=${selectedSchema}`);
        if (!response.ok) throw new Error('Failed to fetch tables');
        
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          tables: data.tables,
          columns: [],
          sampleData: [],
          isLoading: false,
        }));
        setSelectedTable(null);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false,
        }));
      }
    }
    
    fetchTables();
  }, [selectedSchema]);

  // Fetch columns when table changes
  useEffect(() => {
    if (!selectedSchema || !selectedTable) {
      setState((prev) => ({ ...prev, columns: [], sampleData: [] }));
      return;
    }
    
    async function fetchColumns() {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const response = await fetch(
          `/api/devmode/schema?schema=${selectedSchema}&table=${selectedTable}`
        );
        if (!response.ok) throw new Error('Failed to fetch columns');
        
        const data = await response.json();
        setState((prev) => ({
          ...prev,
          columns: data.columns,
          sampleData: data.sample,
          isLoading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false,
        }));
      }
    }
    
    fetchColumns();
  }, [selectedSchema, selectedTable]);

  const selectSchema = useCallback((schema: string | null) => {
    setSelectedSchema(schema);
  }, []);

  const selectTable = useCallback((table: string | null) => {
    setSelectedTable(table);
  }, []);

  return {
    ...state,
    selectedSchema,
    selectedTable,
    selectSchema,
    selectTable,
  };
}
```

#### 4.3 DatabaseBrowser.tsx

```typescript
// src/components/devmode/panels/DatabaseBrowser.tsx

'use client';

import React, { useState } from 'react';
import { useDatabaseSchema } from '../hooks/useDatabaseSchema';
import { useDevMode } from '../hooks/useDevMode';
import { 
  Database, 
  Table, 
  Columns, 
  ChevronRight,
  Check,
  Loader,
  AlertCircle,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatabaseBrowserProps {
  onColumnSelect?: (columns: string[]) => void;
}

export function DatabaseBrowser({ onColumnSelect }: DatabaseBrowserProps) {
  const {
    schemas,
    tables,
    columns,
    sampleData,
    isLoading,
    error,
    selectedSchema,
    selectedTable,
    selectSchema,
    selectTable,
  } = useDatabaseSchema();
  
  const { dispatch } = useDevMode();
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);

  const toggleColumn = (columnName: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(columnName)) {
      newSelected.delete(columnName);
    } else {
      newSelected.add(columnName);
    }
    setSelectedColumns(newSelected);
    
    // Update parent
    onColumnSelect?.(Array.from(newSelected));
    
    // Update global state
    dispatch({ 
      type: 'SET_SELECTED_COLUMNS', 
      payload: Array.from(newSelected) 
    });
  };

  const selectAllColumns = () => {
    const allColumns = new Set(columns.map((c) => c.name));
    setSelectedColumns(allColumns);
    onColumnSelect?.(Array.from(allColumns));
    dispatch({ type: 'SET_SELECTED_COLUMNS', payload: Array.from(allColumns) });
  };

  const clearSelection = () => {
    setSelectedColumns(new Set());
    onColumnSelect?.([]);
    dispatch({ type: 'SET_SELECTED_COLUMNS', payload: [] });
  };

  const handleSchemaSelect = (schema: string) => {
    selectSchema(schema);
    dispatch({ type: 'SET_SELECTED_SCHEMA', payload: schema });
  };

  const handleTableSelect = (table: string) => {
    selectTable(table);
    dispatch({ type: 'SET_SELECTED_TABLE', payload: table });
    setSelectedColumns(new Set());
  };

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Schema Selector */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Schema
        </label>
        <select
          value={selectedSchema || ''}
          onChange={(e) => handleSchemaSelect(e.target.value || null)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-white focus:outline-none focus:border-blue-500"
          disabled={isLoading}
        >
          <option value="">Select schema...</option>
          {schemas.map((schema) => (
            <option key={schema} value={schema}>
              {schema}
            </option>
          ))}
        </select>
      </div>

      {/* Table Selector */}
      {selectedSchema && (
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Table
          </label>
          <select
            value={selectedTable || ''}
            onChange={(e) => handleTableSelect(e.target.value || null)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-sm text-white focus:outline-none focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="">Select table...</option>
            {tables.map((table) => (
              <option key={table.name} value={table.name}>
                {table.name} ({table.columnCount} columns)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader className="w-5 h-5 text-blue-400 animate-spin" />
        </div>
      )}

      {/* Columns List */}
      {selectedTable && columns.length > 0 && !isLoading && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-400">
              Columns ({selectedColumns.size} selected)
            </label>
            <div className="flex gap-2">
              <button
                onClick={selectAllColumns}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="text-xs text-slate-400 hover:text-slate-300"
              >
                Clear
              </button>
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto bg-slate-800 rounded-lg border border-slate-700">
            {columns.map((column) => (
              <button
                key={column.name}
                onClick={() => toggleColumn(column.name)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-left text-sm border-b border-slate-700 last:border-0 transition-colors',
                  selectedColumns.has(column.name)
                    ? 'bg-blue-900/30 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center',
                  selectedColumns.has(column.name)
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-slate-500'
                )}>
                  {selectedColumns.has(column.name) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <span className="flex-1 truncate">{column.name}</span>
                <span className="text-xs text-slate-500">{column.type}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Data Preview */}
      {selectedTable && sampleData.length > 0 && !isLoading && (
        <div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-2"
          >
            <Eye className="w-3 h-3" />
            {showPreview ? 'Hide' : 'Show'} Data Preview
            <ChevronRight className={cn(
              'w-3 h-3 transition-transform',
              showPreview && 'rotate-90'
            )} />
          </button>
          
          {showPreview && (
            <div className="overflow-x-auto bg-slate-800 rounded-lg border border-slate-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700">
                    {columns.slice(0, 5).map((col) => (
                      <th key={col.name} className="px-2 py-1 text-left text-slate-400 font-medium">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleData.slice(0, 3).map((row, i) => (
                    <tr key={i} className="border-b border-slate-700 last:border-0">
                      {columns.slice(0, 5).map((col) => (
                        <td key={col.name} className="px-2 py-1 text-slate-300 truncate max-w-[100px]">
                          {String(row[col.name] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Binding Summary */}
      {selectedColumns.size > 0 && (
        <div className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
          <p className="text-xs text-blue-300 font-medium mb-1">Data Binding</p>
          <p className="text-xs text-slate-300">
            {selectedSchema}.{selectedTable}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Fields: {Array.from(selectedColumns).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 5. Feature 4: Quick Action Prompts

### Overview
Pre-built prompt templates that can be quickly applied to generate Windsurf-ready implementation prompts.

### Implementation

#### 5.1 PromptTemplates.ts

```typescript
// src/components/devmode/utils/promptTemplates.ts

import { PromptTemplate } from '../types/devmode.types';

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // Element Actions
  {
    id: 'fix-styling',
    name: 'Fix Styling/Layout',
    category: 'element',
    template: `## Fix Styling/Layout Issue

### Element
- Selector: {{selector}}
- Current Location: {{location}}

### Issue Description
{{description}}

### Requirements
- Fix the styling/layout issues described above
- Maintain responsive behavior
- Follow existing design system patterns
- Test across breakpoints`,
    variables: ['selector', 'location', 'description'],
  },
  {
    id: 'add-loading',
    name: 'Add Loading State',
    category: 'element',
    template: `## Add Loading State

### Element
- Selector: {{selector}}
- Component Type: {{elementType}}

### Requirements
- Add a loading indicator while data is being fetched
- Disable interactions during loading
- Show skeleton/placeholder if appropriate
- Handle loading state transitions smoothly

### Implementation Notes
- Use existing loading components from the design system
- Consider aria-busy for accessibility`,
    variables: ['selector', 'elementType'],
  },
  {
    id: 'add-error-handling',
    name: 'Add Error Handling',
    category: 'element',
    template: `## Add Error Handling

### Element
- Selector: {{selector}}
- Associated Action: {{action}}

### Requirements
- Catch and display errors gracefully
- Provide user-friendly error messages
- Add retry capability where appropriate
- Log errors for debugging

### Error States to Handle
- Network errors
- Validation errors
- Server errors (4xx, 5xx)
- Timeout errors`,
    variables: ['selector', 'action'],
  },
  {
    id: 'make-responsive',
    name: 'Make Responsive',
    category: 'element',
    template: `## Make Element Responsive

### Element
- Selector: {{selector}}
- Current Behavior: {{currentBehavior}}

### Breakpoints to Support
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Requirements
- Adjust layout for each breakpoint
- Maintain functionality across devices
- Consider touch interactions on mobile
- Test with different viewport sizes`,
    variables: ['selector', 'currentBehavior'],
  },
  {
    id: 'add-validation',
    name: 'Add Validation',
    category: 'element',
    template: `## Add Form Validation

### Element
- Selector: {{selector}}
- Field Type: {{fieldType}}

### Validation Rules
{{validationRules}}

### Requirements
- Client-side validation on blur/submit
- Clear error messages
- Visual feedback (red border, error icon)
- Accessible error announcements`,
    variables: ['selector', 'fieldType', 'validationRules'],
  },
  
  // Data Actions
  {
    id: 'connect-api',
    name: 'Connect to API',
    category: 'data',
    template: `## Connect Element to API

### Element
- Selector: {{selector}}
- Data Source: {{dataSource}}

### API Details
- Endpoint: {{endpoint}}
- Method: {{method}}

### Requirements
- Fetch data on component mount
- Handle loading and error states
- Transform response data as needed
- Update UI with fetched data

### Data Mapping
{{dataMapping}}`,
    variables: ['selector', 'dataSource', 'endpoint', 'method', 'dataMapping'],
  },
  {
    id: 'add-realtime',
    name: 'Add Real-time Updates',
    category: 'data',
    template: `## Add Real-time Data Updates

### Element
- Selector: {{selector}}
- Data Source: {{dataSource}}

### Requirements
- Subscribe to real-time updates via WebSocket/Socket.io
- Update UI immediately when data changes
- Handle connection/disconnection gracefully
- Show connection status indicator
- Implement reconnection logic`,
    variables: ['selector', 'dataSource'],
  },
  {
    id: 'add-pagination',
    name: 'Add Pagination',
    category: 'data',
    template: `## Add Pagination

### Element
- Selector: {{selector}}
- Data Source: {{dataSource}}

### Configuration
- Page Size: {{pageSize}}
- Show Total: {{showTotal}}

### Requirements
- Server-side pagination
- Page number display
- Next/Previous buttons
- Jump to page option
- Loading state during page change`,
    variables: ['selector', 'dataSource', 'pageSize', 'showTotal'],
  },
  {
    id: 'add-search-filter',
    name: 'Add Search/Filter',
    category: 'data',
    template: `## Add Search and Filter

### Element
- Selector: {{selector}}
- Data Source: {{dataSource}}

### Filter Options
{{filterOptions}}

### Requirements
- Debounced search input (300ms)
- Multiple filter combinations
- Clear all filters button
- URL state persistence
- Filter count indicator`,
    variables: ['selector', 'dataSource', 'filterOptions'],
  },
  
  // Page Actions
  {
    id: 'inspect-section',
    name: 'Inspect Section',
    category: 'page',
    template: `## Section Inspection Report

### Page: {{page}}
### Section: {{section}}

### Current Structure
{{structure}}

### Issues Found
{{issues}}

### Recommendations
- Review and address the issues listed above
- Ensure consistent styling with the rest of the page
- Verify data flow and state management`,
    variables: ['page', 'section', 'structure', 'issues'],
  },
  {
    id: 'optimize-performance',
    name: 'Optimize Performance',
    category: 'page',
    template: `## Performance Optimization

### Page: {{page}}
### Component: {{component}}

### Current Issues
{{issues}}

### Optimization Targets
- Reduce bundle size
- Minimize re-renders
- Lazy load components
- Optimize images
- Implement caching

### Metrics to Track
- Time to First Byte (TTFB)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)`,
    variables: ['page', 'component', 'issues'],
  },
  {
    id: 'add-accessibility',
    name: 'Add Accessibility',
    category: 'page',
    template: `## Accessibility Improvements

### Page: {{page}}
### Section: {{section}}

### WCAG Requirements
- Level AA compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Focus management

### Current Issues
{{issues}}

### Implementation Checklist
- [ ] Add proper ARIA labels
- [ ] Ensure keyboard navigability
- [ ] Add skip links
- [ ] Test with screen reader
- [ ] Verify color contrast`,
    variables: ['page', 'section', 'issues'],
  },
  
  // Error Diagnosis
  {
    id: 'diagnose-error',
    name: 'Diagnose Error',
    category: 'error',
    template: `## Error Diagnosis

### Error Message
{{errorMessage}}

### Stack Trace
\`\`\`
{{stackTrace}}
\`\`\`

### Reproduction Steps
{{steps}}

### Console Output
{{consoleOutput}}

### Network Requests
{{networkRequests}}

### Expected Behavior
{{expectedBehavior}}

### Environment
- Page: {{page}}
- Browser: {{browser}}
- Time: {{timestamp}}`,
    variables: [
      'errorMessage', 
      'stackTrace', 
      'steps', 
      'consoleOutput', 
      'networkRequests',
      'expectedBehavior',
      'page',
      'browser',
      'timestamp'
    ],
  },
];

export function getTemplatesByCategory(category: string): PromptTemplate[] {
  return PROMPT_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): PromptTemplate | undefined {
  return PROMPT_TEMPLATES.find((t) => t.id === id);
}

export function fillTemplate(
  template: PromptTemplate,
  values: Record<string, string>
): string {
  let result = template.template;
  
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '[Not specified]');
  }
  
  return result;
}
```

#### 5.2 QuickActionPrompts.tsx

```typescript
// src/components/devmode/panels/QuickActionPrompts.tsx

'use client';

import React, { useState } from 'react';
import { PROMPT_TEMPLATES, getTemplatesByCategory, fillTemplate } from '../utils/promptTemplates';
import { useDevMode } from '../hooks/useDevMode';
import { PromptTemplate } from '../types/devmode.types';
import { 
  Zap, 
  Database, 
  Layout, 
  AlertTriangle,
  ChevronDown,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { id: 'element', label: 'Element', icon: Zap },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'page', label: 'Page', icon: Layout },
  { id: 'error', label: 'Error', icon: AlertTriangle },
];

interface QuickActionPromptsProps {
  onApplyTemplate: (prompt: string) => void;
}

export function QuickActionPrompts({ onApplyTemplate }: QuickActionPromptsProps) {
  const { state } = useDevMode();
  const [selectedCategory, setSelectedCategory] = useState('element');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const templates = getTemplatesByCategory(selectedCategory);

  const handleApply = (template: PromptTemplate) => {
    // Pre-fill variables from current state
    const values: Record<string, string> = {
      page: state.currentPage,
      selector: state.selectedElement?.selector || '',
      elementType: state.selectedElement?.tagName || '',
      location: state.selectedElement 
        ? `${state.selectedElement.boundingRect.x}, ${state.selectedElement.boundingRect.y}`
        : '',
      timestamp: new Date().toISOString(),
      browser: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    // If we have database selection, add that
    if (state.selectedSchema && state.selectedTable) {
      values.dataSource = `${state.selectedSchema}.${state.selectedTable}`;
      values.dataMapping = state.selectedColumns.join(', ');
    }

    const filledPrompt = fillTemplate(template, values);
    onApplyTemplate(filledPrompt);
    
    // Show copied feedback
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Category Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors',
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              )}
            >
              <Icon className="w-3 h-3" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Templates List */}
      <div className="space-y-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden"
          >
            <button
              onClick={() => setExpandedTemplate(
                expandedTemplate === template.id ? null : template.id
              )}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-700 transition-colors"
            >
              <span className="text-sm text-white">{template.name}</span>
              <ChevronDown 
                className={cn(
                  'w-4 h-4 text-slate-400 transition-transform',
                  expandedTemplate === template.id && 'rotate-180'
                )}
              />
            </button>
            
            {expandedTemplate === template.id && (
              <div className="px-3 pb-3 space-y-2">
                <p className="text-xs text-slate-400">
                  Variables: {template.variables.join(', ')}
                </p>
                <pre className="text-xs text-slate-300 bg-slate-900 p-2 rounded max-h-32 overflow-auto">
                  {template.template.substring(0, 200)}...
                </pre>
                <button
                  onClick={() => handleApply(template)}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    copiedId === template.id
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  )}
                >
                  {copiedId === template.id ? (
                    <>
                      <Check className="w-3 h-3" />
                      Applied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Apply Template
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 6. Feature 5: Continuous Inspection Flow

### Overview
Replace the modal-based workflow with a persistent sidebar panel that allows continuous element selection and specification creation without interrupting the flow.

### Implementation

#### 6.1 DevModePanel.tsx (Main Sidebar)

```typescript
// src/components/devmode/DevModePanel.tsx

'use client';

import React, { useState } from 'react';
import { useDevMode } from './hooks/useDevMode';
import { ModeToolbar } from './ModeToolbar';
import { ElementConfigurator } from './panels/ElementConfigurator';
import { DatabaseBrowser } from './panels/DatabaseBrowser';
import { QuickActionPrompts } from './panels/QuickActionPrompts';
import { PromptBuilder } from './panels/PromptBuilder';
import { AnnotationToolbar } from './panels/AnnotationToolbar';
import { RecordingControls } from './panels/RecordingControls';
import { SpecsList } from './panels/SpecsList';
import { 
  X, 
  ChevronLeft,
  ChevronRight,
  Settings,
  FileText,
  Download,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'config' | 'data' | 'prompts' | 'windsurf';

export function DevModePanel() {
  const { state, dispatch, clearSession } = useDevMode();
  const [activeTab, setActiveTab] = useState<Tab>('config');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  if (!state.isEnabled) {
    return null;
  }

  const specsOnThisPage = state.specs.filter(
    (s) => s.page === state.currentPage
  );

  return (
    <div
      data-devmode-panel
      className={cn(
        'fixed top-0 right-0 h-full bg-slate-900 border-l border-slate-700 shadow-2xl z-[10000] transition-all duration-300',
        isCollapsed ? 'w-12' : 'w-96'
      )}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-slate-800 border border-slate-700 rounded-l-lg flex items-center justify-center text-slate-400 hover:text-white z-10"
      >
        {isCollapsed ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Collapsed View */}
      {isCollapsed && (
        <div className="h-full flex flex-col items-center py-4 gap-4">
          <div className="text-blue-400 font-bold text-xs [writing-mode:vertical-lr]">
            DevMode
          </div>
          <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
            {state.specs.length}
          </div>
        </div>
      )}

      {/* Expanded View */}
      {!isCollapsed && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Dev Mode</span>
              <span className="px-1.5 py-0.5 text-xs bg-green-600 text-white rounded">
                Active
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => dispatch({ type: 'SET_ENABLED', payload: false })}
                className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700"
                title="Close DevMode"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Toolbar */}
          <div className="p-3 border-b border-slate-700">
            <ModeToolbar />
          </div>

          {/* Mode-specific Controls */}
          {state.currentMode === 'annotate' && (
            <div className="p-3 border-b border-slate-700">
              <AnnotationToolbar />
            </div>
          )}
          {state.currentMode === 'record' && (
            <div className="p-3 border-b border-slate-700">
              <RecordingControls />
            </div>
          )}

          {/* Current Selection */}
          {state.selectedElement && (
            <div className="p-3 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">
                  Selected Element
                </span>
                <button
                  onClick={() => dispatch({ type: 'SET_SELECTED_ELEMENT', payload: null })}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  Clear
                </button>
              </div>
              <div className="p-2 bg-slate-900 rounded text-xs font-mono text-slate-300 truncate">
                {state.selectedElement.selector}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {[
              { id: 'config', label: 'Config' },
              { id: 'data', label: 'Data' },
              { id: 'prompts', label: 'Actions' },
              { id: 'windsurf', label: 'Windsurf' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'config' && (
              <ElementConfigurator />
            )}
            {activeTab === 'data' && (
              <DatabaseBrowser />
            )}
            {activeTab === 'prompts' && (
              <QuickActionPrompts 
                onApplyTemplate={(prompt) => {
                  setGeneratedPrompt(prompt);
                  setActiveTab('windsurf');
                }}
              />
            )}
            {activeTab === 'windsurf' && (
              <PromptBuilder 
                initialPrompt={generatedPrompt}
                onPromptChange={setGeneratedPrompt}
              />
            )}
          </div>

          {/* Specs Summary */}
          <div className="border-t border-slate-700">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400">
                  Session Specs
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {state.specs.length} total / {specsOnThisPage.length} this page
                  </span>
                </div>
              </div>
              
              <SpecsList />
              
              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    // Export logic
                  }}
                  disabled={state.specs.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-3 h-3" />
                  Export All
                </button>
                <button
                  onClick={clearSession}
                  disabled={state.specs.length === 0}
                  className="px-3 py-1.5 text-red-400 text-xs font-medium rounded hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-700 bg-slate-800/50">
            <p className="text-xs text-slate-500 text-center">
              {state.currentPage}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 6.2 SpecsList.tsx

```typescript
// src/components/devmode/panels/SpecsList.tsx

'use client';

import React from 'react';
import { useDevMode } from '../hooks/useDevMode';
import { 
  Pencil, 
  Trash2, 
  ChevronRight,
  Circle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_ICONS = {
  draft: Clock,
  ready: Circle,
  implemented: CheckCircle,
};

const STATUS_COLORS = {
  draft: 'text-yellow-400',
  ready: 'text-blue-400',
  implemented: 'text-green-400',
};

export function SpecsList() {
  const { state, dispatch, removeSpec } = useDevMode();
  
  if (state.specs.length === 0) {
    return (
      <div className="text-center py-4 text-slate-500 text-xs">
        No specs created yet
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-40 overflow-y-auto">
      {state.specs.map((spec) => {
        const StatusIcon = STATUS_ICONS[spec.status];
        return (
          <div
            key={spec.id}
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors group',
              state.currentSpec?.id === spec.id && 'ring-1 ring-blue-500'
            )}
          >
            <StatusIcon className={cn('w-3 h-3', STATUS_COLORS[spec.status])} />
            
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white truncate">
                {spec.description || spec.behaviorType}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {spec.elementInfo?.selector || 'New element'}
              </p>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => dispatch({ type: 'SET_CURRENT_SPEC', payload: spec })}
                className="p-1 text-slate-400 hover:text-white rounded"
                title="Edit"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                onClick={() => removeSpec(spec.id)}
                className="p-1 text-slate-400 hover:text-red-400 rounded"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## 7. Feature 6: Annotation Tools

### Overview
Drawing and annotation capabilities that overlay on the page, allowing users to visually highlight, mark up, and comment on specific areas.

### Implementation

#### 7.1 AnnotationToolbar.tsx

```typescript
// src/components/devmode/panels/AnnotationToolbar.tsx

'use client';

import React from 'react';
import { useDevMode } from '../hooks/useDevMode';
import { AnnotationTool, AnnotationType } from '../types/devmode.types';
import { 
  MousePointer2,
  MoveRight,
  Square,
  Pencil,
  Type,
  Hash,
  Bug,
  Lightbulb,
  Sparkles,
  HelpCircle,
  Undo,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TOOLS: { id: AnnotationTool; icon: React.ElementType; label: string }[] = [
  { id: 'arrow', icon: MoveRight, label: 'Arrow' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'freehand', icon: Pencil, label: 'Freehand' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'marker', icon: Hash, label: 'Marker' },
];

const ANNOTATION_TYPES: { id: AnnotationType; icon: React.ElementType; label: string; color: string }[] = [
  { id: 'bug', icon: Bug, label: 'Bug', color: '#ef4444' },
  { id: 'improvement', icon: Lightbulb, label: 'Improvement', color: '#eab308' },
  { id: 'feature', icon: Sparkles, label: 'Feature', color: '#22c55e' },
  { id: 'question', icon: HelpCircle, label: 'Question', color: '#3b82f6' },
];

export function AnnotationToolbar() {
  const { state, dispatch } = useDevMode();
  const [selectedType, setSelectedType] = React.useState<AnnotationType>('bug');

  const handleToolSelect = (tool: AnnotationTool) => {
    dispatch({ type: 'SET_ANNOTATION_TOOL', payload: tool });
  };

  const handleUndo = () => {
    if (state.annotations.length > 0) {
      const lastAnnotation = state.annotations[state.annotations.length - 1];
      dispatch({ type: 'REMOVE_ANNOTATION', payload: lastAnnotation.id });
    }
  };

  const handleClearAll = () => {
    dispatch({ type: 'CLEAR_ANNOTATIONS' });
  };

  return (
    <div className="space-y-3">
      {/* Drawing Tools */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">
          Tool
        </label>
        <div className="flex gap-1">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => handleToolSelect(tool.id)}
                className={cn(
                  'p-2 rounded transition-colors',
                  state.activeAnnotationTool === tool.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                )}
                title={tool.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Annotation Type */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">
          Type
        </label>
        <div className="flex gap-1">
          {ANNOTATION_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  'p-2 rounded transition-colors',
                  selectedType === type.id
                    ? 'ring-2'
                    : 'bg-slate-800 hover:bg-slate-700'
                )}
                style={{
                  backgroundColor: selectedType === type.id ? type.color + '20' : undefined,
                  color: selectedType === type.id ? type.color : '#94a3b8',
                  ringColor: type.color,
                }}
                title={type.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleUndo}
          disabled={state.annotations.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded hover:bg-slate-700 disabled:opacity-50"
        >
          <Undo className="w-3 h-3" />
          Undo
        </button>
        <button
          onClick={handleClearAll}
          disabled={state.annotations.length === 0}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-900/30 text-red-400 text-xs rounded hover:bg-red-900/50 disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" />
          Clear All
        </button>
      </div>

      {/* Count */}
      <div className="text-xs text-slate-500 text-center">
        {state.annotations.length} annotation{state.annotations.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
```

#### 7.2 AnnotationCanvas.tsx

```typescript
// src/components/devmode/canvas/AnnotationCanvas.tsx

'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useDevMode } from '../hooks/useDevMode';
import { Point, Annotation, AnnotationTool } from '../types/devmode.types';

export function AnnotationCanvas() {
  const { state, addAnnotation, dispatch } = useDevMode();
  const canvasRef = useRef<SVGSVGElement>(null);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInput, setTextInput] = useState<{ position: Point; value: string } | null>(null);

  // Only active in annotate mode
  if (state.currentMode !== 'annotate' || !state.isEnabled) {
    return null;
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!state.activeAnnotationTool) return;
    if (state.activeAnnotationTool === 'text') {
      setTextInput({
        position: { x: e.clientX, y: e.clientY },
        value: '',
      });
      return;
    }

    setIsDrawing(true);
    setCurrentPoints([{ x: e.clientX, y: e.clientY }]);
    dispatch({ type: 'SET_IS_DRAWING', payload: true });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !state.activeAnnotationTool) return;
    
    const newPoint = { x: e.clientX, y: e.clientY };
    
    if (state.activeAnnotationTool === 'freehand') {
      setCurrentPoints((prev) => [...prev, newPoint]);
    } else {
      // For arrow, rectangle, marker - just update end point
      setCurrentPoints((prev) => [prev[0], newPoint]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentPoints.length < 2) {
      setIsDrawing(false);
      setCurrentPoints([]);
      dispatch({ type: 'SET_IS_DRAWING', payload: false });
      return;
    }

    // Create annotation
    addAnnotation({
      type: 'bug', // Default, should come from state
      tool: state.activeAnnotationTool!,
      points: currentPoints,
      color: '#ef4444',
    });

    setIsDrawing(false);
    setCurrentPoints([]);
    dispatch({ type: 'SET_IS_DRAWING', payload: false });
  };

  const handleTextSubmit = () => {
    if (!textInput || !textInput.value.trim()) {
      setTextInput(null);
      return;
    }

    addAnnotation({
      type: 'bug',
      tool: 'text',
      points: [textInput.position],
      text: textInput.value,
      color: '#ef4444',
    });

    setTextInput(null);
  };

  const renderAnnotation = (annotation: Annotation) => {
    const { tool, points, color, text, id } = annotation;

    switch (tool) {
      case 'arrow':
        if (points.length < 2) return null;
        const [start, end] = points;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const arrowLength = 12;
        
        return (
          <g key={id}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={color}
              strokeWidth="2"
            />
            {/* Arrow head */}
            <polygon
              points={`
                ${end.x},${end.y}
                ${end.x - arrowLength * Math.cos(angle - Math.PI / 6)},${end.y - arrowLength * Math.sin(angle - Math.PI / 6)}
                ${end.x - arrowLength * Math.cos(angle + Math.PI / 6)},${end.y - arrowLength * Math.sin(angle + Math.PI / 6)}
              `}
              fill={color}
            />
          </g>
        );

      case 'rectangle':
        if (points.length < 2) return null;
        const [p1, p2] = points;
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const width = Math.abs(p2.x - p1.x);
        const height = Math.abs(p2.y - p1.y);
        
        return (
          <rect
            key={id}
            x={x}
            y={y}
            width={width}
            height={height}
            fill={color + '20'}
            stroke={color}
            strokeWidth="2"
            rx="4"
          />
        );

      case 'freehand':
        if (points.length < 2) return null;
        const pathData = points.reduce((acc, point, i) => {
          return acc + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
        }, '');
        
        return (
          <path
            key={id}
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      case 'marker':
        if (points.length < 1) return null;
        const markerIndex = state.annotations.filter((a) => a.tool === 'marker').indexOf(annotation) + 1;
        
        return (
          <g key={id}>
            <circle
              cx={points[0].x}
              cy={points[0].y}
              r="14"
              fill={color}
            />
            <text
              x={points[0].x}
              y={points[0].y + 5}
              textAnchor="middle"
              fill="white"
              fontSize="12"
              fontWeight="bold"
            >
              {markerIndex}
            </text>
          </g>
        );

      case 'text':
        if (points.length < 1 || !text) return null;
        
        return (
          <g key={id}>
            <rect
              x={points[0].x - 4}
              y={points[0].y - 16}
              width={text.length * 8 + 8}
              height={24}
              fill={color + '20'}
              stroke={color}
              rx="4"
            />
            <text
              x={points[0].x}
              y={points[0].y}
              fill={color}
              fontSize="14"
              fontWeight="500"
            >
              {text}
            </text>
          </g>
        );

      default:
        return null;
    }
  };

  // Render current drawing in progress
  const renderCurrentDrawing = () => {
    if (!isDrawing || currentPoints.length < 1) return null;
    
    const tempAnnotation: Annotation = {
      id: 'temp',
      type: 'bug',
      tool: state.activeAnnotationTool!,
      points: currentPoints,
      color: '#ef4444',
      createdAt: new Date(),
    };
    
    return renderAnnotation(tempAnnotation);
  };

  return (
    <>
      {/* SVG Canvas */}
      <svg
        ref={canvasRef}
        className="fixed inset-0 z-[9998] pointer-events-auto"
        style={{ cursor: state.activeAnnotationTool ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Existing annotations */}
        {state.annotations.map(renderAnnotation)}
        
        {/* Current drawing */}
        {renderCurrentDrawing()}
      </svg>

      {/* Text input popup */}
      {textInput && (
        <div
          className="fixed z-[10001]"
          style={{ left: textInput.position.x, top: textInput.position.y }}
        >
          <input
            type="text"
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit();
              if (e.key === 'Escape') setTextInput(null);
            }}
            onBlur={handleTextSubmit}
            autoFocus
            className="px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-sm min-w-[150px]"
            placeholder="Type annotation..."
          />
        </div>
      )}
    </>
  );
}
```

---

## 8. Feature 7: Error Recording Mode

### Overview
A recording mode that captures user interactions, console errors, network requests, and screenshots to create comprehensive error reports.

### Implementation

#### 8.1 useRecorder Hook

```typescript
// src/components/devmode/hooks/useRecorder.ts

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useDevMode } from './useDevMode';
import { 
  InteractionEvent, 
  ConsoleError, 
  NetworkRequest, 
  Screenshot 
} from '../types/devmode.types';
import html2canvas from 'html2canvas';

export function useRecorder() {
  const { state, dispatch } = useDevMode();
  const originalConsoleError = useRef<typeof console.error | null>(null);
  const originalConsoleWarn = useRef<typeof console.warn | null>(null);
  const originalFetch = useRef<typeof fetch | null>(null);
  const originalXHROpen = useRef<XMLHttpRequest['open'] | null>(null);

  // Capture screenshot
  const captureScreenshot = useCallback(async (label?: string): Promise<Screenshot | null> => {
    try {
      const canvas = await html2canvas(document.body, {
        ignoreElements: (element) => {
          return element.hasAttribute('data-devmode') || 
                 element.hasAttribute('data-devmode-panel');
        },
      });
      
      return {
        dataUrl: canvas.toDataURL('image/png'),
        timestamp: new Date(),
        label,
      };
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      return null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (state.isRecording) return;
    
    dispatch({ type: 'START_RECORDING' });
    
    // Override console.error
    originalConsoleError.current = console.error;
    console.error = (...args: any[]) => {
      const error: ConsoleError = {
        type: 'error',
        message: args.map(String).join(' '),
        timestamp: new Date(),
      };
      
      dispatch({
        type: 'UPDATE_RECORDING_DATA',
        payload: {
          consoleErrors: [
            ...(state.recordingData?.consoleErrors || []),
            error,
          ],
        },
      });
      
      originalConsoleError.current?.apply(console, args);
    };

    // Override console.warn
    originalConsoleWarn.current = console.warn;
    console.warn = (...args: any[]) => {
      const warning: ConsoleError = {
        type: 'warning',
        message: args.map(String).join(' '),
        timestamp: new Date(),
      };
      
      dispatch({
        type: 'UPDATE_RECORDING_DATA',
        payload: {
          consoleErrors: [
            ...(state.recordingData?.consoleErrors || []),
            warning,
          ],
        },
      });
      
      originalConsoleWarn.current?.apply(console, args);
    };

    // Override fetch
    originalFetch.current = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startTime = Date.now();
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method || 'GET';
      
      try {
        const response = await originalFetch.current!(input, init);
        const duration = Date.now() - startTime;
        
        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        let responseBody: any;
        try {
          responseBody = await clonedResponse.json();
        } catch {
          responseBody = await clonedResponse.text();
        }
        
        const request: NetworkRequest = {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          requestBody: init?.body,
          responseBody,
          duration,
          timestamp: new Date(),
        };
        
        dispatch({
          type: 'UPDATE_RECORDING_DATA',
          payload: {
            networkRequests: [
              ...(state.recordingData?.networkRequests || []),
              request,
            ],
          },
        });
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        const request: NetworkRequest = {
          url,
          method,
          status: 0,
          statusText: 'Network Error',
          duration,
          timestamp: new Date(),
          error: String(error),
        };
        
        dispatch({
          type: 'UPDATE_RECORDING_DATA',
          payload: {
            networkRequests: [
              ...(state.recordingData?.networkRequests || []),
              request,
            ],
          },
        });
        
        throw error;
      }
    };

    // Add click listener for interactions
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-devmode-panel]')) return;
      
      const interaction: InteractionEvent = {
        type: 'click',
        timestamp: new Date(),
        target: generateSelector(target),
        coordinates: { x: e.clientX, y: e.clientY },
      };
      
      dispatch({
        type: 'UPDATE_RECORDING_DATA',
        payload: {
          interactions: [
            ...(state.recordingData?.interactions || []),
            interaction,
          ],
        },
      });
    };

    document.addEventListener('click', handleClick, true);

    // Store cleanup function
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [state.isRecording, state.recordingData, dispatch]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!state.isRecording) return;
    
    // Capture final screenshot
    const screenshot = await captureScreenshot('Final state');
    if (screenshot) {
      dispatch({
        type: 'UPDATE_RECORDING_DATA',
        payload: {
          screenshots: [
            ...(state.recordingData?.screenshots || []),
            screenshot,
          ],
        },
      });
    }
    
    // Restore console methods
    if (originalConsoleError.current) {
      console.error = originalConsoleError.current;
    }
    if (originalConsoleWarn.current) {
      console.warn = originalConsoleWarn.current;
    }
    if (originalFetch.current) {
      window.fetch = originalFetch.current;
    }
    
    dispatch({ type: 'STOP_RECORDING' });
  }, [state.isRecording, state.recordingData, captureScreenshot, dispatch]);

  // Add screenshot manually
  const addScreenshot = useCallback(async (label?: string) => {
    const screenshot = await captureScreenshot(label);
    if (screenshot && state.recordingData) {
      dispatch({
        type: 'UPDATE_RECORDING_DATA',
        payload: {
          screenshots: [...state.recordingData.screenshots, screenshot],
        },
      });
    }
  }, [captureScreenshot, state.recordingData, dispatch]);

  return {
    isRecording: state.isRecording,
    recordingData: state.recordingData,
    startRecording,
    stopRecording,
    captureScreenshot: addScreenshot,
  };
}

// Helper function
function generateSelector(element: HTMLElement): string {
  if (element.id) return `#${element.id}`;
  
  let selector = element.tagName.toLowerCase();
  if (element.className) {
    const classes = element.className.split(' ').filter(Boolean).slice(0, 2);
    if (classes.length) selector += '.' + classes.join('.');
  }
  
  return selector;
}
```

#### 8.2 RecordingControls.tsx

```typescript
// src/components/devmode/panels/RecordingControls.tsx

'use client';

import React, { useState } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import { 
  Circle, 
  Square, 
  Camera, 
  Clock,
  AlertCircle,
  Globe,
  MousePointer
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function RecordingControls() {
  const { isRecording, recordingData, startRecording, stopRecording, captureScreenshot } = useRecorder();
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer for recording duration
  React.useEffect(() => {
    if (!isRecording || !recordingData?.startTime) {
      setElapsedTime(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - recordingData.startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, recordingData?.startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      {/* Recording Status */}
      <div className={cn(
        'flex items-center justify-between p-3 rounded-lg',
        isRecording ? 'bg-red-900/30 border border-red-700' : 'bg-slate-800'
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-3 h-3 rounded-full',
            isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-500'
          )} />
          <span className={cn(
            'text-sm font-medium',
            isRecording ? 'text-red-400' : 'text-slate-400'
          )}>
            {isRecording ? 'Recording' : 'Not Recording'}
          </span>
        </div>
        
        {isRecording && (
          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3" />
            <span className="text-xs font-mono">{formatTime(elapsedTime)}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Circle className="w-4 h-4 fill-current" />
            Start Recording
          </button>
        ) : (
          <>
            <button
              onClick={stopRecording}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop
            </button>
            <button
              onClick={() => captureScreenshot('Manual capture')}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              title="Capture Screenshot"
            >
              <Camera className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Recording Stats */}
      {recordingData && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-slate-800 rounded text-center">
            <MousePointer className="w-4 h-4 mx-auto text-slate-400 mb-1" />
            <p className="text-lg font-bold text-white">
              {recordingData.interactions.length}
            </p>
            <p className="text-xs text-slate-500">Clicks</p>
          </div>
          <div className="p-2 bg-slate-800 rounded text-center">
            <AlertCircle className="w-4 h-4 mx-auto text-red-400 mb-1" />
            <p className="text-lg font-bold text-white">
              {recordingData.consoleErrors.filter((e) => e.type === 'error').length}
            </p>
            <p className="text-xs text-slate-500">Errors</p>
          </div>
          <div className="p-2 bg-slate-800 rounded text-center">
            <Globe className="w-4 h-4 mx-auto text-blue-400 mb-1" />
            <p className="text-lg font-bold text-white">
              {recordingData.networkRequests.length}
            </p>
            <p className="text-xs text-slate-500">Requests</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !recordingData && (
        <div className="p-3 bg-slate-800/50 rounded-lg">
          <p className="text-xs text-slate-400">
            Record your actions to capture:
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            <li>• Click interactions</li>
            <li>• Console errors & warnings</li>
            <li>• Network requests</li>
            <li>• Screenshots</li>
          </ul>
        </div>
      )}
    </div>
  );
}
```

#### 8.3 Error Report Generator

```typescript
// src/components/devmode/utils/errorReportGenerator.ts

import { RecordingData } from '../types/devmode.types';

export function generateErrorReport(recording: RecordingData, description?: string): string {
  const lines: string[] = [];
  
  lines.push('## Error Diagnosis Request\n');
  
  if (description) {
    lines.push('### Description');
    lines.push(description);
    lines.push('');
  }
  
  // Reproduction steps
  lines.push('### Reproduction Steps');
  recording.interactions.forEach((interaction, i) => {
    const time = formatTimestamp(interaction.timestamp, recording.startTime);
    lines.push(`${i + 1}. [${time}] ${interaction.type} on \`${interaction.target}\``);
  });
  lines.push('');
  
  // Console errors
  const errors = recording.consoleErrors.filter((e) => e.type === 'error');
  if (errors.length > 0) {
    lines.push('### Console Errors');
    errors.forEach((error) => {
      lines.push('```');
      lines.push(error.message);
      if (error.stack) {
        lines.push(error.stack);
      }
      lines.push('```');
    });
    lines.push('');
  }
  
  // Console warnings
  const warnings = recording.consoleErrors.filter((e) => e.type === 'warning');
  if (warnings.length > 0) {
    lines.push('### Console Warnings');
    warnings.forEach((warning) => {
      lines.push(`- ${warning.message}`);
    });
    lines.push('');
  }
  
  // Network requests
  const failedRequests = recording.networkRequests.filter(
    (r) => r.status >= 400 || r.status === 0
  );
  if (failedRequests.length > 0) {
    lines.push('### Failed Network Requests');
    failedRequests.forEach((req) => {
      lines.push(`**${req.method} ${req.url}**`);
      lines.push(`- Status: ${req.status} ${req.statusText}`);
      lines.push(`- Duration: ${req.duration}ms`);
      if (req.error) {
        lines.push(`- Error: ${req.error}`);
      }
      if (req.responseBody) {
        lines.push('- Response:');
        lines.push('```json');
        lines.push(JSON.stringify(req.responseBody, null, 2).substring(0, 500));
        lines.push('```');
      }
      lines.push('');
    });
  }
  
  // All network requests summary
  lines.push('### Network Request Summary');
  lines.push(`- Total requests: ${recording.networkRequests.length}`);
  lines.push(`- Failed: ${failedRequests.length}`);
  lines.push(`- Successful: ${recording.networkRequests.length - failedRequests.length}`);
  lines.push('');
  
  // Screenshots
  if (recording.screenshots.length > 0) {
    lines.push('### Screenshots');
    lines.push(`${recording.screenshots.length} screenshot(s) captured`);
    lines.push('');
  }
  
  // Session info
  lines.push('### Session Info');
  lines.push(`- Start Time: ${recording.startTime.toISOString()}`);
  if (recording.endTime) {
    lines.push(`- End Time: ${recording.endTime.toISOString()}`);
    lines.push(`- Duration: ${Math.round((recording.endTime.getTime() - recording.startTime.getTime()) / 1000)}s`);
  }
  lines.push(`- Page: ${window.location.pathname}`);
  lines.push(`- Browser: ${navigator.userAgent}`);
  
  return lines.join('\n');
}

function formatTimestamp(timestamp: Date, startTime: Date): string {
  const diff = Math.round((timestamp.getTime() - startTime.getTime()) / 1000);
  const mins = Math.floor(diff / 60);
  const secs = diff % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

---

## 9. Feature 8: Keyboard Shortcuts

### Implementation

```typescript
// src/components/devmode/hooks/useKeyboardShortcuts.ts

'use client';

import { useEffect, useCallback } from 'react';
import { useDevMode } from './useDevMode';
import { DevModeMode } from '../types/devmode.types';

const MODE_SHORTCUTS: Record<string, DevModeMode> = {
  '1': 'inspect',
  '2': 'add',
  '3': 'connect',
  '4': 'annotate',
  '5': 'record',
};

export function useKeyboardShortcuts() {
  const { state, dispatch, toggleEnabled, setMode, clearSession } = useDevMode();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const isMeta = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;

    // Cmd+Shift+D - Toggle DevMode
    if (isMeta && isShift && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      toggleEnabled();
      return;
    }

    // Only process these if DevMode is enabled
    if (!state.isEnabled) return;

    // Number keys 1-5 - Switch modes
    if (!isMeta && !isShift && MODE_SHORTCUTS[e.key]) {
      e.preventDefault();
      setMode(MODE_SHORTCUTS[e.key]);
      return;
    }

    // Escape - Clear selection / Close panel
    if (e.key === 'Escape') {
      e.preventDefault();
      if (state.selectedElement) {
        dispatch({ type: 'SET_SELECTED_ELEMENT', payload: null });
      } else if (state.isPanelOpen) {
        dispatch({ type: 'SET_PANEL_OPEN', payload: false });
      }
      return;
    }

    // Cmd+S - Save current spec
    if (isMeta && e.key.toLowerCase() === 's' && state.selectedElement) {
      e.preventDefault();
      // Trigger save in current context
      document.dispatchEvent(new CustomEvent('devmode:save-spec'));
      return;
    }

    // Cmd+E - Export all specs
    if (isMeta && e.key.toLowerCase() === 'e' && state.specs.length > 0) {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('devmode:export-specs'));
      return;
    }

    // Space - Quick-add spec for current selection
    if (e.key === ' ' && state.selectedElement && !e.repeat) {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('devmode:quick-add-spec'));
      return;
    }

    // Cmd+Z - Undo last annotation (in annotate mode)
    if (isMeta && e.key.toLowerCase() === 'z' && state.currentMode === 'annotate') {
      e.preventDefault();
      if (state.annotations.length > 0) {
        const lastAnnotation = state.annotations[state.annotations.length - 1];
        dispatch({ type: 'REMOVE_ANNOTATION', payload: lastAnnotation.id });
      }
      return;
    }

  }, [state, dispatch, toggleEnabled, setMode]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null;
}
```

#### Keyboard Shortcuts Help Component

```typescript
// src/components/devmode/panels/KeyboardShortcuts.tsx

'use client';

import React from 'react';
import { Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['⌘', 'Shift', 'D'], description: 'Toggle DevMode' },
  { keys: ['1'], description: 'Inspect mode' },
  { keys: ['2'], description: 'Add mode' },
  { keys: ['3'], description: 'Connect mode' },
  { keys: ['4'], description: 'Annotate mode' },
  { keys: ['5'], description: 'Record mode' },
  { keys: ['Esc'], description: 'Clear selection' },
  { keys: ['⌘', 'S'], description: 'Save spec' },
  { keys: ['⌘', 'E'], description: 'Export all' },
  { keys: ['Space'], description: 'Quick-add spec' },
  { keys: ['⌘', 'Z'], description: 'Undo annotation' },
];

export function KeyboardShortcuts() {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-slate-400 mb-3">
        <Keyboard className="w-4 h-4" />
        <span className="text-xs font-medium">Keyboard Shortcuts</span>
      </div>
      
      <div className="space-y-1">
        {SHORTCUTS.map((shortcut, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="flex gap-1">
              {shortcut.keys.map((key, j) => (
                <kbd
                  key={j}
                  className="px-1.5 py-0.5 text-xs bg-slate-700 text-slate-300 rounded border border-slate-600"
                >
                  {key}
                </kbd>
              ))}
            </div>
            <span className="text-xs text-slate-500">{shortcut.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 10. Feature 9: Export Enhancements

### Implementation

#### 10.1 Export Utilities

```typescript
// src/components/devmode/utils/exportUtils.ts

import { ElementSpec, Annotation, RecordingData } from '../types/devmode.types';
import { generateErrorReport } from './errorReportGenerator';
import JSZip from 'jszip';

export interface ExportOptions {
  format: 'markdown' | 'json' | 'zip';
  includeScreenshots: boolean;
  includeAnnotations: boolean;
}

export async function exportSpecs(
  specs: ElementSpec[],
  annotations: Annotation[],
  recordingData: RecordingData | null,
  options: ExportOptions
): Promise<{ filename: string; content: Blob }> {
  
  switch (options.format) {
    case 'markdown':
      return exportAsMarkdown(specs, annotations, recordingData, options);
    case 'json':
      return exportAsJson(specs, annotations, recordingData);
    case 'zip':
      return exportAsZip(specs, annotations, recordingData, options);
    default:
      throw new Error('Unsupported export format');
  }
}

function exportAsMarkdown(
  specs: ElementSpec[],
  annotations: Annotation[],
  recordingData: RecordingData | null,
  options: ExportOptions
): { filename: string; content: Blob } {
  const lines: string[] = [];
  const timestamp = new Date().toISOString().split('T')[0];
  
  lines.push('# DevMode Specification Export');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Page: ${window.location.pathname}`);
  lines.push('');
  
  // Specs
  lines.push('## Specifications');
  lines.push('');
  
  specs.forEach((spec, i) => {
    lines.push(`### ${i + 1}. ${spec.behaviorType}: ${spec.description || 'Untitled'}`);
    lines.push('');
    lines.push(`**Priority:** ${spec.priority}`);
    lines.push(`**Status:** ${spec.status}`);
    
    if (spec.elementInfo) {
      lines.push('');
      lines.push('**Element:**');
      lines.push('```');
      lines.push(`Selector: ${spec.elementInfo.selector}`);
      lines.push(`Tag: ${spec.elementInfo.tagName}`);
      lines.push('```');
    }
    
    if (spec.dataBinding) {
      lines.push('');
      lines.push('**Data Binding:**');
      lines.push(`- Source: ${spec.dataBinding.schema}.${spec.dataBinding.table}`);
      lines.push(`- Columns: ${spec.dataBinding.columns.map((c) => c.columnName).join(', ')}`);
    }
    
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  
  // Annotations
  if (options.includeAnnotations && annotations.length > 0) {
    lines.push('## Annotations');
    lines.push('');
    
    annotations.forEach((ann, i) => {
      lines.push(`${i + 1}. **${ann.type}** (${ann.tool})`);
      if (ann.text) {
        lines.push(`   ${ann.text}`);
      }
      lines.push(`   Location: (${ann.points[0]?.x}, ${ann.points[0]?.y})`);
    });
    
    lines.push('');
  }
  
  // Recording data
  if (recordingData) {
    lines.push('## Recording Report');
    lines.push('');
    lines.push(generateErrorReport(recordingData));
  }
  
  const content = new Blob([lines.join('\n')], { type: 'text/markdown' });
  return {
    filename: `devmode-specs-${timestamp}.md`,
    content,
  };
}

function exportAsJson(
  specs: ElementSpec[],
  annotations: Annotation[],
  recordingData: RecordingData | null
): { filename: string; content: Blob } {
  const timestamp = new Date().toISOString().split('T')[0];
  
  const data = {
    exportedAt: new Date().toISOString(),
    page: window.location.pathname,
    specs: specs.map((spec) => ({
      ...spec,
      elementInfo: spec.elementInfo ? {
        selector: spec.elementInfo.selector,
        tagName: spec.elementInfo.tagName,
        className: spec.elementInfo.className,
        id: spec.elementInfo.id,
      } : null,
    })),
    annotations: annotations.map((ann) => ({
      ...ann,
      screenshot: undefined, // Remove large data
    })),
    recording: recordingData ? {
      ...recordingData,
      screenshots: recordingData.screenshots.map((s) => ({
        ...s,
        dataUrl: '[screenshot data]',
      })),
    } : null,
  };
  
  const content = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  return {
    filename: `devmode-specs-${timestamp}.json`,
    content,
  };
}

async function exportAsZip(
  specs: ElementSpec[],
  annotations: Annotation[],
  recordingData: RecordingData | null,
  options: ExportOptions
): Promise<{ filename: string; content: Blob }> {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Add markdown
  const markdown = exportAsMarkdown(specs, annotations, recordingData, options);
  zip.file('specs.md', await markdown.content.text());
  
  // Add JSON
  const json = exportAsJson(specs, annotations, recordingData);
  zip.file('specs.json', await json.content.text());
  
  // Add screenshots
  if (options.includeScreenshots && recordingData?.screenshots) {
    const screenshotsFolder = zip.folder('screenshots');
    recordingData.screenshots.forEach((screenshot, i) => {
      const base64Data = screenshot.dataUrl.split(',')[1];
      screenshotsFolder?.file(
        `screenshot-${i + 1}-${screenshot.label || 'capture'}.png`,
        base64Data,
        { base64: true }
      );
    });
  }
  
  // Add annotations with screenshots
  if (options.includeAnnotations) {
    const annotationsFolder = zip.folder('annotations');
    annotations.forEach((ann, i) => {
      if (ann.screenshot) {
        const base64Data = ann.screenshot.split(',')[1];
        annotationsFolder?.file(
          `annotation-${i + 1}-${ann.type}.png`,
          base64Data,
          { base64: true }
        );
      }
    });
  }
  
  const content = await zip.generateAsync({ type: 'blob' });
  return {
    filename: `devmode-export-${timestamp}.zip`,
    content,
  };
}

export function downloadFile(filename: string, content: Blob) {
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

#### 10.2 Export Panel Component

```typescript
// src/components/devmode/panels/ExportPanel.tsx

'use client';

import React, { useState } from 'react';
import { useDevMode } from '../hooks/useDevMode';
import { exportSpecs, downloadFile, copyToClipboard, ExportOptions } from '../utils/exportUtils';
import { 
  Download, 
  Copy, 
  FileText, 
  FileJson, 
  Archive,
  Check,
  Image,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ExportFormat = 'markdown' | 'json' | 'zip';

export function ExportPanel() {
  const { state } = useDevMode();
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [includeScreenshots, setIncludeScreenshots] = useState(true);
  const [includeAnnotations, setIncludeAnnotations] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const options: ExportOptions = {
        format,
        includeScreenshots,
        includeAnnotations,
      };
      
      const { filename, content } = await exportSpecs(
        state.specs,
        state.annotations,
        state.recordingData,
        options
      );
      
      downloadFile(filename, content);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyPrompt = async () => {
    // Generate markdown and copy to clipboard
    const options: ExportOptions = {
      format: 'markdown',
      includeScreenshots: false,
      includeAnnotations,
    };
    
    const { content } = await exportSpecs(
      state.specs,
      state.annotations,
      state.recordingData,
      options
    );
    
    const text = await content.text();
    const success = await copyToClipboard(text);
    
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatOptions = [
    { id: 'markdown', label: 'Markdown', icon: FileText },
    { id: 'json', label: 'JSON', icon: FileJson },
    { id: 'zip', label: 'ZIP Bundle', icon: Archive },
  ];

  return (
    <div className="space-y-4">
      {/* Format Selection */}
      <div>
        <label className="text-xs font-medium text-slate-400 mb-2 block">
          Export Format
        </label>
        <div className="grid grid-cols-3 gap-2">
          {formatOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => setFormat(opt.id as ExportFormat)}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                  format === opt.id
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-400 block">
          Include
        </label>
        
        <label className="flex items-center gap-2 p-2 bg-slate-800 rounded cursor-pointer hover:bg-slate-700">
          <input
            type="checkbox"
            checked={includeScreenshots}
            onChange={(e) => setIncludeScreenshots(e.target.checked)}
            className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
          />
          <Image className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">Screenshots</span>
          <span className="text-xs text-slate-500 ml-auto">
            {state.recordingData?.screenshots.length || 0}
          </span>
        </label>
        
        <label className="flex items-center gap-2 p-2 bg-slate-800 rounded cursor-pointer hover:bg-slate-700">
          <input
            type="checkbox"
            checked={includeAnnotations}
            onChange={(e) => setIncludeAnnotations(e.target.checked)}
            className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
          />
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300">Annotations</span>
          <span className="text-xs text-slate-500 ml-auto">
            {state.annotations.length}
          </span>
        </label>
      </div>

      {/* Summary */}
      <div className="p-3 bg-slate-800/50 rounded-lg">
        <p className="text-xs text-slate-400 mb-1">Export Summary</p>
        <p className="text-sm text-white">
          {state.specs.length} spec{state.specs.length !== 1 ? 's' : ''} will be exported
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={isExporting || state.specs.length === 0}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Download'}
        </button>
        
        <button
          onClick={handleCopyPrompt}
          disabled={state.specs.length === 0}
          className={cn(
            'px-4 py-2 rounded-lg transition-colors',
            copied
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-white hover:bg-slate-600'
          )}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
```

---

## 11. Database Schema & API Endpoints

### 11.1 Specs Storage Table (Optional Persistence)

```sql
-- If you want to persist specs to the database

CREATE TABLE devmode_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id),
  page_path VARCHAR(500) NOT NULL,
  spec_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_devmode_specs_session ON devmode_specs(session_id);
CREATE INDEX idx_devmode_specs_user ON devmode_specs(user_id);
CREATE INDEX idx_devmode_specs_page ON devmode_specs(page_path);
```

### 11.2 API Endpoint for Saving/Loading Specs

```typescript
// src/app/api/devmode/specs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  const page = searchParams.get('page');

  try {
    let query = db.selectFrom('devmode_specs');
    
    if (sessionId) {
      query = query.where('session_id', '=', sessionId);
    }
    if (page) {
      query = query.where('page_path', '=', page);
    }
    
    const specs = await query.selectAll().execute();
    
    return NextResponse.json({ specs });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch specs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, page, spec } = body;

    const result = await db
      .insertInto('devmode_specs')
      .values({
        session_id: sessionId,
        page_path: page,
        spec_data: spec,
      })
      .returning(['id'])
      .executeTakeFirst();

    return NextResponse.json({ id: result?.id });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save spec' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const sessionId = searchParams.get('sessionId');

  try {
    if (id) {
      await db.deleteFrom('devmode_specs').where('id', '=', id).execute();
    } else if (sessionId) {
      await db.deleteFrom('devmode_specs').where('session_id', '=', sessionId).execute();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete spec(s)' },
      { status: 500 }
    );
  }
}
```

---

## 12. Implementation Order & Dependencies

### Phase 1: Foundation (Week 1)
1. **Types & State Management**
   - Create `devmode.types.ts`
   - Implement `DevModeProvider` and `useDevMode` hook
   
2. **Multi-Mode System**
   - `ModeToolbar.tsx`
   - Basic mode switching logic

3. **Sidebar Panel**
   - `DevModePanel.tsx` (replace modal)
   - `SpecsList.tsx`

### Phase 2: Core Features (Week 2)
4. **Add Mode**
   - `AddMode.tsx`
   - `ElementPalette.tsx`
   - `AddModeOverlay.tsx`

5. **Database Browser**
   - API endpoint `/api/devmode/schema`
   - `useDatabaseSchema` hook
   - `DatabaseBrowser.tsx`

6. **Quick Action Prompts**
   - `promptTemplates.ts`
   - `QuickActionPrompts.tsx`

### Phase 3: Advanced Features (Week 3)
7. **Annotation Tools**
   - `useAnnotations` hook
   - `AnnotationToolbar.tsx`
   - `AnnotationCanvas.tsx`

8. **Error Recording**
   - `useRecorder` hook
   - `RecordingControls.tsx`
   - `errorReportGenerator.ts`

### Phase 4: Polish (Week 4)
9. **Keyboard Shortcuts**
   - `useKeyboardShortcuts` hook
   - `KeyboardShortcuts.tsx` help panel

10. **Export System**
    - `exportUtils.ts`
    - `ExportPanel.tsx`

### Dependencies to Install

```bash
npm install html2canvas jszip lucide-react
npm install -D @types/html2canvas
```

### Integration Points

1. **Wrap App with Provider**
```typescript
// src/app/layout.tsx or appropriate layout
import { DevModeProvider } from '@/components/devmode/DevModeProvider';

export default function Layout({ children }) {
  return (
    <DevModeProvider>
      {children}
      <DevModePanel />
      <AnnotationCanvas />
    </DevModeProvider>
  );
}
```

2. **Add DevMode Toggle**
```typescript
// Add to your main navigation or settings
import { DevModeToggle } from '@/components/devmode/DevModeToggle';
```

3. **Initialize Keyboard Shortcuts**
```typescript
// In DevModeProvider or top-level component
useKeyboardShortcuts();
```

---

## Notes for Implementation

1. **Testing**: Each feature should be tested in isolation before integration
2. **Performance**: The annotation canvas and recording features can be performance-intensive; consider lazy loading
3. **Accessibility**: Ensure all interactive elements have proper ARIA labels
4. **Mobile**: Consider disabling or simplifying DevMode on mobile devices
5. **Security**: The database schema browser should be restricted to admin users in production

This specification provides everything needed to implement a comprehensive visual development environment. Each section can be implemented independently, allowing for incremental development and testing.