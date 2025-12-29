// =============================================================================
// LAZI AI - DevMode 2.0 Quick Action Prompts
// =============================================================================
// Pre-built prompt templates for quick AI implementation requests
// =============================================================================

'use client';

import React, { useState } from 'react';
import { useDevMode } from '../DevModeProvider';
import {
  PROMPT_TEMPLATES,
  fillTemplate,
  getTemplatesByCategory,
} from '../utils/promptTemplates';
import { PromptTemplate } from '../types/devmode.types';
import {
  Zap,
  MousePointer,
  Database,
  Layout,
  AlertTriangle,
  ChevronRight,
  Copy,
  Check,
  Edit3,
} from 'lucide-react';

const CATEGORY_CONFIG = [
  { id: 'element', label: 'Element', icon: MousePointer },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'page', label: 'Page', icon: Layout },
  { id: 'error', label: 'Error', icon: AlertTriangle },
] as const;

export function QuickActionPrompts() {
  const { state } = useDevMode();
  const { currentSpec } = state;

  const [selectedCategory, setSelectedCategory] = useState<string>('element');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const templates = getTemplatesByCategory(
    selectedCategory as PromptTemplate['category']
  );

  const handleCopy = (template: PromptTemplate) => {
    // Build values from current context
    const contextValues: Record<string, string> = {
      page: currentSpec?.page || window.location.pathname,
      selector: currentSpec?.elementInfo?.selector || '',
      elementText: currentSpec?.elementInfo?.textContent?.slice(0, 50) || '',
      schema: currentSpec?.dataBinding?.schema || '',
      table: currentSpec?.dataBinding?.table || '',
      columns: currentSpec?.dataBinding?.columns?.map((c) => c.columnName).join(', ') || '',
      ...customValues,
    };

    const filledPrompt = fillTemplate(template.template, contextValues);
    navigator.clipboard.writeText(filledPrompt);

    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (templateId: string) => {
    setExpandedTemplate(expandedTemplate === templateId ? null : templateId);
    setCustomValues({});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Zap style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
        <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
          Quick Prompts
        </span>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {CATEGORY_CONFIG.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                flex: 1,
                padding: '8px 4px',
                backgroundColor: isActive ? '#3b82f6' : '#374151',
                border: 'none',
                borderRadius: '6px',
                color: isActive ? 'white' : '#9ca3af',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                transition: 'all 0.2s',
              }}
            >
              <Icon style={{ width: '14px', height: '14px' }} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Templates List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {templates.map((template) => {
          const isExpanded = expandedTemplate === template.id;
          const isCopied = copiedId === template.id;

          return (
            <div
              key={template.id}
              style={{
                backgroundColor: '#374151',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              {/* Template Header */}
              <button
                onClick={() => toggleExpand(template.id)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 500 }}>
                  {template.name}
                </span>
                <ChevronRight
                  style={{
                    width: '14px',
                    height: '14px',
                    color: '#6b7280',
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div
                  style={{
                    padding: '0 12px 12px',
                    borderTop: '1px solid #4b5563',
                  }}
                >
                  {/* Variables Preview */}
                  <div style={{ marginTop: '12px', marginBottom: '12px' }}>
                    <div
                      style={{
                        color: '#9ca3af',
                        fontSize: '11px',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Edit3 style={{ width: '12px', height: '12px' }} />
                      Variables (auto-filled from context):
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                      }}
                    >
                      {template.variables.slice(0, 6).map((variable) => {
                        const contextValue = getContextValue(variable, currentSpec);
                        return (
                          <span
                            key={variable}
                            style={{
                              padding: '2px 6px',
                              backgroundColor: contextValue ? '#10b981' : '#4b5563',
                              color: contextValue ? 'white' : '#9ca3af',
                              borderRadius: '4px',
                              fontSize: '10px',
                            }}
                          >
                            {variable}
                          </span>
                        );
                      })}
                      {template.variables.length > 6 && (
                        <span
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#4b5563',
                            color: '#9ca3af',
                            borderRadius: '4px',
                            fontSize: '10px',
                          }}
                        >
                          +{template.variables.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Template Preview */}
                  <div
                    style={{
                      backgroundColor: '#1f2937',
                      padding: '8px',
                      borderRadius: '6px',
                      maxHeight: '120px',
                      overflow: 'auto',
                      marginBottom: '12px',
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        fontSize: '10px',
                        color: '#9ca3af',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {template.template.slice(0, 300)}
                      {template.template.length > 300 && '...'}
                    </pre>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(template)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: isCopied ? '#10b981' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isCopied ? (
                      <>
                        <Check style={{ width: '14px', height: '14px' }} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy style={{ width: '14px', height: '14px' }} />
                        Copy Prompt
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '24px',
            color: '#6b7280',
            fontSize: '13px',
          }}
        >
          No templates in this category
        </div>
      )}
    </div>
  );
}

// Helper to get context value for a variable
function getContextValue(variable: string, currentSpec: any): string {
  if (!currentSpec) return '';

  const valueMap: Record<string, string> = {
    page: currentSpec.page || '',
    selector: currentSpec.elementInfo?.selector || '',
    elementText: currentSpec.elementInfo?.textContent?.slice(0, 50) || '',
    schema: currentSpec.dataBinding?.schema || '',
    table: currentSpec.dataBinding?.table || '',
    columns: currentSpec.dataBinding?.columns?.map((c: any) => c.columnName).join(', ') || '',
  };

  return valueMap[variable] || '';
}
