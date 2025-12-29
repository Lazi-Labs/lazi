import { Node, Edge } from 'reactflow';

export interface LaziWorkflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  nodes: LaziNode[];
  edges: LaziEdge[];
  metadata: WorkflowMetadata;
}

export interface WorkflowMetadata {
  author?: string;
  tags?: string[];
  category?: 'data-flow' | 'sync' | 'automation' | 'integration';
  isTemplate?: boolean;
  lastExecuted?: string;
  executionCount?: number;
}

export type LaziNodeType = 
  | 'apiSource'
  | 'database'
  | 'trigger'
  | 'transform'
  | 'condition'
  | 'action'
  | 'frontend'
  | 'webhook'
  | 'queue'
  | 'cache'
  | 'notification';

export interface LaziNode extends Omit<Node, 'type' | 'data'> {
  type: LaziNodeType;
  data: NodeData;
}

export interface NodeData {
  label: string;
  description?: string;
  icon?: string;
  status?: 'active' | 'inactive' | 'error' | 'syncing';
  
  liveData?: {
    rowCount?: number;
    lastSync?: string;
    errorCount?: number;
    throughput?: number;
  };
  
  config?: ApiSourceConfig | DatabaseConfig | TriggerConfig | TransformConfig | FrontendConfig;
}

export interface ApiSourceConfig {
  provider: 'servicetitan' | 'lazi' | 'external';
  endpoint: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  domain?: string;
  authType?: 'oauth' | 'apikey' | 'none';
}

export interface DatabaseConfig {
  schema: 'raw' | 'master' | 'crm' | 'sync' | 'audit' | 'pricebook';
  table: string;
  description?: string;
  
  columns?: string[];
  primaryKey?: string;
  foreignKeys?: { column: string; references: string }[];
}

export interface TriggerConfig {
  type: 'webhook' | 'schedule' | 'event' | 'manual';
  schedule?: string;
  event?: string;
  webhookPath?: string;
}

export interface TransformConfig {
  type: 'map' | 'filter' | 'reduce' | 'merge' | 'split';
  expression?: string;
  mapping?: Record<string, string>;
}

export interface FrontendConfig {
  component: string;
  page: string;
  props?: string[];
  dataSource?: string;
  hooks?: string[];
}

export interface LaziEdge extends Omit<Edge, 'type' | 'data'> {
  type?: 'dataFlow' | 'trigger' | 'conditional';
  data?: EdgeData;
}

export interface EdgeData {
  label?: string;
  dataCount?: number;
  transformations?: string[];
  condition?: string;
  animated?: boolean;
}
