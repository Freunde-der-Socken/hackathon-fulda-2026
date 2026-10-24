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

// Demo plant → class mapping, so a device can POST readings with this plantId in development
await db
  .insert(schema.plantClasses)
  .values({
    plantId: '6f1c0b6e-2a4d-4c43-9a8e-0d6a2f1b7c11',
    classId: '3b8e5d2a-7c1f-4e9b-8a6d-5f2c1e0b9a44',
  })
  .onConflictDoNothing();

await client.end();
process.stdout.write('Seeded the demo plant → class mapping.\n');
