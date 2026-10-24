import { z } from 'zod';
import { Timestamp } from './common';

/** Body a device POSTs to `/api/sensor-data`. */
export const SensorReadingInput = z.object({
  sensorId: z.string().min(1),
  value: z.number(),
  unit: z.string().optional(),
  /** When the device measured the value. Defaults to the time the API received it. */
  recordedAt: Timestamp.optional(),
});
export type SensorReadingInput = z.infer<typeof SensorReadingInput>;

export const SensorReading = SensorReadingInput.extend({
  recordedAt: Timestamp,
  receivedAt: Timestamp,
});
export type SensorReading = z.infer<typeof SensorReading>;

export const SensorReadingQuery = z.object({
  sensorId: z.string().min(1).optional(),
});
export type SensorReadingQuery = z.infer<typeof SensorReadingQuery>;

export const SensorReadingList = z.object({ items: z.array(SensorReading) });
export type SensorReadingList = z.infer<typeof SensorReadingList>;
