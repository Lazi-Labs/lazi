'use client';

import { useWorkflowStore } from '../stores/workflowStore';
import { X } from 'lucide-react';

export function NodeInspector() {
  const { nodes, selectedNode, selectNode, updateNode, removeNode } = useWorkflowStore();
  
  const node = nodes.find((n) => n.id === selectedNode);
  
  if (!node) return null;
  
  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase">
          Node Inspector
        </h2>
        <button
          onClick={() => selectNode(null)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Type</label>
          <div className="px-3 py-2 bg-gray-700 rounded text-sm text-white">
            {node.type}
          </div>
        </div>
        
        <div>
          <label className="block text-xs text-gray-400 mb-1">Label</label>
          <input
            type="text"
            value={node.data.label}
            onChange={(e) => updateNode(node.id, { label: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-400 mb-1">Description</label>
          <textarea
            value={node.data.description || ''}
            onChange={(e) => updateNode(node.id, { description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        
        {node.data.liveData && (
          <div>
            <label className="block text-xs text-gray-400 mb-2">Live Data</label>
            <div className="space-y-2 text-sm">
              {node.data.liveData.rowCount !== undefined && (
                <div className="flex justify-between text-gray-300">
                  <span>Row Count:</span>
                  <span className="font-mono">{node.data.liveData.rowCount.toLocaleString()}</span>
                </div>
              )}
              {node.data.liveData.lastSync && (
                <div className="flex justify-between text-gray-300">
                  <span>Last Sync:</span>
                  <span className="text-xs">{new Date(node.data.liveData.lastSync).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="pt-4 border-t border-gray-700">
          <button
            onClick={() => {
              if (confirm('Delete this node?')) {
                removeNode(node.id);
                selectNode(null);
              }
            }}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
          >
            Delete Node
          </button>
        </div>
      </div>
    </div>
  );
}
