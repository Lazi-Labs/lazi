# LAZI Temporal Workflows Reference

## Overview

Temporal.io is used in LAZI for durable, long-running workflow orchestration. It provides automatic retries, state persistence, and visibility into workflow execution.

---

## What Temporal is Used For

| Use Case | Why Temporal |
|----------|--------------|
| **Full Data Sync** | Long-running (30+ min), needs pause/resume |
| **Incremental Sync** | Scheduled, needs reliable execution |
| **Multi-step Operations** | Atomic operations across services |
| **Scheduled Tasks** | Cron-like scheduling with durability |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Temporal Architecture                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Temporal Server                                 │   │
│  │                      (Port 7233)                                     │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │  Workflow   │  │   History   │  │  Matching   │                 │   │
│  │  │  Service    │  │   Service   │  │  Service    │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    │ gRPC                                   │
│                    ┌───────────────┼───────────────┐                       │
│                    │               │               │                       │
│                    ▼               ▼               ▼                       │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐    │
│  │    Sync Worker      │  │   Temporal Client   │  │  Temporal UI    │    │
│  │  (sync-tasks queue) │  │   (API triggers)    │  │  (Port 8088)    │    │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
workers/temporal/
├── client.js           # Temporal client singleton
├── activities/
│   └── index.js        # Activity implementations
├── workflows/
│   └── index.js        # Workflow definitions
├── workers/
│   └── sync.worker.js  # Worker process
└── schedules/
    └── index.js        # Schedule definitions
```

---

## Workflow Definitions

### Full Sync Workflow

```javascript
// workers/temporal/workflows/index.js

export async function fullSyncWorkflow(options = {}) {
    const { 
        entities = ['customers', 'jobs', 'invoices', 'estimates'], 
        notify = true 
    } = options;
    
    let cancelled = false;
    let paused = false;
    
    // Handle signals for control
    setHandler(cancelSignal, () => { cancelled = true; });
    setHandler(pauseSignal, () => { paused = true; });
    setHandler(resumeSignal, () => { paused = false; });
    
    const results = [];
    
    for (const entity of entities) {
        if (cancelled) break;
        
        // Wait if paused
        while (paused && !cancelled) {
            await sleep('5 seconds');
        }
        
        // Paginate through all records
        let pageToken = undefined;
        do {
            const result = await activities.fetchEntity(entity, pageToken);
            pageToken = result.hasMore ? result.continuationToken : undefined;
            
            if (result.hasMore) {
                await sleep('200 milliseconds'); // Rate limiting
            }
        } while (pageToken);
        
        // Update sync state
        await activities.updateSyncState(entity, 'full', totalRecords);
        results.push({ entity, count: totalRecords });
    }
    
    if (notify) {
        await activities.sendSlackNotification('#sync-alerts', summary);
    }
    
    return { success: !cancelled, results };
}
```

### Incremental Sync Workflow

```javascript
export async function incrementalSyncWorkflow() {
    const entities = ['customers', 'jobs', 'invoices', 'estimates'];
    const results = [];
    
    for (const entity of entities) {
        // Get last sync timestamp
        const syncState = await activities.getSyncState(entity);
        const modifiedSince = syncState.lastIncrementalSync || syncState.lastFullSync;
        
        if (!modifiedSince) continue;
        
        // Fetch only modified records
        let totalUpdated = 0;
        let pageToken = undefined;
        
        do {
            const result = await activities.fetchEntity(entity, modifiedSince, pageToken);
            totalUpdated += result.recordsFetched;
            pageToken = result.hasMore ? result.continuationToken : undefined;
        } while (pageToken);
        
        if (totalUpdated > 0) {
            await activities.updateSyncState(entity, 'incremental', totalUpdated);
            results.push({ entity, count: totalUpdated });
        }
    }
    
    return { success: true, results };
}
```

---

## Activities

Activities are the actual work units that interact with external systems.

### Fetch Activities

```javascript
// workers/temporal/activities/index.js

