import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// A physical plant (ESP32). Its id is the plantId devices send with every reading. Which class it
// belongs to lives in plant_classes.
export const plants = pgTable('plants', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
