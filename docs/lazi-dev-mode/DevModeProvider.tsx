// =============================================================================
// LAZI AI - Developer Mode / Visual Spec Builder
// =============================================================================
// Add this to your Next.js app to enable click-to-configure functionality
// Location: src/components/dev-mode/DevModeProvider.tsx
// =============================================================================

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ElementSpec {
  id: string;
  pageRoute: string;
  elementType: 'button' | 'link' | 'input' | 'table-row' | 'table-cell' | 'card' | 'icon' | 'custom';
  elementSelector: string;
  elementText: string;
  elementLocation: string;
  
  // Behavior configuration
  actionType: 'api-call' | 'navigate' | 'modal' | 'workflow' | 'sync-job' | 'custom';
  
  // API Call config
  apiEndpoint?: string;
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  apiPayload?: string;
  
  // Navigation config
  navigateTo?: string;
  
  // Workflow config
  workflowId?: string;
  workflowName?: string;
  
  // Sync job config
  syncJobType?: string;
  
  // Custom description
  description: string;
  
  // UI behavior
  showLoading?: boolean;
  successMessage?: string;
  errorMessage?: string;
  refreshAfter?: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  status: 'draft' | 'implemented' | 'testing' | 'production';
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Windsurf export
  windsurfPrompt?: string;
}

export interface DevModeContextType {
  // State
  isEnabled: boolean;
  isInspecting: boolean;
  selectedElement: HTMLElement | null;
  currentSpec: Partial<ElementSpec> | null;
  savedSpecs: ElementSpec[];
  currentPage: string;
  
  // Actions
  toggleDevMode: () => void;
  startInspecting: () => void;
  stopInspecting: () => void;
  selectElement: (element: HTMLElement) => void;
  clearSelection: () => void;
  saveSpec: (spec: ElementSpec) => void;
  deleteSpec: (id: string) => void;
  updateSpec: (id: string, updates: Partial<ElementSpec>) => void;
  exportToWindsurf: (specIds?: string[]) => string;
  exportToJSON: () => string;
  importFromJSON: (json: string) => void;
}

// =============================================================================
// Context
// =============================================================================

const DevModeContext = createContext<DevModeContextType | null>(null);

export const useDevMode = () => {
  const context = useContext(DevModeContext);
  if (!context) {
    throw new Error('useDevMode must be used within DevModeProvider');
  }
  return context;
};

// =============================================================================
// Helper Functions
// =============================================================================

function generateElementSelector(element: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break;
    }
    
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ').filter(c => c && !c.startsWith('_'));
      if (classes.length > 0) {
        selector += `.${classes.slice(0, 2).join('.')}`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}

function detectElementType(element: HTMLElement): ElementSpec['elementType'] {
  const tag = element.tagName.toLowerCase();
  
  if (tag === 'button' || element.getAttribute('role') === 'button') return 'button';
  if (tag === 'a') return 'link';
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'input';
  if (tag === 'tr') return 'table-row';
  if (tag === 'td' || tag === 'th') return 'table-cell';
  if (element.classList.contains('card') || element.getAttribute('role') === 'article') return 'card';
  if (tag === 'svg' || element.closest('svg')) return 'icon';
  
  return 'custom';
}

function getElementLocation(element: HTMLElement): string {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  
  const verticalPosition = rect.top < viewportHeight / 3 ? 'top' : rect.top < (viewportHeight * 2) / 3 ? 'middle' : 'bottom';
  const horizontalPosition = rect.left < viewportWidth / 3 ? 'left' : rect.left < (viewportWidth * 2) / 3 ? 'center' : 'right';
  
  // Try to detect semantic location
  const header = element.closest('header, [role="banner"], nav');
  const sidebar = element.closest('aside, [role="complementary"]');
  const main = element.closest('main, [role="main"]');
  const footer = element.closest('footer, [role="contentinfo"]');
  const modal = element.closest('[role="dialog"], .modal');
  const table = element.closest('table, [role="table"]');
  
  if (header) return 'Header';
  if (sidebar) return 'Sidebar';
  if (modal) return 'Modal';
  if (table) return 'Table';
  if (footer) return 'Footer';
  if (main) return `Main content - ${verticalPosition} ${horizontalPosition}`;
  
  return `${verticalPosition} ${horizontalPosition}`;
}

