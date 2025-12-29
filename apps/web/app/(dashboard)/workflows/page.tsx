'use client';

import { WorkflowCanvas } from '@/app/features/workflow-visualizer/components/WorkflowCanvas';
import { useWorkflow } from '@/app/features/workflow-visualizer/hooks/useWorkflow';

export default function WorkflowsPage() {
  useWorkflow();
  
  return <WorkflowCanvas />;
}
