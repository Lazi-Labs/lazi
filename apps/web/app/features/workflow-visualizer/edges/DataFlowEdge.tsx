import { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { EdgeData } from '../types/workflow.types';

export const DataFlowEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<EdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  return (
    <>
      <path
        id={id}
        className={`
          fill-none stroke-2
          ${selected ? 'stroke-cyan-400' : 'stroke-gray-500'}
          transition-colors duration-200
        `}
        d={edgePath}
        strokeDasharray={data?.animated ? '5,5' : undefined}
      />
      
      {data?.animated && (
        <circle r="4" fill="#22d3ee">
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      
      {(data?.label || data?.dataCount) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 border border-gray-600"
          >
            {data.label || `${data.dataCount?.toLocaleString()} rows`}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

DataFlowEdge.displayName = 'DataFlowEdge';