function generateId(): string {
  return `spec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// Provider Component
// =============================================================================

interface DevModeProviderProps {
  children: React.ReactNode;
  storageKey?: string;
}

export function DevModeProvider({ children, storageKey = 'lazi-dev-mode-specs' }: DevModeProviderProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null);
  const [currentSpec, setCurrentSpec] = useState<Partial<ElementSpec> | null>(null);
  const [savedSpecs, setSavedSpecs] = useState<ElementSpec[]>([]);
  const [currentPage, setCurrentPage] = useState('');

  // Load saved specs from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setSavedSpecs(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load saved specs:', e);
        }
      }
      setCurrentPage(window.location.pathname);
    }
  }, [storageKey]);

  // Save specs to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && savedSpecs.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(savedSpecs));
    }
  }, [savedSpecs, storageKey]);

  // Update current page on navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleRouteChange = () => {
        setCurrentPage(window.location.pathname);
      };
      
      window.addEventListener('popstate', handleRouteChange);
      return () => window.removeEventListener('popstate', handleRouteChange);
    }
  }, []);

  // Keyboard shortcut: Ctrl+Shift+D to toggle dev mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsEnabled(prev => !prev);
      }
      if (e.key === 'Escape' && isInspecting) {
        setIsInspecting(false);
        setSelectedElement(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInspecting]);

  const toggleDevMode = useCallback(() => {
    setIsEnabled(prev => !prev);
    if (isEnabled) {
      setIsInspecting(false);
      setSelectedElement(null);
      setCurrentSpec(null);
    }
  }, [isEnabled]);

  const startInspecting = useCallback(() => {
    setIsInspecting(true);
  }, []);

  const stopInspecting = useCallback(() => {
    setIsInspecting(false);
  }, []);

  const selectElement = useCallback((element: HTMLElement) => {
    setSelectedElement(element);
    setIsInspecting(false);
    
    const spec: Partial<ElementSpec> = {
      id: generateId(),
      pageRoute: currentPage,
      elementType: detectElementType(element),
      elementSelector: generateElementSelector(element),
      elementText: element.textContent?.trim().slice(0, 100) || '',
      elementLocation: getElementLocation(element),
      actionType: 'custom',
      description: '',
      status: 'draft',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setCurrentSpec(spec);
  }, [currentPage]);

  const clearSelection = useCallback(() => {
    setSelectedElement(null);
    setCurrentSpec(null);
  }, []);

  const saveSpec = useCallback((spec: ElementSpec) => {
    setSavedSpecs(prev => {
      const existing = prev.findIndex(s => s.id === spec.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...spec, updatedAt: new Date().toISOString() };
        return updated;
      }
      return [...prev, spec];
    });
    setCurrentSpec(null);
    setSelectedElement(null);
  }, []);

  const deleteSpec = useCallback((id: string) => {
    setSavedSpecs(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateSpec = useCallback((id: string, updates: Partial<ElementSpec>) => {
    setSavedSpecs(prev => prev.map(s => 
      s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
    ));
  }, []);

  const exportToWindsurf = useCallback((specIds?: string[]) => {
    const specsToExport = specIds 
      ? savedSpecs.filter(s => specIds.includes(s.id))
      : savedSpecs;
    
    const groupedByPage = specsToExport.reduce((acc, spec) => {
      if (!acc[spec.pageRoute]) acc[spec.pageRoute] = [];
      acc[spec.pageRoute].push(spec);
      return acc;
    }, {} as Record<string, ElementSpec[]>);

    let markdown = `# LAZI CRM - UI Specifications\n\n`;
    markdown += `Generated: ${new Date().toISOString()}\n\n`;
    markdown += `---\n\n`;

    for (const [page, specs] of Object.entries(groupedByPage)) {
      markdown += `## Page: ${page}\n\n`;
      
      for (const spec of specs) {
        markdown += `### ${spec.elementType}: "${spec.elementText || 'Unnamed element'}"\n\n`;
        markdown += `- **Type:** ${spec.elementType}\n`;
        markdown += `- **Location:** ${spec.elementLocation}\n`;
        markdown += `- **Selector:** \`${spec.elementSelector}\`\n`;
        markdown += `- **Priority:** ${spec.priority}\n`;
        markdown += `- **Status:** ${spec.status}\n\n`;
        
        markdown += `**Behavior:**\n\n`;
        
        switch (spec.actionType) {
          case 'api-call':
            markdown += `1. Call \`${spec.apiMethod} ${spec.apiEndpoint}\`\n`;
            if (spec.apiPayload) markdown += `2. Payload: \`${spec.apiPayload}\`\n`;
            break;
          case 'navigate':
            markdown += `1. Navigate to \`${spec.navigateTo}\`\n`;
            break;
          case 'workflow':
            markdown += `1. Trigger workflow: ${spec.workflowName || spec.workflowId}\n`;
            break;
          case 'sync-job':
            markdown += `1. Run sync job: ${spec.syncJobType}\n`;
            break;
          case 'modal':
            markdown += `1. Open modal dialog\n`;
            break;
        }
        
        if (spec.showLoading) markdown += `- Show loading spinner during operation\n`;
        if (spec.successMessage) markdown += `- On success: Show toast "${spec.successMessage}"\n`;
        if (spec.errorMessage) markdown += `- On error: Show toast "${spec.errorMessage}"\n`;
        if (spec.refreshAfter) markdown += `- After completion: Refresh page/table data\n`;
        
        if (spec.description) {
          markdown += `\n**Description:**\n\n${spec.description}\n`;
        }
        
        if (spec.windsurfPrompt) {
          markdown += `\n**Windsurf Implementation Prompt:**\n\n\`\`\`\n${spec.windsurfPrompt}\n\`\`\`\n`;
        }
        
        markdown += `\n---\n\n`;
      }
    }

    return markdown;
  }, [savedSpecs]);

  const exportToJSON = useCallback(() => {
    return JSON.stringify(savedSpecs, null, 2);
  }, [savedSpecs]);

  const importFromJSON = useCallback((json: string) => {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        setSavedSpecs(prev => [...prev, ...imported]);
      }
    } catch (e) {
      console.error('Failed to import specs:', e);
    }
  }, []);

  const value: DevModeContextType = {
    isEnabled,
    isInspecting,
    selectedElement,
    currentSpec,
    savedSpecs,
    currentPage,
    toggleDevMode,
    startInspecting,
    stopInspecting,
    selectElement,
    clearSelection,
    saveSpec,
    deleteSpec,
    updateSpec,
    exportToWindsurf,
    exportToJSON,
    importFromJSON,
  };

  return (
    <DevModeContext.Provider value={value}>
      {children}
    </DevModeContext.Provider>
  );
}
