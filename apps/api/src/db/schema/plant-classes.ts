import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

// Maps the plant a device reports for to the school class it belongs to. One plant per class
// and one class per plant, so both columns are unique.
export const plantClasses = pgTable('plant_classes', {
  plantId: uuid().primaryKey(),
  classId: uuid().notNull().unique(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
