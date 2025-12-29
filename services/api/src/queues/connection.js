/**
 * Redis Connection for BullMQ
 * Shared connection configuration for all queues and workers
 */

import IORedis from 'ioredis';
import config from '../config/index.js';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('redis');

// Connection options
const connectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  db: config.redis.db,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,    // Required for BullMQ
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
};

// Add password if configured
if (config.redis.password) {
  connectionOptions.password = config.redis.password;
}

// Create connection instance
let connection = null;

export function getRedisConnection() {
  if (!connection) {
    connection = new IORedis(connectionOptions);
    
    connection.on('connect', () => {
      logger.info('Redis connected', { host: config.redis.host, port: config.redis.port });
    });
    
    connection.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });
    
    connection.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }
  
  return connection;
}

// Create a duplicate connection for subscribers (BullMQ requirement)
export function createRedisConnection() {
  const conn = new IORedis(connectionOptions);
  
  conn.on('error', (err) => {
    logger.error('Redis subscriber error', { error: err.message });
  });
  
  return conn;
}

// Export connection options for BullMQ Queue/Worker constructors
export const redisConnectionConfig = {
  connection: connectionOptions,
};

export default { getRedisConnection, createRedisConnection, redisConnectionConfig };
