import {
  type SensorReading,
  SensorReading as SensorReadingSchema,
  SensorReadingInput,
  SensorReadingList,
  SensorReadingQuery,
} from '@repo/contracts';
import { desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { sensorReadings } from '../db/schema';

// Newest readings returned by GET, so a long-running sensor doesn't produce a huge response
const MAX_READINGS = 1000;

function toContract(row: typeof sensorReadings.$inferSelect): SensorReading {
  return {
    sensorId: row.sensorId,
    value: row.value,
    unit: row.unit ?? undefined,
    recordedAt: row.recordedAt.toISOString(),
    receivedAt: row.receivedAt.toISOString(),
  };
}

export const sensorData: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/sensor-data',
    { schema: { body: SensorReadingInput, response: { 201: SensorReadingSchema } } },
    async (request, reply) => {
      const { recordedAt, ...reading } = request.body;
      const receivedAt = new Date();
      const [row] = await app.db
        .insert(sensorReadings)
        .values({
          ...reading,
          recordedAt: recordedAt ? new Date(recordedAt) : receivedAt,
          receivedAt,
        })
        .returning();
      if (!row) throw new Error('Insert into sensor_readings returned no row');
      request.log.debug({ sensorId: row.sensorId }, 'Sensor reading stored');
      return reply.code(201).send(toContract(row));
    },
  );

  app.get(
    '/sensor-data',
    { schema: { querystring: SensorReadingQuery, response: { 200: SensorReadingList } } },
    async (request) => {
      const { sensorId } = request.query;
      const rows = await app.db
        .select()
        .from(sensorReadings)
        .where(sensorId ? eq(sensorReadings.sensorId, sensorId) : undefined)
        .orderBy(desc(sensorReadings.recordedAt))
        .limit(MAX_READINGS);
      return { items: rows.map(toContract) };
    },
  );
};
