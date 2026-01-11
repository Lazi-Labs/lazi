# LAZI Visual Workflow System - Deployment Summary

**Deployed:** December 26, 2024  
**Status:** ✅ Complete

---

## 🎯 What Was Deployed

A complete visual workflow and data flow visualization system for LAZI that:
- Shows how data flows through the system (ServiceTitan → raw → master → crm → audit)
- Displays real-time data counts and sync status
- Allows visual editing of workflows via drag-and-drop
- Is AI-editable via JSON
- Can eventually execute workflows via n8n

---

## 📁 Files Created

### Frontend (Next.js App)

**Location:** `/opt/docker/apps/lazi/apps/web/app/features/workflow-visualizer/`

#### Core Components
- ✅ `components/WorkflowCanvas.tsx` - Main React Flow canvas with drag-and-drop
- ✅ `components/WorkflowToolbar.tsx` - Top toolbar (save, export, import)
- ✅ `components/WorkflowSidebar.tsx` - Node palette for adding nodes
- ✅ `components/NodeInspector.tsx` - Inspector panel for selected nodes

#### Custom Nodes
- ✅ `nodes/DatabaseNode.tsx` - Database schema nodes (raw, master, crm, etc)
- ✅ `nodes/ApiSourceNode.tsx` - API source nodes (ServiceTitan)
- ✅ `nodes/FrontendNode.tsx` - Frontend component nodes
- ✅ `nodes/TriggerNode.tsx` - Trigger nodes (webhook, schedule, event)
- ✅ `nodes/index.ts` - Node type registry

#### Custom Edges
- ✅ `edges/DataFlowEdge.tsx` - Animated data flow edges with labels
- ✅ `edges/index.ts` - Edge type registry

#### State Management
- ✅ `stores/workflowStore.ts` - Zustand store for workflow state
- ✅ `hooks/useWorkflow.ts` - Main workflow hook
- ✅ `hooks/useNodeData.ts` - Live data fetching hook

#### Types & Data
- ✅ `types/workflow.types.ts` - TypeScript type definitions
- ✅ `workflows/data-flow-chain.json` - Default workflow definition
- ✅ `index.ts` - Public exports
- ✅ `README.md` - Documentation

#### Page Route
- ✅ `app/(dashboard)/workflows/page.tsx` - Workflow visualizer page

### Backend (Express API)

**Location:** `/opt/docker/apps/lazi/services/api/src/`

#### Module Structure
- ✅ `modules/workflows/workflow.routes.js` - Route definitions
- ✅ `modules/workflows/workflow.controller.js` - Request handlers
- ✅ `modules/workflows/workflow.service.js` - Business logic

#### Route Integration
- ✅ `routes/v2.routes.js` - Added workflow routes to v2 API
- ✅ `routes/index.js` - Added workflow visualizer routes to main router

---

## 🔌 API Endpoints

All endpoints require `X-Tenant-ID: 3222348440` header.

### Schema Statistics
```bash
GET /api/v2/workflows/stats/schemas
```
Returns row counts and last sync time for all schemas (raw, master, crm, sync, audit, pricebook).

**Response:**
```json
{
  "success": true,
  "data": {
    "raw": {
      "rowCount": 6217,
      "tables": [...],
      "lastSync": "2024-12-26T00:00:00Z"
    },
    "master": {
      "rowCount": 1451,
      "tables": [...],
      "lastSync": "2024-12-26T00:00:00Z"
    }
  }
}
```

### Table Statistics
```bash
GET /api/v2/workflows/stats/tables/:schema
```
Returns detailed statistics for tables in a specific schema.

**Response:**
```json
{
  "success": true,
  "schema": "raw",
  "tables": [
    {
      "name": "st_customers",
      "rowCount": 1234,
      "inserts": 1234,
      "updates": 56,
      "deletes": 0
    }
  ]
}
```

### Live System Stats
```bash
GET /api/v2/workflows/stats/live
```
Returns real-time database and connection statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "database": {
      "sizeBytes": 1234567890,
      "sizePretty": "1.2 GB"
    },
    "connections": {
      "total": 10,
      "byState": {
        "active": 3,
        "idle": 7
      }
    }
  }
}
```

---

## 🚀 How to Access

### Frontend
Navigate to: **http://localhost:3000/workflows**

### Features Available
1. **Visual Canvas** - Drag and drop nodes to create workflows
2. **Node Palette** - Add new nodes from the sidebar
3. **Live Data** - See real-time row counts on database nodes
4. **Node Inspector** - Click a node to view/edit its properties
5. **Import/Export** - Save workflows as JSON files
6. **Minimap** - Navigate large workflows easily

---

## 🎨 Node Types

| Icon | Type | Description | Color |
|------|------|-------------|-------|
| 🔧 | API Source | External API endpoints | Orange |
| 🗄️ | Database | Database schemas | Purple/Blue/Green |
| ⚡ | Trigger | Event triggers | Yellow |
| 🖥️ | Frontend | UI components | Indigo |
| 🔄 | Transform | Data transformations | Gray |
| 🔀 | Condition | Conditional logic | Gray |

### Database Schema Colors
- **raw** - Blue (📥)
- **master** - Purple (📊)
- **crm** - Green (👤)
- **sync** - Yellow (🔄)
- **audit** - Gray (📋)
- **pricebook** - Orange (💰)

---

## 🔄 Data Flow

The default workflow shows the LAZI data flow chain:

```
ServiceTitan API (🔧)
    ↓ sync
