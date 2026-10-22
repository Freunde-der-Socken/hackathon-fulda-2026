---
name: add-table
description: Add a Drizzle database table and generate its SQL migration
---

# Add a database table

Follow the recipe "Add a database table + migration" in the root `README.md` and `apps/api/README.md`. Needs `DATABASE_URL` (`pnpm db:up`).

1. Add `apps/api/src/db/schema/<table>.ts` (`pgTable(...)`, camelCase columns) and export it from `src/db/schema/index.ts`, one line.
2. `pnpm --filter @repo/api db:generate --name <table>` (no `--` before `--name`). Commit the SQL file in `apps/api/drizzle/`. Never edit generated migrations by hand: change the schema and generate again.
3. `pnpm db:migrate` to apply it.
4. Contract schemas for the API stay hand-written in `packages/contracts`, not derived from the table.
5. Routes that use `app.db` are registered under `if (app.hasDecorator('db'))`.
6. Run the `verify` skill.
