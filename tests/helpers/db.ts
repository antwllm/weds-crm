import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from '../../src/db/schema.js';

const { Pool } = pg;

let _testPool: pg.Pool | null = null;
let _testDb: NodePgDatabase<typeof schema> | null = null;

/**
 * Create a drizzle instance pointing at a test database.
 * Uses DATABASE_URL from env or defaults to a local test DB.
 */
export function setupTestDb(): NodePgDatabase<typeof schema> {
  if (!_testDb) {
    const databaseUrl =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/weds_crm_test';

    _testPool = new Pool({ connectionString: databaseUrl });
    _testDb = drizzle(_testPool, { schema });
  }
  return _testDb;
}

/**
 * Truncate all tables in the test database.
 * Order matters due to foreign key constraints.
 */
export async function cleanupTestDb(): Promise<void> {
  if (!_testDb) return;

  await _testDb.execute(sql`TRUNCATE TABLE linked_emails CASCADE`);
  await _testDb.execute(sql`TRUNCATE TABLE email_templates CASCADE`);
  await _testDb.execute(sql`TRUNCATE TABLE sync_log CASCADE`);
  await _testDb.execute(sql`TRUNCATE TABLE activities CASCADE`);
  await _testDb.execute(sql`TRUNCATE TABLE leads CASCADE`);
}

/**
 * Close the test database connection pool.
 */
export async function closeTestDb(): Promise<void> {
  if (_testPool) {
    await _testPool.end();
    _testPool = null;
    _testDb = null;
  }
}