export async function fetchCustomers(modifiedSince, pageToken) {
    const pool = getPool();
    
    try {
        const { default: stClient } = await import('../../services/stClient.js');
        
        const params = { pageSize: 100 };
        if (modifiedSince) params.modifiedOnOrAfter = modifiedSince;
        if (pageToken) params.page = pageToken;
        
        const response = await stClient.get('/crm/v2/tenant/{tenant}/customers', { params });
        const customers = response.data.data || [];
        
        // Upsert to database
        for (const customer of customers) {
            await pool.query(`
                INSERT INTO raw.st_customers (st_id, name, type, active, balance, full_data, fetched_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (st_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    full_data = EXCLUDED.full_data,
                    fetched_at = NOW()
            `, [customer.id, customer.name, customer.type, customer.active, 
                customer.balance, JSON.stringify(customer)]);
        }
        
        return {
            entity: 'customers',
            recordsFetched: customers.length,
            hasMore: !!response.data.hasMore,
            continuationToken: response.data.continueFrom
        };
    } finally {
        await pool.end();
    }
}

export async function fetchJobs(modifiedSince, pageToken) { /* similar */ }
export async function fetchInvoices(modifiedSince, pageToken) { /* similar */ }
export async function fetchEstimates(modifiedSince, pageToken) { /* similar */ }
```

### State Activities

```javascript
export async function getSyncState(entity) {
    const pool = getPool();
    
    try {
        const result = await pool.query(`
            SELECT last_full_sync, last_incremental_sync, records_count
            FROM raw.sync_state
            WHERE table_name = $1
        `, [`raw.st_${entity}`]);
        
        if (result.rows.length === 0) {
            return { lastFullSync: null, lastIncrementalSync: null, recordCount: 0 };
        }
        
        return {
            lastFullSync: result.rows[0].last_full_sync?.toISOString(),
            lastIncrementalSync: result.rows[0].last_incremental_sync?.toISOString(),
            recordCount: parseInt(result.rows[0].records_count)
        };
    } finally {
        await pool.end();
    }
}

export async function updateSyncState(entity, syncType, recordCount) {
    const pool = getPool();
    const column = syncType === 'full' ? 'last_full_sync' : 'last_incremental_sync';
    
    try {
        await pool.query(`
            INSERT INTO raw.sync_state (table_name, ${column}, records_count, sync_status)
            VALUES ($1, NOW(), $2, 'completed')
            ON CONFLICT (table_name) DO UPDATE SET
                ${column} = NOW(),
                records_count = $2,
                sync_status = 'completed'
        `, [`raw.st_${entity}`, recordCount]);
    } finally {
        await pool.end();
    }
}
```

### Notification Activities

```javascript
export async function sendSlackNotification(channel, message) {
    if (!process.env.SLACK_WEBHOOK_URL) {
        console.log(`[Slack] Would send to ${channel}: ${message}`);
        return true;
    }
    
    try {
        const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel, text: message })
        });
        return response.ok;
    } catch (error) {
        console.error('Slack notification failed:', error);
        return false;
    }
}
```

---

## Worker Configuration

### Sync Worker

```javascript
// workers/temporal/workers/sync.worker.js

import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from '../activities/index.js';

async function run() {
    console.log('Starting sync worker...');
    
    const connection = await NativeConnection.connect({
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233'
    });
    
    const worker = await Worker.create({
        connection,
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
        taskQueue: 'sync-tasks',
        workflowsPath: new URL('../workflows/index.js', import.meta.url).pathname,
        activities,
        maxConcurrentActivityTaskExecutions: 10,
        maxConcurrentWorkflowTaskExecutions: 5
    });
    
    console.log('🔄 Sync worker started, listening on sync-tasks queue');
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        await worker.shutdown();
        await connection.close();
        process.exit(0);
    });
    
    await worker.run();
}

run().catch(console.error);
```

---

## Client Usage

### Temporal Client Singleton

```javascript
// workers/temporal/client.js

import { Client, Connection } from '@temporalio/client';

let client = null;
let connection = null;

export async function getTemporalClient() {
    if (client) return client;
    
    const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
    const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
    
    connection = await Connection.connect({ address });
    
    client = new Client({
        connection,
        namespace
    });
    
    return client;
}

export async function closeTemporalClient() {
    if (connection) {
        await connection.close();
        connection = null;
        client = null;
    }
}
```

### Starting Workflows from API

```javascript
// In API route handler
import { getTemporalClient } from '../../../workers/temporal/client.js';

