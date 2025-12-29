import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FrontendConfig, NodeData } from '../types/workflow.types';

export const FrontendNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const config = data.config as FrontendConfig;
  
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[150px]
        bg-indigo-900/50 border-indigo-500
        ${selected ? 'ring-2 ring-white ring-opacity-50' : ''}
        transition-all duration-200
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-indigo-400 border-2 border-indigo-600"
      />
      
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl">🖥️</span>
        <span className="font-semibold text-indigo-300">{data.label}</span>
        {config?.component && (
          <span className="text-xs text-gray-400">&lt;{config.component}/&gt;</span>
        )}
        {config?.page && (
          <span className="text-xs text-gray-500">{config.page}</span>
        )}
      </div>
    </div>
  );
});

FrontendNode.displayName = 'FrontendNode';
