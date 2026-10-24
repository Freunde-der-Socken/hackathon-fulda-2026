import {
  ErrorResponse,
  type SensorReading,
  SensorReading as SensorReadingSchema,
  SensorReadingInput,
  SensorReadingList,
  SensorReadingQuery,
} from '@repo/contracts';
import { and, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { plantClasses, sensorReadings } from '../db/schema';

// Newest readings returned by GET, so a long-running sensor doesn't produce a huge response
const MAX_READINGS = 1000;

function toContract(row: typeof sensorReadings.$inferSelect): SensorReading {
  return {
    sensorId: row.sensorId,
    plantId: row.plantId,
    classId: row.classId,
    value: row.value,
    unit: row.unit ?? undefined,
    recordedAt: row.recordedAt.toISOString(),
    receivedAt: row.receivedAt.toISOString(),
  };
}

export const sensorData: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/sensor-data',
    {
      schema: {
        body: SensorReadingInput,
        response: { 201: SensorReadingSchema, 422: ErrorResponse },
      },
    },
    async (request, reply) => {
      const { recordedAt, ...reading } = request.body;
      const [mapping] = await app.db
        .select({ classId: plantClasses.classId })
        .from(plantClasses)
        .where(eq(plantClasses.plantId, reading.plantId));
      if (!mapping) throw app.httpErrors.unprocessableEntity(`Unknown plantId ${reading.plantId}`);

      const receivedAt = new Date();
      const [row] = await app.db
        .insert(sensorReadings)
        .values({
          ...reading,
          classId: mapping.classId,
          recordedAt: recordedAt ? new Date(recordedAt) : receivedAt,
          receivedAt,
        })
        .returning();
      if (!row) throw new Error('Insert into sensor_readings returned no row');
      request.log.debug({ sensorId: row.sensorId, classId: row.classId }, 'Sensor reading stored');
      return reply.code(201).send(toContract(row));
    },
  );

  app.get(
    '/sensor-data',
    { schema: { querystring: SensorReadingQuery, response: { 200: SensorReadingList } } },
    async (request) => {
      const { sensorId, plantId, classId } = request.query;
      const rows = await app.db
        .select()
        .from(sensorReadings)
        .where(
          and(
            sensorId ? eq(sensorReadings.sensorId, sensorId) : undefined,
            plantId ? eq(sensorReadings.plantId, plantId) : undefined,
            classId ? eq(sensorReadings.classId, classId) : undefined,
          ),
        )
        .orderBy(desc(sensorReadings.recordedAt))
        .limit(MAX_READINGS);
      return { items: rows.map(toContract) };
    },
  );
};
