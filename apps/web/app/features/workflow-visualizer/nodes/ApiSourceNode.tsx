import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ApiSourceConfig, NodeData } from '../types/workflow.types';

const providerStyles: Record<string, { icon: string; color: string }> = {
  servicetitan: { icon: '🔧', color: 'border-orange-500 bg-orange-900/50' },
  lazi: { icon: '⚡', color: 'border-cyan-500 bg-cyan-900/50' },
  external: { icon: '🌐', color: 'border-gray-500 bg-gray-900/50' },
};

export const ApiSourceNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const config = data.config as ApiSourceConfig;
  const style = providerStyles[config?.provider] || providerStyles.external;
  
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[160px]
        ${style.color}
        ${selected ? 'ring-2 ring-white ring-opacity-50' : ''}
        transition-all duration-200
      `}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl">{style.icon}</span>
        <span className="font-semibold text-white">{data.label}</span>
        {config?.domain && (
          <span className="text-xs text-gray-400">/{config.domain}</span>
        )}
        {config?.endpoint && (
          <span className="text-xs text-gray-500 truncate max-w-[120px]">
            {config.endpoint}
          </span>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-orange-400 border-2 border-orange-600"
      />
    </div>
  );
});

ApiSourceNode.displayName = 'ApiSourceNode';
