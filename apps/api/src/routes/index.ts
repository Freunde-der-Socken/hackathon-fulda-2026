import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eventRoutes } from './events';
import { health } from './health';

// One import and one `await app.register(...)` per line. Keep the imports and the registrations
// apart (this comment does that): git's union merge (see .gitattributes) then keeps both sides
// when two branches add a route. Routes that need the database or the broker should only exist
// when they are configured:
// if (app.hasDecorator('db')) await app.register(todoRoutes);
// if (app.hasDecorator('mqtt')) await app.register(eventRoutes);
export const routes: FastifyPluginAsyncZod = async (app) => {
  await app.register(health);
  // Routes that need the database or the broker should only exist when they are configured:
  // if (app.hasDecorator('db')) await app.register(todoRoutes);
  if (app.hasDecorator('mqtt')) await app.register(eventRoutes);
};
