# hackathon-fulda-2026

[![CI](https://github.com/Holytrashbag/hackathon-fulda-2026/actions/workflows/ci.yml/badge.svg)](https://github.com/Holytrashbag/hackathon-fulda-2026/actions/workflows/ci.yml)

A TypeScript monorepo (pnpm workspaces + Turborepo) for a Vue 3 web app and a Fastify API that share Zod schemas. The web app uses Vite, Vue Router, Pinia, Tailwind v4 and shadcn-vue. The API uses Fastify 5 with optional Postgres (Drizzle) and MQTT (Mosquitto). Lint and format run with oxlint and oxfmt.

## What's in here

```
apps/
  web/                    Vue 3 + Vite + Tailwind + shadcn-vue       README: apps/web/README.md
  api/                    Fastify API, Drizzle (Postgres), MQTT      README: apps/api/README.md
  rnd/                    TensorFlow.js R&D workspace (smoke test)   README: apps/rnd/README.md
packages/
  contracts/              Zod schemas shared by web and API          README: packages/contracts/README.md
  ml/                     Model save/load helpers (TensorFlow.js)   README: packages/ml/README.md
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

Then open <http://localhost:5173/api/health>. The commands also work in PowerShell (`cp` is an alias for `Copy-Item`).

- **Windows (native)**: install Node 24, pnpm and Docker Desktop (WSL 2 backend). Use PowerShell or Windows Terminal. Keep Git's default `core.autocrlf`: the repo's `.gitattributes` checks files out with LF, which `pnpm fmt:check` expects. Re-clone if you cloned before that file existed. WSL or the devcontainer is still the smoother path.
- **macOS**: install Node 24 (for example with `nvm` or `fnm`, they read `.nvmrc`), pnpm and Docker Desktop, the documented default and the same as for the devcontainer. OrbStack or similar works too if you already use it.

## Everyday commands

Run them from the repo root.

| Command                                         | What it does                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                                      | Web and API in watch mode (through Turbo)                            |
| `pnpm --filter @repo/web dev:host`              | Web dev server reachable from other devices on your network          |
| `pnpm build`                                    | Typecheck and build everything                                       |
| `pnpm lint` / `pnpm typecheck`                  | oxlint / `tsc` and `vue-tsc` in every package                        |
| `pnpm test`                                     | Run the Vitest tests of every package once (not part of CI)          |
| `pnpm fmt` / `pnpm fmt:check`                   | Format with oxfmt / check formatting (CI runs the check)             |
| `pnpm infra:up` / `infra:down`                  | Start / stop Postgres and Mosquitto                                  |
| `pnpm infra:reset`                              | Stop them **and delete their data** (volumes)                        |
| `pnpm infra:logs`                               | Follow the logs of both services                                     |
| `pnpm mqtt:sub`                                 | Print every MQTT message (see [Connect a device](#connect-a-device)) |
| `pnpm db:up` / `pnpm mqtt:up`                   | Start only Postgres / only Mosquitto                                 |
| `pnpm db:migrate`                               | Apply the SQL migrations in `apps/api/drizzle/`                      |
| `pnpm --filter @repo/api db:generate`           | Create a migration from schema changes                               |
| `pnpm --filter @repo/api db:push` / `db:studio` | Sync the schema without a migration / open Drizzle Studio            |
| `pnpm --filter @repo/api db:seed`               | Run `apps/api/src/db/seed.ts`                                        |

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
pnpm shadcn:fix   # see below
pnpm remove cn
cd ../.. && pnpm fmt
```

The CLI currently writes `from "cn"` (an unrelated npm package, which it also installs) instead of `@/lib/utils`, so `pnpm shadcn:fix` (a Node script, works in any shell) and `pnpm remove cn` fix that. Skip them if the CLI no longer does it. Icons come from `@lucide/vue`. More in [`apps/web/README.md`](apps/web/README.md).

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
2. Subscribe, for example in a plugin: `await app.mqtt.subscribe('reading', ({ payload, params }) => app.log.info({ payload, params }, 'reading'));`. Invalid payloads are logged and dropped.
3. Publish: `await app.mqtt.publish('reading', ['sensor-1'], { deviceId: 'sensor-1', value: 21.5, unit: '°C', ts: new Date().toISOString() });`. An invalid payload throws before it reaches the broker.
4. Guard it with `app.hasDecorator('mqtt')`, since the plugin is skipped without `MQTT_URL`.

### Show live MQTT data in a view

Needs `MQTT_URL` and a topic from the recipe above. The API streams every valid message to the browser at `GET /api/events`.

1. In the view: `const { latest, messages, connected } = useLiveTopic('reading');` (from `@/composables/useLiveTopic`). Payloads are validated with the contract schema, invalid ones are dropped and counted in `dropped`.
2. Render `latest` or `messages` (newest first, 50 by default, `{ max }` to change). `connected` is false while the stream reconnects.
3. Try it: `mosquitto_pub -h localhost -t sensors/s1/reading -m '{"deviceId":"s1","value":21.5,"unit":"°C","ts":"2026-01-01T00:00:00.000Z"}'`.

### Test on your phone

1. Put the phone and the computer on the same Wi-Fi.
2. `pnpm --filter @repo/web dev:host`, and note the `Network:` address that Vite prints (the LAN IP of your computer).
3. Open `http://<that IP>:5173` on the phone. The `/api` proxy works the same way, so the API needs no change.
4. On WSL the address Vite prints is the WSL one. Forward the port from Windows (`netsh interface portproxy add v4tov4 listenport=5173 connectaddress=<WSL IP> connectport=5173`, as admin) and allow it in the Windows firewall.

## Connect a device

A device only needs three things: the broker's IP address, port `1883` (plain MQTT, no TLS) and a topic with a JSON payload. The repo is hardware-agnostic, so this works the same for a microcontroller, a phone app or a laptop.

### At the event (team network)

We use our own network from the start, not only when the venue Wi-Fi fails, so no address changes mid-event. The Pi is plugged into our switch, devices join the 5G router's Wi-Fi, and the venue Wi-Fi only gives the laptops internet.

| What                | Value                                                                               |
| ------------------- | ----------------------------------------------------------------------------------- |
| Router Wi-Fi (SSID) | _fill in when the router is set up_                                                 |
| Router admin login  | In the team password manager (entry "5G router")                                    |
| Broker IP (the Pi)  | _fill in_. Fixed by a DHCP reservation for the Pi's MAC address on the router       |
| Port                | `1883`, plain MQTT                                                                  |
| User / password     | `device` / `MQTT_DEVICE_PASSWORD` from the Pi's `.env.prod` (shared by all devices) |

- Use the IP, not a `.local` name: mDNS is unreliable on microcontrollers and some phones.
- A laptop reaches the Pi by plugging into the switch with a cable, so the venue Wi-Fi keeps providing its internet. Joining the router's Wi-Fi works too, but then the laptop has no venue internet unless it has a second adapter.
- The Pi runs the [production compose](#run-the-production-build), so the broker has no anonymous access.

### During development (laptop as broker)

`pnpm infra:up` publishes the broker on all interfaces of your laptop: port `1883` for MQTT and `9001` for MQTT over WebSockets. There are no credentials.

1. Put the device and the laptop on the same network.
2. Find the laptop's LAN IP and use it as the broker address:
   - **Linux**: `hostname -I` (first address)
   - **macOS**: `ipconfig getifaddr en0` (Wi-Fi, `en1` or another interface otherwise)
   - **Windows**: `ipconfig`, the IPv4 address of the Wi-Fi or Ethernet adapter
3. Allow port 1883 through the firewall if the device can't connect:
   - **Linux**: `sudo ufw allow 1883/tcp` (only if ufw is active)
   - **macOS**: accept the "allow incoming connections" prompt for Docker
   - **Windows** (PowerShell as admin): `New-NetFirewallRule -DisplayName "MQTT 1883" -Direction Inbound -Protocol TCP -LocalPort 1883 -Action Allow`
4. Check from another machine: `mosquitto_pub -h <laptop IP> -t test -m hi` (or any MQTT app). `pnpm mqtt:sub` on the laptop should print `test hi`.

**Windows + WSL**: with Docker Desktop (WSL 2 backend) the port is published on Windows itself, so the firewall rule above is all it takes. Check once that a second device reaches it. With Docker Engine inside WSL there is no Docker Desktop, so forward the port from Windows like in [Test on your phone](#test-on-your-phone), as admin, plus the firewall rule:

```powershell
netsh interface portproxy add v4tov4 listenport=1883 listenaddress=0.0.0.0 connectaddress=<WSL IP> connectport=1883
```

The WSL IP is the first address of `hostname -I` inside WSL, and it can change after a restart.

**Devcontainer**: the broker port is published by the compose service on your host, so the address is your computer's LAN IP, same as above. Inside the container the broker is `mosquitto:1883`.

### Topics and payloads

Topics and their payload schemas are defined only in [`packages/contracts/src/mqtt/index.ts`](packages/contracts/src/mqtt/index.ts). Firmware can read the JSON Schema files in [`packages/contracts/schemas/`](packages/contracts/schemas/) (`mqtt.<topicKey>.schema.json`, the `title` holds the topic pattern). Payloads are UTF-8 JSON with ISO 8601 timestamps (`2026-01-01T00:00:00.000Z`). The API logs and drops messages that don't match the contract.

### Send test messages without hardware

The commands run the clients inside the broker container, so there is nothing to install and they behave the same on Linux, macOS and Windows. Run them from the repo root.

| Command         | What it does                               |
| --------------- | ------------------------------------------ |
| `pnpm mqtt:sub` | Prints every message on every topic (`-v`) |

Publish a message to a topic (here the example topic `sensors/s1/reading`; use a topic and payload from the contracts):

```sh
# bash, zsh
docker compose exec mosquitto mosquitto_pub -t sensors/s1/reading -m '{"deviceId":"s1","value":21.5,"unit":"C","ts":"2026-01-01T00:00:00.000Z"}'
```

```powershell
# PowerShell: Windows PowerShell 5.1 strips the double quotes from native command arguments, so pipe the payload instead
'{"deviceId":"s1","value":21.5,"unit":"C","ts":"2026-01-01T00:00:00.000Z"}' | docker compose exec -T mosquitto mosquitto_pub -t sensors/s1/reading -s
```

The piped form (`-s` reads the message from stdin) works in bash too.

**On the Pi** (production broker, which needs credentials), add `-f compose.prod.yaml --env-file .env.prod` after `docker compose` and `-u device -P <MQTT_DEVICE_PASSWORD>` to `mosquitto_pub` / `mosquitto_sub`. This is how to check that a device's message arrived:

```sh
docker compose -f compose.prod.yaml --env-file .env.prod exec mosquitto mosquitto_sub -u device -P <MQTT_DEVICE_PASSWORD> -v -t "#"
```

Prefer a GUI? [MQTT Explorer](https://mqtt-explorer.com/) connects to `<broker IP>:1883` and shows the topic tree.

## Run the production build

`compose.prod.yaml` runs web (Caddy), API, Postgres and Mosquitto from images built out of this repo, on any machine with Docker. It is separate from the development `compose.yaml`.

1. `cp .env.prod.example .env.prod` and fill in the three secrets (`openssl rand -hex 24` works for each). Compose refuses to start while one is missing.
2. `docker compose -f compose.prod.yaml --env-file .env.prod up --build -d --wait`
3. Open <http://localhost> (web) and <http://localhost/api/health>, which should report `db: "ok"` and `mqtt: "ok"`.

| Variable                                  | Meaning                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`                       | Required. Password of the database user (`POSTGRES_USER`, `POSTGRES_DB` are optional)       |
| `MQTT_API_PASSWORD`                       | Required. Password of the broker user `api`. URL-safe characters only (it is in `MQTT_URL`) |
| `MQTT_DEVICE_PASSWORD`                    | Required. Password of the broker user `device`, shared by all devices                       |
| `SITE_ADDRESS`                            | `:80` (default) is plain HTTP. A domain name makes Caddy fetch an HTTPS certificate         |
| `CORS_ORIGIN`                             | Only needed if the browser loads the app from another origin than the web container         |
| `WEB_PORT`, `WEB_HTTPS_PORT`, `MQTT_PORT` | Published ports (80, 443, 1883)                                                             |

Broker credentials: the broker has no anonymous access. On every start the Mosquitto container builds its password file (`mosquitto_passwd`) from `MQTT_API_PASSWORD` and `MQTT_DEVICE_PASSWORD`, so there is no file to manage; change a password in `.env.prod` and run `up -d` again. Devices connect to `<host>:1883` as user `device`. There is no WebSocket listener: the browser gets live data through the API.

### Prebuilt images (GHCR)

CI builds the API and web images for `linux/amd64` and `linux/arm64` ([`images.yml`](.github/workflows/images.yml)) and pushes them from `main` to `ghcr.io/freunde-der-socken/hackathon-fulda-2026-api` and `-web`, tagged `latest` and with the commit SHA. A host can pull them instead of building:

```sh
docker compose -f compose.prod.yaml --env-file .env.prod pull
docker compose -f compose.prod.yaml --env-file .env.prod up -d --wait
```

`IMAGE_TAG` in `.env.prod` pins a commit SHA instead of `latest`. `IMAGE_PREFIX` points at another registry or fork.

- The arm64 images need a **64-bit** Raspberry Pi OS (`uname -m` prints `aarch64`).
- While the repo is private, so are the packages: run `docker login ghcr.io` once on the Pi and the Azure VM, with a GitHub token that only has `read:packages`. A public repo makes the packages public too (set their visibility in the package settings), and no login is needed.
- Check the platforms: `docker buildx imagetools inspect ghcr.io/freunde-der-socken/hackathon-fulda-2026-api:latest`.
- Pull requests that touch app sources, the lockfile or a Dockerfile build both images (without pushing), so a broken Dockerfile fails there.

The API applies the SQL migrations in `apps/api/drizzle/` itself when it starts in production. Caddy keeps its certificates in the `caddy-data` volume. `docker compose -f compose.prod.yaml --env-file .env.prod down -v` deletes all data.

## Conventions

- **Branches**: `<type>/<issue>-<short-name>`, with type `feat`, `fix`, `docs`, `chore` or `ci` (for example `feat/12-login-page`).
- **Pull requests**: small, with `Closes #<issue>` in the description. CI (`fmt:check`, `lint`, `typecheck`, `build`) must be green before you merge.
- **Where code goes**: Zod schemas and types used by both sides go in `packages/contracts`. Database schema stays in the API (`apps/api/src/db/schema`). UI components go in `apps/web/src/components` (shadcn-vue ones in `components/ui`). Don't import from `apps/*` into `packages/*`.
- **Dependencies**: add shared ones through the pnpm catalog (see [Toolchain](#toolchain)).
- **API logging**: use `app.log` / `request.log`, not `console.*` (lint fails on it).
- **Merge conflicts**: the registry files (`packages/contracts/src/index.ts`, `apps/api/src/db/schema/index.ts`, `apps/api/src/routes/index.ts`, `apps/web/src/lib/navigation.ts`) use git's union merge (see [`.gitattributes`](.gitattributes)), so two branches that both append a line merge without a conflict. Keep one entry per line in them. If both sides add the same line it appears twice: `pnpm lint` / `pnpm typecheck` catch that, delete the duplicate. `apps/web/src/router/index.ts` and the MQTT `topics` map span several lines, so resolve conflicts there by hand. For a `pnpm-lock.yaml` conflict, merge the `package.json` changes, run `pnpm install` (it resolves the lockfile on its own) and commit the result.
- AI assistants: see [`AGENTS.md`](AGENTS.md) (`CLAUDE.md` imports it).

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

- Root scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` run through Turbo. `pnpm fmt` / `pnpm fmt:check` run oxfmt on the whole repo.
- `transit` is an empty task that only depends on `^transit`. `lint` and `typecheck` depend on it, so their caches are invalidated when a dependency's source changes, without building that dependency first.
- Env vars that affect a build must be listed under `build.env` in [`turbo.json`](turbo.json) (`VITE_*` already is), or Turbo serves stale cache hits.

### Tests

Vitest runs in `packages/contracts` and `apps/api` (node) and in `apps/web` (happy-dom with `@vue/test-utils`; the `@/` alias works). CI does not run them, so run them yourself when they help.

- `pnpm test` runs all packages once. In a package: `pnpm --filter @repo/web test` (single run) or `test:watch` (reruns on change).
- Put tests next to the code as `*.test.ts` (for example `NotFoundView.test.ts` beside `NotFoundView.vue`).
- Import `describe`, `it` and `expect` from `vitest`. Globals are off, because TS 6 doesn't pick up their types on its own.
- API tests build the app with `buildApp()` and call `app.inject(...)`. The config unsets `DATABASE_URL` and `MQTT_URL`, so `db` and `mqtt` are `disabled`.

## Troubleshooting

- **Port already in use**: find the process with `lsof -i :<port>` (PowerShell: `Get-NetTCPConnection -LocalPort <port>`), or pick another port, see [Ports & URLs](#ports--urls). Postgres on 5432 is the usual one: set `POSTGRES_PORT` in the root `.env` and the same port in `DATABASE_URL`.
- **The API says `db: "disabled"` or `mqtt: "disabled"`**: `DATABASE_URL` / `MQTT_URL` is not set. Copy `apps/api/.env.example` to `apps/api/.env`. The devcontainer sets them for you.
- **Everything is slow on Windows**: the repo is under `/mnt/c`. Clone it into the WSL filesystem (`~/…`) instead.
- **`pnpm install` fails on the Node version or on build scripts**: use Node 24, and see `allowBuilds` in `pnpm-workspace.yaml` for dependencies allowed to run install scripts.
- **Reset the database or the broker**: `pnpm infra:reset` deletes both volumes, then `pnpm infra:up` and `pnpm db:migrate`.
- **Postgres won't start after switching versions**: Postgres 18 keeps its data in a versioned folder, so `compose.yaml` mounts the volume at `/var/lib/postgresql`, not `/var/lib/postgresql/data`. A volume created by another major version has to be reset with `pnpm infra:reset`.
- **A build, lint or typecheck result looks stale**: Turbo cached it. Run `pnpm turbo run <task> --force`. Env vars that affect a build must be listed in `turbo.json` (see [Toolchain](#toolchain)).
- **Opening the devcontainer replaced my `node_modules`**: host and container share the folder, and native binaries differ between systems. Run `pnpm install` again after switching.
