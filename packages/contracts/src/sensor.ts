import { z } from 'zod';
import { Id, Timestamp } from './common';

/** Body a device POSTs to `/api/sensor-data`. */
export const SensorReadingInput = z.object({
  sensorId: z.string().min(1),
  /** Must exist in the plant → class mapping, otherwise the API answers 422. */
  plantId: Id,
  value: z.number(),
  unit: z.string().optional(),
  /** When the device measured the value. Defaults to the time the API received it. */
  recordedAt: Timestamp.optional(),
});
export type SensorReadingInput = z.infer<typeof SensorReadingInput>;

export const SensorReading = SensorReadingInput.extend({
  /** School class the plant belonged to when the reading was stored. */
  classId: Id,
  recordedAt: Timestamp,
  receivedAt: Timestamp,
});
export type SensorReading = z.infer<typeof SensorReading>;

export const SensorReadingQuery = z.object({
  sensorId: z.string().min(1).optional(),
  plantId: Id.optional(),
  classId: Id.optional(),
});
export type SensorReadingQuery = z.infer<typeof SensorReadingQuery>;

export const SensorReadingList = z.object({ items: z.array(SensorReading) });
export type SensorReadingList = z.infer<typeof SensorReadingList>;
