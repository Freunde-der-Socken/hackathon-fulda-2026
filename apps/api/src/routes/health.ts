import { HealthResponse } from '@repo/contracts';
import { sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const health: FastifyPluginAsyncZod = async (app) => {
  app.get('/health', { schema: { response: { 200: HealthResponse } } }, async (request) => {
    let db: HealthResponse['db'] = 'disabled';
    if (app.hasDecorator('db')) {
      try {
        await app.db.execute(sql`select 1`);
        db = 'ok';
      } catch (err) {
        request.log.warn({ err }, 'Database health check failed');
        db = 'down';
      }
    }
    return {
      status: 'ok' as const,
      version: process.env.npm_package_version ?? 'dev',
      db,
    };
  });
};
