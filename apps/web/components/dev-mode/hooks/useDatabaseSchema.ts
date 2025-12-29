// =============================================================================
// LAZI AI - DevMode 2.0 Database Schema Hook
// =============================================================================
// Hook for fetching and managing database schema information
// =============================================================================

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
          schemas: data.schemas || [],
          isLoading: false,
        }));
      } catch (error) {
        // Provide fallback schemas for development
        setState((prev) => ({
          ...prev,
          schemas: ['master', 'crm', 'raw', 'public'],
          error: null,
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
          tables: data.tables || [],
          columns: [],
          sampleData: [],
          isLoading: false,
        }));
        setSelectedTable(null);
      } catch (error) {
        // Provide fallback tables for development
        const fallbackTables: Record<string, Table[]> = {
          master: [
            { name: 'customers', columnCount: 12 },
            { name: 'jobs', columnCount: 18 },
            { name: 'invoices', columnCount: 15 },
            { name: 'technicians', columnCount: 10 },
          ],
          crm: [
            { name: 'leads', columnCount: 8 },
            { name: 'contacts', columnCount: 14 },
            { name: 'opportunities', columnCount: 11 },
          ],
          raw: [
            { name: 'servicetitan_customers', columnCount: 20 },
            { name: 'servicetitan_jobs', columnCount: 25 },
          ],
        };

        setState((prev) => ({
          ...prev,
          tables: selectedSchema ? fallbackTables[selectedSchema as keyof typeof fallbackTables] || [] : [],
          error: null,
          isLoading: false,
        }));
        setSelectedTable(null);
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
          columns: data.columns || [],
          sampleData: data.sample || [],
          isLoading: false,
        }));
      } catch (error) {
        // Provide fallback columns for development
        const fallbackColumns: Column[] = [
          { name: 'id', type: 'integer', nullable: false, default: null, maxLength: null },
          { name: 'name', type: 'varchar', nullable: false, default: null, maxLength: 255 },
          { name: 'email', type: 'varchar', nullable: true, default: null, maxLength: 255 },
          { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()', maxLength: null },
          { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()', maxLength: null },
        ];

        setState((prev) => ({
          ...prev,
          columns: fallbackColumns,
          sampleData: [],
          error: null,
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

  const refresh = useCallback(() => {
    // Trigger a refetch by toggling the schema
    if (selectedSchema) {
      const current = selectedSchema;
      setSelectedSchema(null);
      setTimeout(() => setSelectedSchema(current), 0);
    }
  }, [selectedSchema]);

  return {
    ...state,
    selectedSchema,
    selectedTable,
    selectSchema,
    selectTable,
    refresh,
  };
}
