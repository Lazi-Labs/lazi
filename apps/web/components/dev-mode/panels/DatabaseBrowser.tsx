// =============================================================================
// LAZI AI - DevMode 2.0 Database Browser
// =============================================================================
// Browse database schemas, tables, and columns to bind data to elements
// =============================================================================

'use client';

import React, { useState } from 'react';
import { useDatabaseSchema } from '../hooks/useDatabaseSchema';
import { useDevMode } from '../DevModeProvider';
import { DataBinding, ColumnBinding } from '../types/devmode.types';
import {
  Database,
  Table,
  Columns,
  ChevronRight,
  Check,
  Loader,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';

export function DatabaseBrowser() {
  const { state, updateSpec } = useDevMode();
  const { currentSpec } = state;

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
    refresh,
  } = useDatabaseSchema();

  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleColumnToggle = (columnName: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnName)
        ? prev.filter((c) => c !== columnName)
        : [...prev, columnName]
    );
  };

  const handleSelectAll = () => {
    if (selectedColumns.length === columns.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(columns.map((c) => c.name));
    }
  };

  const handleApplyBinding = () => {
    if (!currentSpec || !selectedSchema || !selectedTable || selectedColumns.length === 0) {
      return;
    }

    const columnBindings: ColumnBinding[] = selectedColumns.map((colName) => {
      const col = columns.find((c) => c.name === colName);
      return {
        columnName: colName,
        columnType: col?.type || 'text',
        displayAs: inferDisplayType(col?.type || 'text'),
        label: formatColumnLabel(colName),
      };
    });

    const dataBinding: DataBinding = {
      schema: selectedSchema,
      table: selectedTable,
      columns: columnBindings,
    };

    updateSpec(currentSpec.id, { dataBinding });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database style={{ width: '16px', height: '16px', color: '#3b82f6' }} />
          <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>
            Database Browser
          </span>
        </div>
        <button
          onClick={refresh}
          disabled={isLoading}
          style={{
            padding: '4px',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: '#9ca3af',
            cursor: 'pointer',
          }}
          title="Refresh"
        >
          <RefreshCw
            style={{
              width: '14px',
              height: '14px',
              animation: isLoading ? 'spin 1s linear infinite' : 'none',
            }}
          />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle style={{ width: '16px', height: '16px', color: '#ef4444' }} />
          <span style={{ color: '#ef4444', fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {/* Schema Selector */}
      <div>
        <label style={labelStyle}>Schema</label>
        <select
          value={selectedSchema || ''}
          onChange={(e) => selectSchema(e.target.value || null)}
          style={selectStyle}
          disabled={isLoading}
        >
          <option value="">Select a schema...</option>
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
          <label style={labelStyle}>Table</label>
          <select
            value={selectedTable || ''}
            onChange={(e) => selectTable(e.target.value || null)}
            style={selectStyle}
            disabled={isLoading || tables.length === 0}
          >
            <option value="">Select a table...</option>
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            color: '#6b7280',
          }}
        >
          <Loader
            style={{
              width: '20px',
              height: '20px',
              animation: 'spin 1s linear infinite',
              marginRight: '8px',
            }}
          />
          Loading...
        </div>
      )}

      {/* Columns List */}
      {selectedTable && columns.length > 0 && !isLoading && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Columns ({selectedColumns.length}/{columns.length} selected)
            </label>
            <button
              onClick={handleSelectAll}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {selectedColumns.length === columns.length ? 'Clear All' : 'Select All'}
            </button>
          </div>

          <div
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              backgroundColor: '#374151',
              borderRadius: '8px',
              padding: '8px',
            }}
          >
            {columns.map((column) => (
              <label
                key={column.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: selectedColumns.includes(column.name)
                    ? 'rgba(59, 130, 246, 0.2)'
                    : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(column.name)}
                  onChange={() => handleColumnToggle(column.name)}
                  style={{ width: '16px', height: '16px' }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 500,
                    }}
                  >
                    {column.name}
                  </div>
                  <div
                    style={{
                      color: '#6b7280',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {column.type}
                    {column.nullable ? ' (nullable)' : ''}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Data Preview Toggle */}
      {selectedTable && sampleData.length > 0 && (
        <div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#374151',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye style={{ width: '14px', height: '14px' }} />
              Preview Data ({sampleData.length} rows)
            </span>
            <ChevronRight
              style={{
                width: '14px',
                height: '14px',
                transform: showPreview ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {showPreview && (
            <div
              style={{
                marginTop: '8px',
                maxHeight: '150px',
                overflowX: 'auto',
                backgroundColor: '#111827',
                borderRadius: '6px',
                padding: '8px',
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
                {JSON.stringify(sampleData[0], null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Binding Summary */}
      {currentSpec?.dataBinding && (
        <div
          style={{
            padding: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <Check style={{ width: '16px', height: '16px', color: '#10b981' }} />
            <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 500 }}>
              Data Binding Configured
            </span>
          </div>
          <div style={{ color: '#9ca3af', fontSize: '12px' }}>
            <div>
              {currentSpec.dataBinding.schema}.{currentSpec.dataBinding.table}
            </div>
            <div>
              {currentSpec.dataBinding.columns.length} column(s) selected
            </div>
          </div>
        </div>
      )}

      {/* Apply Button */}
      {selectedColumns.length > 0 && currentSpec && (
        <button
          onClick={handleApplyBinding}
          style={{
            padding: '12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Columns style={{ width: '16px', height: '16px' }} />
          Apply Data Binding
        </button>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function inferDisplayType(
  sqlType: string
): ColumnBinding['displayAs'] {
  const type = sqlType.toLowerCase();

  if (type.includes('int') || type.includes('decimal') || type.includes('numeric')) {
    return 'number';
  }
  if (type.includes('money') || type.includes('currency')) {
    return 'currency';
  }
  if (type.includes('date') || type.includes('time')) {
    return 'date';
  }
  if (type.includes('bool')) {
    return 'badge';
  }

  return 'text';
}

function formatColumnLabel(columnName: string): string {
  return columnName
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// =============================================================================
// Styles
// =============================================================================

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#9ca3af',
  fontSize: '12px',
  marginBottom: '6px',
  fontWeight: 500,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  backgroundColor: '#374151',
  border: '1px solid #4b5563',
  borderRadius: '6px',
  color: 'white',
  fontSize: '13px',
  outline: 'none',
  cursor: 'pointer',
};
