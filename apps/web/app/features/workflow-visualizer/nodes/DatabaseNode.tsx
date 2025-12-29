import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { DatabaseConfig, NodeData } from '../types/workflow.types';

const schemaColors: Record<string, { bg: string; border: string; text: string }> = {
  raw: { bg: 'bg-blue-900/50', border: 'border-blue-500', text: 'text-blue-400' },
  master: { bg: 'bg-purple-900/50', border: 'border-purple-500', text: 'text-purple-400' },
  crm: { bg: 'bg-green-900/50', border: 'border-green-500', text: 'text-green-400' },
  sync: { bg: 'bg-yellow-900/50', border: 'border-yellow-500', text: 'text-yellow-400' },
  audit: { bg: 'bg-gray-900/50', border: 'border-gray-500', text: 'text-gray-400' },
  pricebook: { bg: 'bg-orange-900/50', border: 'border-orange-500', text: 'text-orange-400' },
};

const schemaIcons: Record<string, string> = {
  raw: '📥',
  master: '📊',
  crm: '👤',
  sync: '🔄',
  audit: '📋',
  pricebook: '💰',
};

export const DatabaseNode = memo(({ data, selected }: NodeProps<NodeData>) => {
  const config = data.config as DatabaseConfig;
  const colors = schemaColors[config?.schema] || schemaColors.raw;
  const icon = schemaIcons[config?.schema] || '🗄️';
  
  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[140px]
        ${colors.bg} ${colors.border}
        ${selected ? 'ring-2 ring-white ring-opacity-50' : ''}
        transition-all duration-200
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-gray-400 border-2 border-gray-600"
      />
      
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl">{icon}</span>
        <span className={`font-semibold ${colors.text}`}>
          {config?.schema}.*
        </span>
        {config?.table && (
          <span className="text-xs text-gray-400">{config.table}</span>
        )}
        
        {data.liveData?.rowCount !== undefined && (
          <span className="text-sm text-gray-300 mt-1">
            {data.liveData.rowCount.toLocaleString()} rows
          </span>
        )}
        
        {data.status === 'syncing' && (
          <div className="flex items-center gap-1 text-xs text-yellow-400">
            <span className="animate-spin">⟳</span>
            <span>syncing</span>
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-gray-400 border-2 border-gray-600"
      />
    </div>
  );
});

DatabaseNode.displayName = 'DatabaseNode';
