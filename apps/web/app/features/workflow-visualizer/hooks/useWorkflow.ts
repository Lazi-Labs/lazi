import { useEffect } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeLiveData } from './useNodeData';
import dataFlowChain from '../workflows/data-flow-chain.json';
import pricebookServices from '../workflows/pricebook-services.json';

export function useWorkflow(workflowId?: string) {
  const { workflow, loadWorkflow, setWorkflow } = useWorkflowStore();
  
  useNodeLiveData();
  
  useEffect(() => {
    if (workflowId) {
      loadWorkflow(workflowId);
    } else {
      // Always load pricebook services workflow by default (override cached)
      setWorkflow(pricebookServices as any);
    }
  }, [workflowId, loadWorkflow, setWorkflow]);
  
  return { workflow };
}
