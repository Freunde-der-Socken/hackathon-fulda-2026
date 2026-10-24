# Repository guide

pnpm + Turborepo monorepo: `apps/web` (Vue 3, Vite, Tailwind v4, shadcn-vue), `apps/api` (Fastify 5, Zod type provider, optional Drizzle/Postgres), `apps/rnd` (TensorFlow.js R&D workspace), `packages/contracts` (Zod schemas shared by both), `packages/ml` (model save/load helpers), `packages/oxc-config`, `packages/typescript-config`. The README has the commands, ports, env vars and recipes. App details are in `apps/*/README.md` and `packages/contracts/README.md`.

## Rules

- Node 24, pnpm 11.25.0, TypeScript 6.x (not 7, `vue-tsc` doesn't support it). `baseUrl` fails the build on TS 6: use `paths` only, and list `@types/*` in `types`.
- Shared dependency versions (`zod`, `typescript`, `@types/node`) live in the catalog of `pnpm-workspace.yaml`: use `"catalog:"`.
- Format with oxfmt (`pnpm fmt`), lint with oxlint. Before finishing run `pnpm fmt:check && pnpm lint && pnpm typecheck && pnpm build`, which is what CI runs. Only errors fail, warnings are allowed but keep them at zero.
- No ESLint, Prettier or `tailwind.config.js`. Tailwind is CSS-first (`apps/web/src/style.css`).

## Where things go

- **Schemas and types used by both sides**: `packages/contracts/src/<domain>.ts`, exported from `index.ts`. Zod only, hand-written (not derived from DB tables), dates as ISO strings. Hardware talks to the API over REST too, so device payloads are ordinary contract schemas.
- **API**: routes in `apps/api/src/routes` as `FastifyPluginAsyncZod` using contract schemas for `querystring`, `params`, `body` and `response`. Registered in `routes/index.ts` under `/api`. Plugins in `plugins/`. Database schema in `src/db/schema`, migrations in `apps/api/drizzle` (generate with `db:generate`, never edit by hand). Errors are `ErrorResponse`. No `console.*`: use `app.log` / `request.log`.
- **R&D / ML**: TensorFlow.js with the WASM backend (CPU fallback), never `@tensorflow/tfjs-node` (no Node 24 or arm64 support). Model I/O helpers go in `packages/ml`, experiments in `apps/rnd`. Keep the `@tensorflow/*` versions identical via the catalog. Details in `apps/rnd/README.md`.
- **Optional services**: `app.db` exists only when `DATABASE_URL` is set. Guard with `app.hasDecorator('db')`.
- **Web**: views in `src/views`, routes in `src/router`, navigation entries in `src/lib/navigation.ts`, API calls through `src/lib/api.ts` (`apiGet`, `apiPost`, ... validate with the contract schema). shadcn-vue components in `src/components/ui` (see the README for the `cn` import fix after `add`). Mobile first: the layout uses bottom tabs below `md` and a sidebar above.
- **Contract-first flow**: `@repo/contracts` schema, then the API route, then the typed call in the web app. Recurring tasks have project skills in `.claude/skills/` (`add-endpoint`, `add-table`, `add-view`, `add-ui-component`, `verify`), which link to the README recipes.
- Git: branches `<type>/<issue>-<name>`, small PRs with `Closes #<issue>`.

## Don'ts

- No `console.*` in the API, no hand-edited migrations, no secrets or `.env` contents in code, commits or prompts.
- Don't import from `apps/*` into `packages/*`.
- Don't call a task done before `verify` (the CI gate) passes, and keep PRs small.
