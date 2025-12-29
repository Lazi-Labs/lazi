/**
 * Prometheus Metrics for ST Automation
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();

// Collect default Node.js metrics
collectDefaultMetrics({ register: registry });

// ─────────────────────────────────────────────────────────────────────────────
// SYNC METRICS
// ─────────────────────────────────────────────────────────────────────────────

export const syncCounter = new Counter({
    name: 'st_automation_sync_total',
    help: 'Total number of sync operations',
    labelNames: ['entity', 'status', 'type'],
    registers: [registry]
});

export const syncDuration = new Histogram({
    name: 'st_automation_sync_duration_seconds',
    help: 'Duration of sync operations in seconds',
    labelNames: ['entity', 'type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
    registers: [registry]
});

export const lastSyncTimestamp = new Gauge({
    name: 'st_automation_last_sync_timestamp',
    help: 'Timestamp of last successful sync',
    labelNames: ['entity'],
    registers: [registry]
});

export const recordsGauge = new Gauge({
    name: 'st_automation_records_total',
    help: 'Total records in each table',
    labelNames: ['schema', 'table'],
    registers: [registry]
});

// ─────────────────────────────────────────────────────────────────────────────
// ERROR METRICS
// ─────────────────────────────────────────────────────────────────────────────

export const errorCounter = new Counter({
    name: 'st_automation_errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'entity', 'code'],
    registers: [registry]
});

// ─────────────────────────────────────────────────────────────────────────────
// API METRICS
// ─────────────────────────────────────────────────────────────────────────────

export const httpRequestDuration = new Histogram({
    name: 'st_automation_http_request_duration_seconds',
    help: 'Duration of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [registry]
});

export const httpRequestsTotal = new Counter({
    name: 'st_automation_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
    registers: [registry]
});

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW METRICS
// ─────────────────────────────────────────────────────────────────────────────

export const workflowCounter = new Counter({
    name: 'st_automation_workflows_total',
    help: 'Total workflows executed',
    labelNames: ['workflow', 'status'],
    registers: [registry]
});

export const workflowDuration = new Histogram({
    name: 'st_automation_workflow_duration_seconds',
    help: 'Duration of workflow executions',
    labelNames: ['workflow'],
    buckets: [1, 5, 10, 30, 60, 120, 300, 600],
    registers: [registry]
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPRESS MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

export function metricsMiddleware(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        
        httpRequestDuration.observe(
            { method: req.method, route, status: res.statusCode },
            duration
        );
        
        httpRequestsTotal.inc({
            method: req.method,
            route,
            status: res.statusCode
        });
    });
    
    next();
}

export function metricsEndpoint(req, res) {
    res.set('Content-Type', registry.contentType);
    registry.metrics().then(metrics => res.end(metrics));
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function recordSync(entity, type, status, duration) {
    syncCounter.inc({ entity, type, status });
    syncDuration.observe({ entity, type }, duration);
    
    if (status === 'success') {
        lastSyncTimestamp.set({ entity }, Date.now() / 1000);
    }
}

export function recordError(type, entity, code) {
    errorCounter.inc({ type, entity, code: code || 'unknown' });
}

export function recordWorkflow(workflow, status, duration) {
    workflowCounter.inc({ workflow, status });
    if (duration) {
        workflowDuration.observe({ workflow }, duration);
    }
}

export default {
    registry,
    syncCounter,
    syncDuration,
    lastSyncTimestamp,
    recordsGauge,
    errorCounter,
    httpRequestDuration,
    httpRequestsTotal,
    workflowCounter,
    workflowDuration,
    metricsMiddleware,
    metricsEndpoint,
    recordSync,
    recordError,
    recordWorkflow,
};
