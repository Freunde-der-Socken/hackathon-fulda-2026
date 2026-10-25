import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// A school class. Its readings and water are keyed by its id. Which plant it has lives in
// plant_classes.
export const classes = pgTable('classes', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
