import { HealthResponse } from '@repo/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const health: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', { schema: { response: { 200: HealthResponse } } }, async () => ({
    status: 'ok' as const,
    version: process.env.npm_package_version ?? 'dev',
  }));
};
