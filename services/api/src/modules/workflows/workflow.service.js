import { getPool } from '../../db/schema-connection.js';

const validSchemas = ['raw', 'master', 'crm', 'sync', 'audit', 'pricebook'];

export const getSchemaStats = async () => {
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT 
      schemaname as schema,
      tablename as table,
      n_live_tup as row_count,
      last_vacuum,
      last_autovacuum,
      last_analyze
    FROM pg_stat_user_tables
    WHERE schemaname IN ('raw', 'master', 'crm', 'sync', 'audit', 'pricebook')
    ORDER BY schemaname, tablename
  `);
  
  const schemaStats = {};
  
  result.rows.forEach(row => {
    if (!schemaStats[row.schema]) {
      schemaStats[row.schema] = {
        rowCount: 0,
        tables: [],
        lastSync: null,
      };
    }
    
    schemaStats[row.schema].rowCount += parseInt(row.row_count) || 0;
    schemaStats[row.schema].tables.push({
      name: row.table,
      rowCount: parseInt(row.row_count) || 0,
    });
    
    const lastUpdate = row.last_analyze || row.last_autovacuum || row.last_vacuum;
    if (lastUpdate && (!schemaStats[row.schema].lastSync || lastUpdate > schemaStats[row.schema].lastSync)) {
      schemaStats[row.schema].lastSync = lastUpdate;
    }
  });
  
  return schemaStats;
};

export const getTableStats = async (schema) => {
  if (!validSchemas.includes(schema)) {
    throw new Error(`Invalid schema. Must be one of: ${validSchemas.join(', ')}`);
  }
  
  const pool = getPool();
  
  const result = await pool.query(`
    SELECT 
      tablename as table,
      n_live_tup as row_count,
      n_tup_ins as inserts,
      n_tup_upd as updates,
      n_tup_del as deletes,
      last_vacuum,
      last_autovacuum,
      last_analyze,
      last_autoanalyze
    FROM pg_stat_user_tables
    WHERE schemaname = $1
    ORDER BY n_live_tup DESC
  `, [schema]);
  
  return {
    tables: result.rows.map(row => ({
      name: row.table,
      rowCount: parseInt(row.row_count) || 0,
      inserts: parseInt(row.inserts) || 0,
      updates: parseInt(row.updates) || 0,
      deletes: parseInt(row.deletes) || 0,
      lastVacuum: row.last_vacuum,
      lastAnalyze: row.last_analyze,
    })),
    count: result.rows.length,
  };
};

export const getLiveStats = async () => {
  const pool = getPool();
  
  const [dbSize, connections, activity] = await Promise.all([
    pool.query(`
      SELECT 
        pg_database_size(current_database()) as size_bytes,
        pg_size_pretty(pg_database_size(current_database())) as size_pretty
    `),
    pool.query(`
      SELECT count(*) as total
      FROM pg_stat_activity
      WHERE datname = current_database()
    `),
    pool.query(`
      SELECT 
        state,
        count(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
    `),
  ]);
  
  return {
    database: {
      sizeBytes: parseInt(dbSize.rows[0].size_bytes),
      sizePretty: dbSize.rows[0].size_pretty,
    },
    connections: {
      total: parseInt(connections.rows[0].total),
      byState: activity.rows.reduce((acc, row) => {
        acc[row.state || 'unknown'] = parseInt(row.count);
        return acc;
      }, {}),
    },
    timestamp: new Date().toISOString(),
  };
};

export const listWorkflows = async () => {
  return [];
};

export const getWorkflow = async (id) => {
  return null;
};

export const createWorkflow = async (data) => {
  return data;
};

export const updateWorkflow = async (id, data) => {
  return { id, ...data };
};

export const deleteWorkflow = async (id) => {
  return true;
};
