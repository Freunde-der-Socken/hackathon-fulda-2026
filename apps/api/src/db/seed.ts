import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';

if (!env.DATABASE_URL) {
  process.stderr.write('DATABASE_URL is not set, nothing to seed.\n');
  process.exit(1);
}

const client = postgres(env.DATABASE_URL, { max: 1 });
const db = drizzle(client, { schema, casing: 'snake_case' });

// Fixed ids plus onConflictDoNothing keep the seed idempotent: run it as often as you like
await db
  .insert(schema.items)
  .values([
    { id: '00000000-0000-4000-8000-000000000001', name: 'First example item' },
    { id: '00000000-0000-4000-8000-000000000002', name: 'Second example item', done: true },
  ])
  .onConflictDoNothing();

await client.end();
process.stdout.write('Seeded items.\n');
