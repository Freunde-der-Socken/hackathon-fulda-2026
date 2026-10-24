import { DEMO_CLASS_ID, DEMO_PLANT_ID } from '@repo/contracts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

// Runs from `pnpm db:seed` and on every production start (after the migrations), so keep it
// idempotent: use fixed ids plus `.onConflictDoNothing()`, e.g.
//   await db.insert(schema.todos).values({ id: '…', title: 'First' }).onConflictDoNothing();
export async function seed(db: PostgresJsDatabase<typeof schema>) {
  // Demo plant → class mapping, so a device can POST readings with DEMO_PLANT_ID
  await db
    .insert(schema.plantClasses)
    .values({ plantId: DEMO_PLANT_ID, classId: DEMO_CLASS_ID })
    .onConflictDoNothing();
  // Names for the demo pair, so the classes page shows them. Renames in the app are kept.
  await db
    .insert(schema.classes)
    .values({ id: DEMO_CLASS_ID, name: 'Demo class' })
    .onConflictDoNothing();
  await db
    .insert(schema.plants)
    .values({ id: DEMO_PLANT_ID, name: 'Demo plant' })
    .onConflictDoNothing();
}