raw.* (📥) [6,217 rows]
    ↓ trigger
master.* (📊) [1,451 rows]
    ↓ trigger
crm.* (👤) [8 rows]
    ↓ trigger
audit.* (📋) [0 rows]

master.* → Jobs Page (🖥️)
crm.* → Customers Page (🖥️)
```

---

## 🛠️ Technical Stack

### Frontend
- **React Flow** v11.11.4 - Visual workflow canvas
- **Zustand** v5.0.9 - State management
- **TanStack Query** v5.90.12 - Data fetching
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

### Backend
- **Express.js** - API server
- **PostgreSQL** - Database
- **pg_stat_user_tables** - Live statistics

---

## 📊 Live Data Updates

The system automatically fetches live data every **30 seconds** using React Query:
- Row counts for each schema
- Last sync timestamps
- Database size and connections

---

## 🔐 Authentication

All API endpoints require:
```
X-Tenant-ID: 3222348440
```

Future: Will integrate with existing LAZI auth system.

---

## 🧪 Testing

### Test Schema Stats Endpoint
```bash
curl http://localhost:3001/api/v2/workflows/stats/schemas \
  -H "X-Tenant-ID: 3222348440"
```

### Test Table Stats Endpoint
```bash
curl http://localhost:3001/api/v2/workflows/stats/tables/raw \
  -H "X-Tenant-ID: 3222348440"
```

### Test Live Stats Endpoint
```bash
curl http://localhost:3001/api/v2/workflows/stats/live \
  -H "X-Tenant-ID: 3222348440"
```

---

## 📝 Usage Examples

### Load Default Workflow
The system automatically loads `data-flow-chain.json` on first visit.

### Export Workflow
1. Click "Export" button in toolbar
2. Workflow downloads as JSON file
3. Can be edited by AI or manually

### Import Workflow
1. Click "Import" button in toolbar
2. Select JSON file
3. Workflow loads into canvas

### Add Nodes
1. Click node type in sidebar
2. Node appears on canvas
3. Drag to position
4. Connect with edges

### Edit Node
1. Click node on canvas
2. Inspector panel opens on right
3. Edit label, description
4. View live data

---

## 🎯 Next Steps

### Phase 2 - Execution
- [ ] Connect to n8n for workflow execution
- [ ] Add workflow triggers (webhook, schedule, event)
- [ ] Add step execution logs
- [ ] Add error handling and retries

### Phase 3 - Advanced Nodes
- [ ] Transform nodes (map, filter, reduce)
- [ ] Condition nodes (IF/ELSE branching)
- [ ] Action nodes (API calls, database writes)
- [ ] Queue nodes (BullMQ integration)

### Phase 4 - AI Integration
- [ ] AI workflow generation from natural language
- [ ] AI workflow optimization suggestions
- [ ] AI data flow analysis
- [ ] AI error diagnosis

### Phase 5 - Collaboration
- [ ] Multi-user editing
- [ ] Workflow versioning
- [ ] Workflow templates library
- [ ] Workflow sharing

---

## 🐛 Troubleshooting

### Frontend Not Loading
```bash
cd /opt/docker/apps/lazi/apps/web
npm run dev
```

### API Endpoints Not Working
```bash
cd /opt/docker/apps/lazi/services/api
npm start
```

### Database Connection Issues
Check `DATABASE_URL` in `.env` file.

### Live Data Not Updating
Check React Query devtools in browser console.

---

## 📚 Documentation

- **Frontend README:** `/apps/web/app/features/workflow-visualizer/README.md`
- **API Docs:** See endpoint descriptions above
- **React Flow Docs:** https://reactflow.dev/
- **Zustand Docs:** https://zustand-demo.pmnd.rs/

---

## ✅ Success Criteria

All criteria met:

- [x] Canvas renders with dark theme
- [x] Nodes display with correct colors per schema
- [x] Edges animate between nodes
- [x] Live row counts appear on database nodes
- [x] Can drag nodes to reposition
- [x] Can connect nodes with edges
- [x] MiniMap shows overview
- [x] Can zoom/pan canvas
- [x] Can add nodes from palette
- [x] Can edit node properties
- [x] Can import/export workflows
- [x] API endpoints return live data

---

## 🎉 Deployment Complete

The LAZI Visual Workflow System is now fully deployed and ready to use!

**Access:** 
- Production: https://lazilabs.com/dashboard/workflows
- Development: http://localhost:3000/workflows
