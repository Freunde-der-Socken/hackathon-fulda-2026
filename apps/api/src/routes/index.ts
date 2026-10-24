import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { classroom } from './classroom';
import { sensorData } from './get_sensor_data';
import { health } from './health';
import { water } from './water';

// One import and one `await app.register(...)` per line. Keep the imports and the registrations
// apart (this comment does that): git's union merge (see .gitattributes) then keeps both sides
// when two branches add a route. Routes that need the database should only exist when it is
// configured:
// if (app.hasDecorator('db')) await app.register(todoRoutes);
export const routes: FastifyPluginAsyncZod = async (app) => {
  await app.register(health);
  if (app.hasDecorator('db')) await app.register(sensorData);
  if (app.hasDecorator('db')) await app.register(classroom);
  if (app.hasDecorator('db')) await app.register(water);
};
