import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { health } from './health';

export const routes: FastifyPluginAsyncZod = async (app) => {
  await app.register(health);
  // Routes that need the database or the broker should only exist when they are configured:
  // if (app.hasDecorator('db')) await app.register(todoRoutes);
  // if (app.hasDecorator('mqtt')) await app.register(eventRoutes);
};
