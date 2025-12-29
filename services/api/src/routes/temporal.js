/**
 * Temporal API Routes
 */

import { Router } from 'express';
import { getTemporalClient } from '../temporal/client.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('temporal-routes');
const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER WORKFLOWS
// ─────────────────────────────────────────────────────────────────────────────

router.post('/workflows/full-sync', async (req, res, next) => {
    try {
        const client = await getTemporalClient();
        const { entities, notify } = req.body;
        
        const handle = await client.workflow.start('fullSyncWorkflow', {
            taskQueue: 'sync-tasks',
            workflowId: `full-sync-${Date.now()}`,
            args: [{ entities, notify }]
        });
        
        logger.info('Full sync workflow started', { workflowId: handle.workflowId });
        
        res.json({
            success: true,
            workflowId: handle.workflowId,
            runId: handle.firstExecutionRunId,
            status: 'started'
        });
    } catch (error) {
        logger.error('Failed to start full sync', { error: error.message });
        next(error);
    }
});

router.post('/workflows/incremental-sync', async (req, res, next) => {
    try {
        const client = await getTemporalClient();
        
        const handle = await client.workflow.start('incrementalSyncWorkflow', {
            taskQueue: 'sync-tasks',
            workflowId: `incremental-sync-${Date.now()}`,
            args: []
        });
        
        logger.info('Incremental sync workflow started', { workflowId: handle.workflowId });
        
        res.json({
            success: true,
            workflowId: handle.workflowId,
            runId: handle.firstExecutionRunId,
            status: 'started'
        });
    } catch (error) {
        logger.error('Failed to start incremental sync', { error: error.message });
        next(error);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW STATUS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/workflows/:workflowId', async (req, res, next) => {
    try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(req.params.workflowId);
        const description = await handle.describe();
        
        res.json({
            success: true,
            workflowId: description.workflowId,
            runId: description.runId,
            status: description.status.name,
            startTime: description.startTime,
            closeTime: description.closeTime
        });
    } catch (error) {
        logger.error('Failed to get workflow status', { error: error.message });
        next(error);
    }
});

router.get('/workflows/:workflowId/result', async (req, res, next) => {
    try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(req.params.workflowId);
        const result = await handle.result();
        
        res.json({ success: true, result });
    } catch (error) {
        logger.error('Failed to get workflow result', { error: error.message });
        next(error);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW CONTROL
// ─────────────────────────────────────────────────────────────────────────────

router.post('/workflows/:workflowId/cancel', async (req, res, next) => {
    try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(req.params.workflowId);
        await handle.signal('cancel');
        
        logger.info('Workflow cancelled', { workflowId: req.params.workflowId });
        res.json({ success: true, status: 'cancelled' });
    } catch (error) {
        logger.error('Failed to cancel workflow', { error: error.message });
        next(error);
    }
});

router.post('/workflows/:workflowId/pause', async (req, res, next) => {
    try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(req.params.workflowId);
        await handle.signal('pause');
        
        logger.info('Workflow paused', { workflowId: req.params.workflowId });
        res.json({ success: true, status: 'paused' });
    } catch (error) {
        logger.error('Failed to pause workflow', { error: error.message });
        next(error);
    }
});

router.post('/workflows/:workflowId/resume', async (req, res, next) => {
    try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(req.params.workflowId);
        await handle.signal('resume');
        
        logger.info('Workflow resumed', { workflowId: req.params.workflowId });
        res.json({ success: true, status: 'resumed' });
    } catch (error) {
        logger.error('Failed to resume workflow', { error: error.message });
        next(error);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULES
// ─────────────────────────────────────────────────────────────────────────────

router.get('/schedules', async (req, res, next) => {
    try {
        const client = await getTemporalClient();
        const schedules = [];
        
        for await (const schedule of client.schedule.list()) {
            schedules.push({
                scheduleId: schedule.scheduleId,
                info: schedule.info
            });
        }
        
        res.json({ success: true, schedules });
    } catch (error) {
        logger.error('Failed to list schedules', { error: error.message });
        next(error);
    }
});

router.post('/schedules/:scheduleId/trigger', async (req, res, next) => {
    try {
        const client = await getTemporalClient();
        const handle = client.schedule.getHandle(req.params.scheduleId);
        await handle.trigger();
        
        logger.info('Schedule triggered', { scheduleId: req.params.scheduleId });
        res.json({ success: true, status: 'triggered' });
    } catch (error) {
        logger.error('Failed to trigger schedule', { error: error.message });
        next(error);
    }
});

export default router;
