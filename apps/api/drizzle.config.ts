import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;
if (!url) {
  // Only the db:* scripts load this file, and they all need a database
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env, or start Postgres first.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url },
});
