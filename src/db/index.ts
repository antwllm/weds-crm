import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

let _db: NodePgDatabase<typeof schema> | null = null;
let _pool: pg.Pool | null = null;

/**
 * Get the database instance. Uses lazy initialization so that
 * importing this module does not immediately create a connection
 * (useful for tests that only need schema types).
 */
export function getDb(): NodePgDatabase<typeof schema> {
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    _pool = new Pool({ connectionString: databaseUrl });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

/**
 * Close the database connection pool.
 */
export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

/**
 * Get the raw pg Pool instance (needed by connect-pg-simple session store).
 * Creates the pool if it doesn't exist yet.
 */
export function getPool(): pg.Pool {
  if (!_pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    _pool = new Pool({ connectionString: databaseUrl });
  }
  return _pool;
}

// Re-export schema for convenience
export { schema };
