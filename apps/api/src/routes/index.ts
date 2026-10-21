import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { health } from './health';
import { itemRoutes } from './items';

export const routes: FastifyPluginAsyncZod = async (app) => {
  await app.register(health);
  // Routes that need the database exist only when DATABASE_URL is set
  if (app.hasDecorator('db')) await app.register(itemRoutes);
};
