import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

if (!env.DATABASE_URL) {
  process.stderr.write('DATABASE_URL is not set, nothing to seed.\n');
  process.exit(1);
}

const client = postgres(env.DATABASE_URL, { max: 1 });
export const db = drizzle(client, { schema, casing: 'snake_case' });

// Keep the seed idempotent so it can run as often as you like: use fixed ids plus
// `.onConflictDoNothing()`, e.g.
//   await db.insert(schema.todos).values({ id: '…', title: 'First' }).onConflictDoNothing();

await client.end();
process.stdout.write('Nothing to seed yet.\n');
