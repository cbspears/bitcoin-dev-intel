import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../db/schema';

// Lazy initialization for serverless environments
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Create postgres client with connection pooling disabled for serverless
  // The `prepare: false` is required for Supabase Transaction Pooler
  const client = postgres(connectionString, {
    prepare: false,
    ssl: 'require',
  });

  _db = drizzle(client, { schema });
  return _db;
}

// Export a proxy that lazily initializes the db
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

// Export schema for convenience
export { schema };

// Export types
export type Database = ReturnType<typeof drizzle>;
