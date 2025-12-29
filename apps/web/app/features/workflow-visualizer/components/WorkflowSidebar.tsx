'use client';

import { useWorkflowStore } from '../stores/workflowStore';
import { LaziNode, LaziNodeType } from '../types/workflow.types';

const nodeTemplates: Array<{
  type: LaziNodeType;
  label: string;
  icon: string;
  description: string;
}> = [
  { type: 'apiSource', label: 'API Source', icon: '🔧', description: 'External API endpoint' },
  { type: 'database', label: 'Database', icon: '🗄️', description: 'Database schema/table' },
  { type: 'trigger', label: 'Trigger', icon: '⚡', description: 'Event trigger' },
  { type: 'frontend', label: 'Frontend', icon: '🖥️', description: 'UI component' },
  { type: 'transform', label: 'Transform', icon: '🔄', description: 'Data transformation' },
  { type: 'condition', label: 'Condition', icon: '🔀', description: 'Conditional logic' },
];

export function WorkflowSidebar() {
  const { addNode, nodes } = useWorkflowStore();
  
  const handleAddNode = (type: LaziNodeType, label: string) => {
    const newNode: LaziNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 100, y: 100 + nodes.length * 50 },
      data: {
        label,
        status: 'inactive',
      },
    };
    addNode(newNode);
  };
  
  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">
        Node Palette
      </h2>
      
      <div className="space-y-2">
        {nodeTemplates.map((template) => (
          <button
            key={template.type}
            onClick={() => handleAddNode(template.type, template.label)}
            className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{template.icon}</span>
              <span className="text-sm font-medium text-white">{template.label}</span>
            </div>
            <p className="text-xs text-gray-400">{template.description}</p>
          </button>
        ))}
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-700">
        <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
          Stats
        </h3>
        <div className="space-y-1 text-sm text-gray-300">
          <div className="flex justify-between">
            <span>Nodes:</span>
            <span className="font-mono">{nodes.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
