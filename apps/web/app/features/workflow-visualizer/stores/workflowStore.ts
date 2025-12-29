import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import { LaziWorkflow, LaziNode, LaziEdge } from '../types/workflow.types';

interface WorkflowState {
  workflow: LaziWorkflow | null;
  nodes: LaziNode[];
  edges: LaziEdge[];
  
  selectedNode: string | null;
  selectedEdge: string | null;
  
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  error: string | null;
  
  setWorkflow: (workflow: LaziWorkflow) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  addNode: (node: LaziNode) => void;
  updateNode: (nodeId: string, data: Partial<LaziNode['data']>) => void;
  removeNode: (nodeId: string) => void;
  
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  
  saveWorkflow: () => Promise<void>;
  loadWorkflow: (workflowId: string) => Promise<void>;
  exportWorkflow: () => string;
  importWorkflow: (json: string) => void;
  
  updateNodeLiveData: (nodeId: string, liveData: LaziNode['data']['liveData']) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  devtools(
    persist(
      (set, get) => ({
        workflow: null,
        nodes: [],
        edges: [],
        selectedNode: null,
        selectedEdge: null,
        isLoading: false,
        isSaving: false,
        isDirty: false,
        error: null,
        
        setWorkflow: (workflow) => set({
          workflow,
          nodes: workflow.nodes,
          edges: workflow.edges,
          isDirty: false,
        }),
        
        onNodesChange: (changes) => {
          set({
            nodes: applyNodeChanges(changes, get().nodes) as LaziNode[],
            isDirty: true,
          });
        },
        
        onEdgesChange: (changes) => {
          set({
            edges: applyEdgeChanges(changes, get().edges) as LaziEdge[],
            isDirty: true,
          });
        },
        
        onConnect: (connection) => {
          set({
            edges: addEdge(
              { ...connection, type: 'dataFlow', animated: true },
              get().edges
            ) as LaziEdge[],
            isDirty: true,
          });
        },
        
        addNode: (node) => {
          set({
            nodes: [...get().nodes, node],
            isDirty: true,
          });
        },
        
        updateNode: (nodeId, data) => {
          set({
            nodes: get().nodes.map((node) =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, ...data } }
                : node
            ),
            isDirty: true,
          });
        },
        
        removeNode: (nodeId) => {
          set({
            nodes: get().nodes.filter((node) => node.id !== nodeId),
            edges: get().edges.filter(
              (edge) => edge.source !== nodeId && edge.target !== nodeId
            ),
            isDirty: true,
          });
        },
        
        selectNode: (nodeId) => set({ selectedNode: nodeId, selectedEdge: null }),
        selectEdge: (edgeId) => set({ selectedEdge: edgeId, selectedNode: null }),
        
        saveWorkflow: async () => {
          const { workflow, nodes, edges } = get();
          if (!workflow) return;
          
          set({ isSaving: true });
          try {
            const response = await fetch('/api/v2/workflows/' + workflow.id, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'X-Tenant-ID': '3222348440',
              },
              body: JSON.stringify({ ...workflow, nodes, edges }),
            });
            
            if (!response.ok) throw new Error('Failed to save');
            set({ isDirty: false, isSaving: false });
          } catch (error) {
            set({ error: (error as Error).message, isSaving: false });
          }
        },
        
        loadWorkflow: async (workflowId) => {
          set({ isLoading: true });
          try {
            const response = await fetch('/api/v2/workflows/' + workflowId, {
              headers: { 'X-Tenant-ID': '3222348440' },
            });
            const workflow = await response.json();
            set({
              workflow: workflow.data,
              nodes: workflow.data.nodes,
              edges: workflow.data.edges,
              isLoading: false,
            });
          } catch (error) {
            set({ error: (error as Error).message, isLoading: false });
          }
        },
        
        exportWorkflow: () => {
          const { workflow, nodes, edges } = get();
          return JSON.stringify({ ...workflow, nodes, edges }, null, 2);
        },
        
        importWorkflow: (json) => {
          try {
            const workflow = JSON.parse(json);
            set({
              workflow,
              nodes: workflow.nodes,
              edges: workflow.edges,
              isDirty: true,
            });
          } catch (error) {
            set({ error: 'Invalid workflow JSON' });
          }
        },
        
        updateNodeLiveData: (nodeId, liveData) => {
          set({
            nodes: get().nodes.map((node) =>
              node.id === nodeId
                ? { ...node, data: { ...node.data, liveData } }
                : node
            ),
          });
        },
      }),
      {
        name: 'lazi-workflow-store',
        partialize: (state) => ({ workflow: state.workflow }),
      }
    )
  )
);
