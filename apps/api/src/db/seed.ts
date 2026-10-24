import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env';
import * as schema from './schema';
import { seed } from './seed-data';

if (!env.DATABASE_URL) {
  process.stderr.write('DATABASE_URL is not set, nothing to seed.\n');
  process.exit(1);
}

const client = postgres(env.DATABASE_URL, { max: 1 });
export const db = drizzle(client, { schema, casing: 'snake_case' });

await seed(db);

await client.end();
process.stdout.write('Seeded the demo class, plant and their mapping.\n');
