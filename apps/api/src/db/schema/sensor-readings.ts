import { doublePrecision, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const sensorReadings = pgTable(
  'sensor_readings',
  {
    id: uuid().primaryKey().defaultRandom(),
    sensorId: text().notNull(),
    value: doublePrecision().notNull(),
    unit: text(),
    recordedAt: timestamp({ withTimezone: true }).notNull(),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.sensorId, t.recordedAt)],
);
