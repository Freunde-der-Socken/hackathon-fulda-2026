import { doublePrecision, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const sensorReadings = pgTable(
  'sensor_readings',
  {
    id: uuid().primaryKey().defaultRandom(),
    sensorId: text().notNull(),
    plantId: uuid().notNull(),
    // Copied from plant_classes when the reading is stored, so old readings keep their class
    // when a class gets a new plant. No foreign key for the same reason.
    classId: uuid().notNull(),
    value: doublePrecision().notNull(),
    unit: text(),
    recordedAt: timestamp({ withTimezone: true }).notNull(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.sensorId, t.recordedAt), index().on(t.classId, t.recordedAt)],
);
