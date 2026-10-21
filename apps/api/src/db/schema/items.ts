// Example table: the pattern to copy for real features. Delete it with routes/items.ts and the
// seed once the first real table exists.
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const items = pgTable('items', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  done: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type ItemRow = typeof items.$inferSelect;
