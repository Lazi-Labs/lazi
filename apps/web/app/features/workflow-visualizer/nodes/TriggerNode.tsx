import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { TriggerConfig, NodeData } from '../types/workflow.types';

export const TriggerNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const config = data.config as TriggerConfig;
  
  const triggerIcons: Record<string, string> = {
    webhook: '🔔',
    schedule: '⏰',
    event: '⚡',
    manual: '👆',
  };
  
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[120px]
        bg-yellow-900/50 border-yellow-500
        ${selected ? 'ring-2 ring-white ring-opacity-50' : ''}
        transition-all duration-200
      `}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl">{triggerIcons[config?.type] || '▶️'}</span>
        <span className="font-semibold text-yellow-300">{data.label}</span>
        {config?.schedule && (
          <span className="text-xs text-gray-400">{config.schedule}</span>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-yellow-400 border-2 border-yellow-600"
      />
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';
