# hackathon-fulda-2026

[![CI](https://github.com/Holytrashbag/hackathon-fulda-2026/actions/workflows/ci.yml/badge.svg)](https://github.com/Holytrashbag/hackathon-fulda-2026/actions/workflows/ci.yml)

A TypeScript monorepo (pnpm workspaces + Turborepo) for a Vue 3 web app and a Fastify API that share Zod schemas. The web app uses Vite, Vue Router, Pinia, Tailwind v4 and shadcn-vue. The API uses Fastify 5 with optional Postgres (Drizzle) and MQTT (Mosquitto). Lint and format run with oxlint and oxfmt.

## What's in here

```
apps/
  web/                    Vue 3 + Vite + Tailwind + shadcn-vue       README: apps/web/README.md
  api/                    Fastify API, Drizzle (Postgres), MQTT      README: apps/api/README.md
packages/
  contracts/              Zod schemas shared by web and API          README: packages/contracts/README.md
  oxc-config/             oxlint presets and the oxfmt config        README: packages/oxc-config/README.md
  typescript-config/      tsconfig presets (base, node, vue)         README: packages/typescript-config/README.md
compose.yaml              Postgres and Mosquitto for local development
.devcontainer/            VS Code devcontainer (Node, pnpm, Docker CLI, extensions)
```

## Getting started

### Devcontainer (recommended)

Prerequisites: Docker Desktop or Docker Engine, and VS Code with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension.

1. Clone the repo. On Windows, clone it inside WSL (`~/…`), not under `/mnt/c`: bind mounts from the Windows filesystem are very slow.
2. Open the folder in VS Code and run **Dev Containers: Reopen in Container**. The first build installs the dependencies on its own.
3. In the container terminal, run `pnpm dev`.
4. Open <http://localhost:5173/api/health>. You should see `{"status":"ok", …, "db":"ok","mqtt":"ok"}`. VS Code forwards the ports to your browser.

Postgres and Mosquitto start with the container. Inside it they are reached by service name (`DATABASE_URL` and `MQTT_URL` are preset), and `docker compose ps` works from the container terminal.

### Local

Prerequisites: Node 24, pnpm 11 (`npm i -g pnpm@11.25.0`) and Docker.

```sh
pnpm install
cp apps/api/.env.example apps/api/.env   # without it the API runs with the database and MQTT disabled
pnpm infra:up                            # Postgres + Mosquitto
pnpm dev
```

Then open <http://localhost:5173/api/health>.

## Everyday commands

Run them from the repo root.

| Command                                         | What it does                                                |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                                      | Web and API in watch mode (through Turbo)                   |
| `pnpm --filter @repo/web dev:host`              | Web dev server reachable from other devices on your network |
| `pnpm build`                                    | Typecheck and build everything                              |
| `pnpm lint` / `pnpm typecheck`                  | oxlint / `tsc` and `vue-tsc` in every package               |
| `pnpm fmt` / `pnpm fmt:check`                   | Format with oxfmt / check formatting (CI runs the check)    |
| `pnpm infra:up` / `infra:down`                  | Start / stop Postgres and Mosquitto                         |
| `pnpm infra:reset`                              | Stop them **and delete their data** (volumes)               |
| `pnpm infra:logs`                               | Follow the logs of both services                            |
| `pnpm db:up` / `pnpm mqtt:up`                   | Start only Postgres / only Mosquitto                        |
| `pnpm db:migrate`                               | Apply the SQL migrations in `apps/api/drizzle/`             |
| `pnpm --filter @repo/api db:generate`           | Create a migration from schema changes                      |
| `pnpm --filter @repo/api db:push` / `db:studio` | Sync the schema without a migration / open Drizzle Studio   |
| `pnpm --filter @repo/api db:seed`               | Run `apps/api/src/db/seed.ts`                               |

## Ports & URLs

| What                | URL / port                         | Change it with (file)                                |
| ------------------- | ---------------------------------- | ---------------------------------------------------- |
| Web                 | <http://localhost:5173>            | `WEB_PORT` (`apps/web/.env`)                         |
| API                 | <http://localhost:3000/api>        | `API_PORT` (root `.env`, also used by the web proxy) |
| Health check        | <http://localhost:5173/api/health> |                                                      |
| API docs (dev only) | <http://localhost:3000/api/docs/>  |                                                      |
| Postgres            | `localhost:5432`                   | `POSTGRES_PORT` (root `.env`)                        |
| MQTT                | `localhost:1883`                   | `MQTT_PORT` (root `.env`)                            |
| MQTT over WebSocket | `localhost:9001`                   | `MQTT_WS_PORT` (root `.env`)                         |

The web dev server proxies `/api` to the API, so the browser only talks to port 5173. Inside the devcontainer the services always use their default ports, and only the ports published on your machine change.

## Environment variables

Copy an `.env.example` to `.env` (git-ignored) to override its defaults.

| File                    | Keys                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.env.example`          | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`, `MQTT_PORT`, `MQTT_WS_PORT` (Compose), `API_PORT` (API and web proxy)      |
| `apps/api/.env.example` | `NODE_ENV`, `HOST`, `LOG_LEVEL`, `CORS_ORIGIN` (comma-separated), `DATABASE_URL` (unset disables the database), `MQTT_URL` (unset disables MQTT) |
| `apps/web/.env.example` | `VITE_API_URL` (empty uses the `/api` proxy), `WEB_PORT`                                                                                         |

The API validates its variables at startup and exits with a readable list if one is invalid. `DATABASE_URL` must match the `POSTGRES_*` values in the root `.env`. Variables already set in the environment (for example by the devcontainer) win over `.env`.

## Recipes

### Add an API endpoint

1. **Contract**: add `packages/contracts/src/<domain>.ts` with the Zod schemas and export it from `src/index.ts`:
   ```ts
   export const GreetingQuery = z.object({ name: z.string().min(1) });
   export const GreetingResponse = z.object({ message: z.string() });
   export type GreetingResponse = z.infer<typeof GreetingResponse>;
   ```
2. **Route**: add `apps/api/src/routes/<domain>.ts` and register it in `routes/index.ts` (`await app.register(greeting);`):
   ```ts
   export const greeting: FastifyPluginAsyncZod = async (app) => {
     app.get(
       '/greeting',
       { schema: { querystring: GreetingQuery, response: { 200: GreetingResponse } } },
       async (request) => ({ message: `Hello ${request.query.name}` }),
     );
   };
   ```
3. **Frontend**: call it with the same schema, `const greeting = await apiGet('/greeting?name=Fulda', GreetingResponse);` (inside `onMounted` or an event handler). The result is typed and validated, and `apiPost` / `apiPatch` validate the body before sending it.
4. Check it in the API docs (<http://localhost:3000/api/docs/>). A bad request returns a 400 with field-level `issues`.

### Add a shadcn-vue component

```sh
cd apps/web
pnpm dlx shadcn-vue@latest add badge
grep -rl 'from "cn"' src | xargs sed -i 's#from "cn"#from "@/lib/utils"#'   # see below
pnpm remove cn
cd ../.. && pnpm fmt
```

The CLI currently writes `from "cn"` (an unrelated npm package, which it also installs) instead of `@/lib/utils`, so the two lines after `add` fix that. Skip them if the CLI no longer does it. Icons come from `@lucide/vue`. More in [`apps/web/README.md`](apps/web/README.md).

### Add a database table + migration

Needs `DATABASE_URL` (see [Getting started](#getting-started)).

1. Add `apps/api/src/db/schema/<table>.ts` (`pgTable(...)`, camelCase columns) and export it from `src/db/schema/index.ts`.
2. `pnpm --filter @repo/api db:generate --name <table>` creates a SQL file in `apps/api/drizzle/`. Commit it. (Don't put `--` before `--name`.)
3. `pnpm db:migrate` applies it.
4. Use it in a route through `app.db`, which is fully typed: `await app.db.insert(notes).values(request.body).returning()`. Register routes that need it with `if (app.hasDecorator('db'))`.

Details in [`apps/api/README.md`](apps/api/README.md).

### Publish or subscribe to an MQTT topic

Needs `MQTT_URL`.

1. Add the topic to `topics` in `packages/contracts/src/mqtt/index.ts` (`<domain>/<id>/<event>`, lowercase, `+` for one wildcard level) with its payload schema.
2. Subscribe, for example in a plugin: `await app.mqtt.subscribe('sensorReading', ({ payload, params }) => app.log.info({ payload, params }, 'reading'));`. Invalid payloads are logged and dropped.
3. Publish: `await app.mqtt.publish('sensorReading', ['sensor-1'], { deviceId: 'sensor-1', value: 21.5, unit: '°C', ts: new Date().toISOString() });`. An invalid payload throws before it reaches the broker.
4. Guard it with `app.hasDecorator('mqtt')`, since the plugin is skipped without `MQTT_URL`.

### Test on your phone

1. Put the phone and the computer on the same Wi-Fi.
2. `pnpm --filter @repo/web dev:host`, and note the `Network:` address that Vite prints (the LAN IP of your computer).
3. Open `http://<that IP>:5173` on the phone. The `/api` proxy works the same way, so the API needs no change.
4. On WSL the address Vite prints is the WSL one. Forward the port from Windows (`netsh interface portproxy add v4tov4 listenport=5173 connectaddress=<WSL IP> connectport=5173`, as admin) and allow it in the Windows firewall.

## Conventions

- **Branches**: `<type>/<issue>-<short-name>`, with type `feat`, `fix`, `docs`, `chore` or `ci` (for example `feat/12-login-page`).
- **Pull requests**: small, with `Closes #<issue>` in the description. CI (`fmt:check`, `lint`, `typecheck`, `build`) must be green before you merge.
- **Where code goes**: Zod schemas and types used by both sides go in `packages/contracts`. Database schema stays in the API (`apps/api/src/db/schema`). UI components go in `apps/web/src/components` (shadcn-vue ones in `components/ui`). Don't import from `apps/*` into `packages/*`.
- **Dependencies**: add shared ones through the pnpm catalog (see [Toolchain](#toolchain)).
- **API logging**: use `app.log` / `request.log`, not `console.*` (lint fails on it).
- AI assistants: see [`CLAUDE.md`](CLAUDE.md) (also available as `AGENTS.md`).

## Toolchain

- **Node 24** ([`.nvmrc`](.nvmrc)). `pnpm install` fails on older versions because `engineStrict: true` is set in [`pnpm-workspace.yaml`](pnpm-workspace.yaml).
- **pnpm 11.25.0**: `npm i -g pnpm@11.25.0`. Corepack is no longer bundled with newer Node versions.

### Shared dependency versions (pnpm catalog)

`zod`, `typescript` and `@types/node` are pinned once in the `catalog` of [`pnpm-workspace.yaml`](pnpm-workspace.yaml). Packages reference them as `"zod": "catalog:"` instead of a version range.

When a second package starts using a dependency, move it into the catalog:

1. Add `<name>: <range>` under `catalog:` in `pnpm-workspace.yaml`.
2. Replace the version in every `package.json` that uses it with `"catalog:"`.
3. Run `pnpm install`.

### TypeScript 6.x, not 7

`vue-tsc` 3.x crashes on TypeScript 7 (`ERR_PACKAGE_PATH_NOT_EXPORTED` for `typescript/lib/tsc`, which the native TS 7 package no longer ships). Revisit once Vue's tooling (Volar / `vue-tsc`) supports TS 7.

TS 6 gotchas:

- `baseUrl` is deprecated and fails the build. Use `paths` only.
- `@types/*` packages are no longer picked up automatically. List them in `types`.

### tsconfig presets

Extend `@repo/typescript-config/base.json` (contracts), `node.json` (API) or `vue.json` (web). See [`packages/typescript-config/README.md`](packages/typescript-config/README.md) for the reasoning behind `module: "Preserve"`, `noEmit` and `types: []`.

### Turbo tasks

- Root scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck` run through Turbo. `pnpm fmt` / `pnpm fmt:check` run oxfmt on the whole repo.
- `transit` is an empty task that only depends on `^transit`. `lint` and `typecheck` depend on it, so their caches are invalidated when a dependency's source changes, without building that dependency first.
- Env vars that affect a build must be listed under `build.env` in [`turbo.json`](turbo.json) (`VITE_*` already is), or Turbo serves stale cache hits.

## Troubleshooting

- **Port already in use**: find the process with `lsof -i :<port>`, or pick another port, see [Ports & URLs](#ports--urls). Postgres on 5432 is the usual one: set `POSTGRES_PORT` in the root `.env` and the same port in `DATABASE_URL`.
- **The API says `db: "disabled"` or `mqtt: "disabled"`**: `DATABASE_URL` / `MQTT_URL` is not set. Copy `apps/api/.env.example` to `apps/api/.env`. The devcontainer sets them for you.
- **Everything is slow on Windows**: the repo is under `/mnt/c`. Clone it into the WSL filesystem (`~/…`) instead.
- **`pnpm install` fails on the Node version or on build scripts**: use Node 24, and see `allowBuilds` in `pnpm-workspace.yaml` for dependencies allowed to run install scripts.
- **Reset the database or the broker**: `pnpm infra:reset` deletes both volumes, then `pnpm infra:up` and `pnpm db:migrate`.
- **Postgres won't start after switching versions**: Postgres 18 keeps its data in a versioned folder, so `compose.yaml` mounts the volume at `/var/lib/postgresql`, not `/var/lib/postgresql/data`. A volume created by another major version has to be reset with `pnpm infra:reset`.
- **A build, lint or typecheck result looks stale**: Turbo cached it. Run `pnpm turbo run <task> --force`. Env vars that affect a build must be listed in `turbo.json` (see [Toolchain](#toolchain)).
- **Opening the devcontainer replaced my `node_modules`**: host and container share the folder, and native binaries differ between systems. Run `pnpm install` again after switching.
