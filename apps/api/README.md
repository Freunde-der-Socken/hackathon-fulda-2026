# @repo/api

Fastify 5 + Zod type provider. Routes live under `/api`, docs at `/api/docs` in development.

## Database (Drizzle + Postgres)

The database is optional: without `DATABASE_URL` the API starts, logs a warning, reports `db: "disabled"` on `GET /api/health`, and skips the routes that need it (`routes/items.ts`).

```sh
pnpm db:up        # Postgres from compose.yaml
pnpm db:migrate   # apply the SQL files in apps/api/drizzle/
pnpm --filter @repo/api db:seed   # optional, idempotent
pnpm dev
```

`DATABASE_URL` comes from `apps/api/.env` (see `.env.example`). Inside the devcontainer it is preset.

### Add a table

1. Create or edit a file in `src/db/schema/` and export it from `src/db/schema/index.ts`. Columns are written in camelCase and stored in snake_case.
2. `pnpm --filter @repo/api db:generate` creates a SQL migration in `drizzle/`. Commit it.
3. `pnpm db:migrate` applies it.
4. Write the Zod schemas for the route in `@repo/contracts`. They are hand-written on purpose, so the API shape isn't tied to the table layout. `routes/items.ts` is the pattern to copy.

For quick experiments `pnpm --filter @repo/api db:push` syncs the schema without a migration file. Don't use it for anything you want to keep, and run `db:generate` before you commit. `db:studio` opens Drizzle Studio.

`items` (schema, route, seed and the example in `@repo/contracts`) is a demo. Delete it once the first real table exists.
