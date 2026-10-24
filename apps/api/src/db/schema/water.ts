import { sql } from 'drizzle-orm';
import {
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Every bit of water a class earns, from a teacher button or a silent phase. Days and weeks are
// time windows over createdAt, so growth can reset per phase without another table.
export const waterEvents = pgTable(
  'water_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    classId: uuid().notNull(),
    amount: integer().notNull(),
    // WaterSource from @repo/contracts
    source: text().notNull(),
    silentPhaseId: uuid(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.classId, t.createdAt)],
);

export const silentPhases = pgTable(
  'silent_phases',
  {
    id: uuid().primaryKey().defaultRandom(),
    classId: uuid().notNull(),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp({ withTimezone: true }),
    quietShare: doublePrecision(),
    water: integer(),
  },
  // At most one running phase per class
  (t) => [
    uniqueIndex()
      .on(t.classId)
      .where(sql`${t.endedAt} is null`),
  ],
);
