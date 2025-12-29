/**
 * Temporal Client - Singleton
 */

import { Client, Connection } from '@temporalio/client';

let client = null;
let connection = null;

export async function getTemporalClient() {
    if (client) return client;
    
    const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
    const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
    
    console.log(`Connecting to Temporal at ${address}...`);
    
    connection = await Connection.connect({ address });
    
    client = new Client({
        connection,
        namespace
    });
    
    console.log('✅ Temporal client connected');
    return client;
}

export async function closeTemporalClient() {
    if (connection) {
        await connection.close();
        connection = null;
        client = null;
        console.log('Temporal client disconnected');
    }
}

// Graceful shutdown
process.on('SIGTERM', closeTemporalClient);
process.on('SIGINT', closeTemporalClient);

export default { getTemporalClient, closeTemporalClient };
