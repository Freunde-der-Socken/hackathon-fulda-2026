# Repository guide

pnpm + Turborepo monorepo: `apps/web` (Vue 3, Vite, Tailwind v4, shadcn-vue), `apps/api` (Fastify 5, Zod type provider, optional Drizzle/Postgres and MQTT), `packages/contracts` (Zod schemas shared by both), `packages/oxc-config`, `packages/typescript-config`. The README has the commands, ports, env vars and recipes. App details are in `apps/*/README.md` and `packages/contracts/README.md`.

## Rules

- Node 24, pnpm 11.25.0, TypeScript 6.x (not 7, `vue-tsc` doesn't support it). `baseUrl` fails the build on TS 6: use `paths` only, and list `@types/*` in `types`.
- Shared dependency versions (`zod`, `typescript`, `@types/node`) live in the catalog of `pnpm-workspace.yaml`: use `"catalog:"`.
- Format with oxfmt (`pnpm fmt`), lint with oxlint. Before finishing run `pnpm fmt:check && pnpm lint && pnpm typecheck && pnpm build`, which is what CI runs. Only errors fail, warnings are allowed but keep them at zero.
- No ESLint, Prettier or `tailwind.config.js`. Tailwind is CSS-first (`apps/web/src/style.css`).

## Where things go

- **Schemas and types used by both sides**: `packages/contracts/src/<domain>.ts`, exported from `index.ts`. Zod only, hand-written (not derived from DB tables), dates as ISO strings. MQTT topics and payloads are only defined in `contracts/src/mqtt/`.
- **API**: routes in `apps/api/src/routes` as `FastifyPluginAsyncZod` using contract schemas for `querystring`, `params`, `body` and `response`. Registered in `routes/index.ts` under `/api`. Plugins in `plugins/`. Database schema in `src/db/schema`, migrations in `apps/api/drizzle` (generate with `db:generate`, never edit by hand). Errors are `ErrorResponse`. No `console.*`: use `app.log` / `request.log`.
- **Optional services**: `app.db` and `app.mqtt` exist only when `DATABASE_URL` / `MQTT_URL` are set. Guard with `app.hasDecorator('db')` / `('mqtt')`.
- **Web**: views in `src/views`, routes in `src/router`, navigation entries in `src/lib/navigation.ts`, API calls through `src/lib/api.ts` (`apiGet`, `apiPost`, ... validate with the contract schema). shadcn-vue components in `src/components/ui` (see the README for the `cn` import fix after `add`). Mobile first: the layout uses bottom tabs below `md` and a sidebar above.
- Git: branches `<type>/<issue>-<name>`, small PRs with `Closes #<issue>`.
