import {
  type SensorReading,
  SensorReading as SensorReadingSchema,
  SensorReadingInput,
  SensorReadingList,
  SensorReadingQuery,
} from '@repo/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

// In memory until there is a table for it: lost on restart, capped so a chatty device can't fill the RAM.
const MAX_READINGS = 1000;

export const sensorData: FastifyPluginAsyncZod = async (app) => {
  const readings: SensorReading[] = [];

  app.post(
    '/sensor-data',
    { schema: { body: SensorReadingInput, response: { 201: SensorReadingSchema } } },
    async (request, reply) => {
      const receivedAt = new Date().toISOString();
      const reading = { ...request.body, recordedAt: request.body.recordedAt ?? receivedAt, receivedAt };
      readings.push(reading);
      if (readings.length > MAX_READINGS) readings.shift();
      request.log.debug({ sensorId: reading.sensorId }, 'Sensor reading received');
      return reply.code(201).send(reading);
    },
  );

  app.get(
    '/sensor-data',
    { schema: { querystring: SensorReadingQuery, response: { 200: SensorReadingList } } },
    async (request) => {
      const { sensorId } = request.query;
      return { items: sensorId ? readings.filter((r) => r.sensorId === sensorId) : readings };
    },
  );
};
