import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import fp from 'fastify-plugin';
import postgres from 'postgres';
import * as schema from '../db/schema';
import { env } from '../env';

declare module 'fastify' {
  interface FastifyInstance {
    /** Only decorated when DATABASE_URL is set. Check with `app.hasDecorator('db')`. */
    db: PostgresJsDatabase<typeof schema>;
  }
}

export const dbPlugin = fp(
  async (app) => {
    if (!env.DATABASE_URL) {
      app.log.warn('DATABASE_URL not set, skipping db plugin');
      return;
    }
    // postgres.js connects lazily, so a database that is down doesn't block startup
    const client = postgres(env.DATABASE_URL, { max: 10 });
    app.decorate('db', drizzle(client, { schema, casing: 'snake_case' }));
    app.addHook('onClose', () => client.end());
  },
  { name: 'db' },
);
