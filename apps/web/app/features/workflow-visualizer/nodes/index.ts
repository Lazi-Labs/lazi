import { ApiSourceNode } from './ApiSourceNode';
import { DatabaseNode } from './DatabaseNode';
import { TriggerNode } from './TriggerNode';
import { FrontendNode } from './FrontendNode';

export const nodeTypes = {
  apiSource: ApiSourceNode,
  database: DatabaseNode,
  trigger: TriggerNode,
  frontend: FrontendNode,
};

export { ApiSourceNode, DatabaseNode, TriggerNode, FrontendNode };
