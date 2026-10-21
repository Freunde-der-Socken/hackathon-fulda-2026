import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eventRoutes } from './events';
import { health } from './health';

export const routes: FastifyPluginAsyncZod = async (app) => {
  await app.register(health);
  // Routes that need the database should only exist when it is configured:
  // if (app.hasDecorator('db')) await app.register(todoRoutes);
  if (app.hasDecorator('mqtt')) await app.register(eventRoutes);
};
