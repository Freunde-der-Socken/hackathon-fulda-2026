import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import fp from 'fastify-plugin';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import * as schema from '../db/schema';
import { seed } from '../db/seed-data';
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
    const db = drizzle(client, { schema, casing: 'snake_case' });
    app.decorate('db', db);
    if (env.NODE_ENV === 'production') {
      // Runs from the build (dist/server.js), where apps/api/drizzle sits next to dist/. In
      // development use `pnpm db:migrate`. Single API instance, so there is no migration race.
      await migrate(db, {
        migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
      });
      app.log.info('Database migrations applied');
      // So the demo plant exists on the Pi too. The seed is idempotent, so every start is fine.
      await seed(db);
      app.log.info('Database seeded');
    }
    app.addHook('onClose', () => client.end());
  },
  { name: 'db' },
);
