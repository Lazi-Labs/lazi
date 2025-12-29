import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWorkflowStore } from '../stores/workflowStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TENANT_ID = '3222348440';

async function fetchSchemaStats() {
  const response = await fetch(`${API_BASE}/api/v2/workflows/stats/schemas`, {
    headers: { 'X-Tenant-ID': TENANT_ID },
  });
  return response.json();
}

export function useNodeLiveData() {
  const { nodes, updateNodeLiveData } = useWorkflowStore();
  
  const { data: schemaStats } = useQuery({
    queryKey: ['schema-stats'],
    queryFn: fetchSchemaStats,
    refetchInterval: 30000,
  });
  
  useEffect(() => {
    if (!schemaStats?.data) return;
    
    nodes.forEach((node) => {
      if (node.type === 'database') {
        const schema = (node.data.config as any)?.schema;
        if (schema && schemaStats.data[schema]) {
          updateNodeLiveData(node.id, schemaStats.data[schema]);
        }
      }
    });
  }, [schemaStats, nodes, updateNodeLiveData]);
}