router.post('/sync/full', async (req, res) => {
    const client = await getTemporalClient();
    
    const handle = await client.workflow.start('fullSyncWorkflow', {
        taskQueue: 'sync-tasks',
        workflowId: `full-sync-${Date.now()}`,
        args: [{ entities: ['customers', 'jobs'], notify: true }]
    });
    
    res.json({
        workflowId: handle.workflowId,
        runId: handle.firstExecutionRunId
    });
});
```

---

## Signals

Workflows can receive signals for control:

```javascript
// Define signals
export const cancelSignal = defineSignal('cancel');
export const pauseSignal = defineSignal('pause');
export const resumeSignal = defineSignal('resume');

// Send signal from API
router.post('/sync/:workflowId/pause', async (req, res) => {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(req.params.workflowId);
    await handle.signal(pauseSignal);
    res.json({ success: true });
});
```

---

## Activity Configuration

```javascript
const activities = proxyActivities({
    // Timeout for each activity execution
    startToCloseTimeout: '5 minutes',
    
    // Retry configuration
    retry: {
        initialInterval: '1 second',
        backoffCoefficient: 2,
        maximumAttempts: 5,
        maximumInterval: '1 minute',
        nonRetryableErrorTypes: ['ValidationError']
    }
});
```

---

## Creating New Workflows

### 1. Define the Workflow

```javascript
// workers/temporal/workflows/my-workflow.js

import { proxyActivities, sleep } from '@temporalio/workflow';

const activities = proxyActivities({
    startToCloseTimeout: '10 minutes',
});

export async function myNewWorkflow(input) {
    // Step 1
    const result1 = await activities.step1Activity(input);
    
    // Wait between steps
    await sleep('1 second');
    
    // Step 2
    const result2 = await activities.step2Activity(result1);
    
    return { result1, result2 };
}
```

### 2. Implement Activities

```javascript
// workers/temporal/activities/my-activities.js

export async function step1Activity(input) {
    // Do work
    return { processed: input };
}

export async function step2Activity(input) {
    // Do more work
    return { completed: true };
}
```

### 3. Register in Worker

```javascript
// workers/temporal/workers/my.worker.js

import { Worker } from '@temporalio/worker';
import * as activities from '../activities/my-activities.js';

const worker = await Worker.create({
    taskQueue: 'my-task-queue',
    workflowsPath: require.resolve('../workflows/my-workflow.js'),
    activities,
});
```

### 4. Start from API

```javascript
const handle = await client.workflow.start('myNewWorkflow', {
    taskQueue: 'my-task-queue',
    workflowId: `my-workflow-${Date.now()}`,
    args: [{ data: 'input' }]
});
```

---

## Error Handling

### In Activities

```javascript
export async function riskyActivity(input) {
    try {
        const result = await externalApiCall(input);
        return result;
    } catch (error) {
        if (error.code === 'RATE_LIMITED') {
            // Will be retried by Temporal
            throw error;
        }
        if (error.code === 'VALIDATION_ERROR') {
            // Non-retryable - mark as such
            throw new ApplicationFailure('Validation failed', 'ValidationError', true);
        }
        throw error;
    }
}
```

### In Workflows

```javascript
export async function safeWorkflow(input) {
    try {
        await activities.riskyActivity(input);
    } catch (error) {
        // Log and continue or fail workflow
        await activities.logError(error);
        throw error; // Fail the workflow
    }
}
```

---

## Monitoring

### Temporal UI

Access at `http://localhost:8088`

Features:
- View running/completed workflows
- Inspect workflow history
- Send signals to workflows
- View activity execution details
- Search workflows by ID

### API Endpoints

```bash
# List workflows
GET /api/temporal/workflows

# Get workflow status
GET /api/temporal/workflows/:workflowId

# Cancel workflow
POST /api/temporal/workflows/:workflowId/cancel

# List schedules
GET /api/temporal/schedules
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TEMPORAL_ADDRESS` | `localhost:7233` | Temporal server address |
| `TEMPORAL_NAMESPACE` | `default` | Temporal namespace |
| `SLACK_WEBHOOK_URL` | - | Slack notifications |

---

## Commands

```bash
# Start Temporal (Docker)
docker-compose up -d temporal temporal-ui

# Start sync worker
cd workers/temporal
node workers/sync.worker.js

# Or via npm script
cd services/api
npm run worker:temporal

# Open Temporal UI
open http://localhost:8088
```

---

*Temporal workflows documentation - January 2025*
