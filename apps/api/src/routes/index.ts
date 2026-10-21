import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { health } from './health';

export const routes: FastifyPluginAsyncZod = async (app) => {
  await app.register(health);
};
