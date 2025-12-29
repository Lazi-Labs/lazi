'use client';

import { useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useWorkflowStore } from '../stores/workflowStore';
import { nodeTypes } from '../nodes';
import { edgeTypes } from '../edges';
import { WorkflowToolbar } from './WorkflowToolbar';
import { WorkflowSidebar } from './WorkflowSidebar';
import { NodeInspector } from './NodeInspector';

function WorkflowCanvasInner() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    selectEdge,
    selectedNode,
  } = useWorkflowStore();
  
  const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
    selectNode(node.id);
  }, [selectNode]);
  
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: any) => {
    selectEdge(edge.id);
  }, [selectEdge]);
  
  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);
  
  return (
    <div className="h-screen w-full flex flex-col bg-gray-900">
      <WorkflowToolbar />
      
      <div className="flex-1 flex">
        <WorkflowSidebar />
        
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              type: 'dataFlow',
              animated: true,
            }}
            className="bg-gray-900"
          >
            <Background color="#374151" gap={20} />
            <Controls className="bg-gray-800 border-gray-700" />
            <MiniMap
              nodeColor={(node) => {
                const colors: Record<string, string> = {
                  apiSource: '#f97316',
                  database: '#8b5cf6',
                  trigger: '#eab308',
                  frontend: '#6366f1',
                };
                return colors[node.type || ''] || '#6b7280';
              }}
              className="bg-gray-800 border-gray-700"
            />
          </ReactFlow>
        </div>
        
        {selectedNode && <NodeInspector />}
      </div>
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}
