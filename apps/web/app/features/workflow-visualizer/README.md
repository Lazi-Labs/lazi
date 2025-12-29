# LAZI Visual Workflow System

A visual workflow and data flow visualization system built with React Flow and JSON-first architecture.

## Features

- **Visual Data Flow**: Shows how data flows through the system (ServiceTitan → raw → master → crm → audit)
- **Real-time Data**: Displays live row counts and sync status for database schemas
- **Visual Editing**: Drag-and-drop interface for creating and editing workflows
- **AI-Editable**: JSON-first architecture allows AI to modify workflows programmatically
- **Extensible**: Can execute workflows via n8n integration (future)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     LAZI VISUAL WORKFLOW SYSTEM                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   React      │    │   Workflow   │    │   Backend    │      │
│  │   Flow       │◄──►│   JSON       │◄──►│   API        │      │
│  │   Canvas     │    │   Store      │    │   /api/v2    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              Real-time Data (React Query)            │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
app/features/workflow-visualizer/
├── components/
│   ├── WorkflowCanvas.tsx           # Main React Flow canvas
│   ├── WorkflowToolbar.tsx          # Top toolbar (save, export, etc)
│   ├── WorkflowSidebar.tsx          # Node palette & properties
│   └── NodeInspector.tsx            # Selected node details
│
├── nodes/                            # Custom node types
│   ├── ApiSourceNode.tsx             # ServiceTitan API source
│   ├── DatabaseNode.tsx              # Database schema node
│   ├── TriggerNode.tsx               # Trigger/webhook node
│   ├── FrontendNode.tsx              # Frontend component connection
│   └── index.ts                      # Node type registry
│
├── edges/                            # Custom edge types
│   ├── DataFlowEdge.tsx              # Shows data count on edge
│   └── index.ts
│
├── hooks/
│   ├── useWorkflow.ts                # Main workflow state hook
│   └── useNodeData.ts                # Fetch live data for nodes
│
├── stores/
│   └── workflowStore.ts              # Zustand store for workflow state
│
├── types/
│   └── workflow.types.ts             # TypeScript types
│
├── workflows/                         # Saved workflow definitions
│   └── data-flow-chain.json          # Main data flow
│
└── index.ts                          # Exports
```

## Usage

### Access the Workflow Visualizer

Navigate to `/workflows` in your browser to access the visual workflow system.

### Node Types

- **API Source** (🔧): External API endpoints (ServiceTitan, etc)
- **Database** (🗄️): Database schemas (raw, master, crm, sync, audit, pricebook)
- **Trigger** (⚡): Event triggers (webhook, schedule, event, manual)
- **Frontend** (🖥️): Frontend UI components
- **Transform** (🔄): Data transformation nodes
- **Condition** (🔀): Conditional logic nodes

### Live Data

The system automatically fetches live data every 30 seconds:
- Row counts for each database schema
- Last sync timestamps
- Connection status

### Import/Export

- **Export**: Click the "Export" button to download workflow as JSON
- **Import**: Click the "Import" button to load a workflow from JSON file

## API Endpoints

### Get Schema Statistics
```bash
GET /api/v2/workflows/stats/schemas
Headers: X-Tenant-ID: 3222348440
```

### Get Table Statistics
```bash
GET /api/v2/workflows/stats/tables/:schema
Headers: X-Tenant-ID: 3222348440
```

### Get Live System Stats
```bash
GET /api/v2/workflows/stats/live
Headers: X-Tenant-ID: 3222348440
```

## Development

### Adding New Node Types

1. Create a new node component in `nodes/`
2. Add the node type to `types/workflow.types.ts`
3. Register the node in `nodes/index.ts`
4. Add to the node palette in `components/WorkflowSidebar.tsx`

### Adding New Edge Types

1. Create a new edge component in `edges/`
2. Register the edge in `edges/index.ts`

### Modifying Workflows Programmatically

Workflows are stored as JSON and can be modified by AI or scripts:

```typescript
import { useWorkflowStore } from '@/app/features/workflow-visualizer';

const { importWorkflow } = useWorkflowStore();

// Load a workflow from JSON
const workflow = { /* workflow JSON */ };
importWorkflow(JSON.stringify(workflow));
```

## Next Steps

- [ ] Add workflow execution via n8n
- [ ] Add more node types (Transform, Condition, Action, Queue)
- [ ] Add workflow validation
- [ ] Add workflow versioning
- [ ] Add AI editing capabilities
- [ ] Add workflow templates
