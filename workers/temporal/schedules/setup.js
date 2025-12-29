/**
 * Set up Temporal Schedules
 */

import { getTemporalClient } from '../client.js';

async function setupSchedules() {
    console.log('Setting up Temporal schedules...\n');
    
    const client = await getTemporalClient();
    
    const schedules = [
        {
            scheduleId: 'full-sync-daily',
            spec: { cronExpressions: ['0 1 * * *'] },  // 1 AM daily
            action: {
                type: 'startWorkflow',
                workflowType: 'fullSyncWorkflow',
                taskQueue: 'sync-tasks',
                args: [{ notify: true }]
            },
            description: 'Full sync from ServiceTitan - daily at 1 AM'
        },
        {
            scheduleId: 'incremental-sync',
            spec: { intervals: [{ every: '15 minutes' }] },
            action: {
                type: 'startWorkflow',
                workflowType: 'incrementalSyncWorkflow',
                taskQueue: 'sync-tasks',
                args: []
            },
            description: 'Incremental sync - every 15 minutes'
        }
    ];
    
    for (const schedule of schedules) {
        try {
            await client.schedule.create({
                scheduleId: schedule.scheduleId,
                spec: schedule.spec,
                action: schedule.action
            });
            console.log(`✅ Created: ${schedule.scheduleId}`);
            console.log(`   ${schedule.description}\n`);
        } catch (error) {
            if (error.message?.includes('already exists')) {
                console.log(`ℹ️  Exists: ${schedule.scheduleId}\n`);
            } else {
                throw error;
            }
        }
    }
    
    console.log('📅 All schedules configured');
    process.exit(0);
}

setupSchedules().catch((err) => {
    console.error('Failed to setup schedules:', err);
    process.exit(1);
});
