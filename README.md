# hackathon-fulda-2026

[![CI](https://github.com/Holytrashbag/hackathon-fulda-2026/actions/workflows/ci.yml/badge.svg)](https://github.com/Holytrashbag/hackathon-fulda-2026/actions/workflows/ci.yml)

Prototype of a classroom mascot: a physical plant that reacts live to CO2 and noise in the classroom and grows with the points the class earns, with a web app for the teacher. What we're building and what's still open is in [`docs/concept.md`](docs/concept.md).

A TypeScript monorepo (pnpm workspaces + Turborepo) for a Vue 3 web app and a Fastify API that share Zod schemas. The web app uses Vite, Vue Router, Pinia, Tailwind v4 and shadcn-vue. The API uses Fastify 5 with optional Postgres (Drizzle). Browser and hardware both talk to it over REST. Lint and format run with oxlint and oxfmt.

## What's in here

```
apps/
  web/                    Vue 3 + Vite + Tailwind + shadcn-vue       README: apps/web/README.md
  api/                    Fastify API, Drizzle (Postgres)            README: apps/api/README.md
  rnd/                    TensorFlow.js R&D workspace (smoke test)   README: apps/rnd/README.md
  plant/                  ESP32 firmware of the plant (PlatformIO, not in the pnpm workspace)
  wateringcan/            ESP32 firmware of the watering can (PlatformIO, not in the pnpm workspace)
packages/
  contracts/              Zod schemas shared by web and API          README: packages/contracts/README.md
  ml/                     Model save/load helpers (TensorFlow.js)   README: packages/ml/README.md
  oxc-config/             oxlint presets and the oxfmt config        README: packages/oxc-config/README.md
  typescript-config/      tsconfig presets (base, node, vue)         README: packages/typescript-config/README.md
docs/concept.md           The project: hardware, plant modes, points, pages, open decisions
compose.yaml              Postgres for local development
.devcontainer/            VS Code devcontainer (Node, pnpm, Docker CLI, extensions)
```

## Getting started

### Devcontainer (recommended)

Prerequisites: Docker Desktop or Docker Engine, and VS Code with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension.

1. Clone the repo. On Windows, clone it inside WSL (`~/…`), not under `/mnt/c`: bind mounts from the Windows filesystem are very slow.
2. Open the folder in VS Code and run **Dev Containers: Reopen in Container**. The first build installs the dependencies on its own.
3. In the container terminal, run `pnpm dev`.
4. Open <http://localhost:5173/api/health>. You should see `{"status":"ok", …, "db":"ok"}`. VS Code forwards the ports to your browser.

Postgres starts with the container. Inside it it is reached by service name (`DATABASE_URL` is preset), and `docker compose ps` works from the container terminal.

### Local

Prerequisites: Node 24, pnpm 11 (`npm i -g pnpm@11.25.0`) and Docker.

```sh
pnpm install
cp apps/api/.env.example apps/api/.env   # without it the API runs with the database disabled
pnpm infra:up                            # Postgres
pnpm dev
```

Then open <http://localhost:5173/api/health>. The commands also work in PowerShell (`cp` is an alias for `Copy-Item`).

- **Windows (native)**: install Node 24, pnpm and Docker Desktop (WSL 2 backend). Use PowerShell or Windows Terminal. Keep Git's default `core.autocrlf`: the repo's `.gitattributes` checks files out with LF, which `pnpm fmt:check` expects. Re-clone if you cloned before that file existed. WSL or the devcontainer is still the smoother path.
- **macOS**: install Node 24 (for example with `nvm` or `fnm`, they read `.nvmrc`), pnpm and Docker Desktop, the documented default and the same as for the devcontainer. OrbStack or similar works too if you already use it.

## Everyday commands

Run them from the repo root.

| Command                                         | What it does                                                |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                                      | Web and API in watch mode (through Turbo)                   |
| `pnpm --filter @repo/web dev:host`              | Web dev server reachable from other devices on your network |
| `pnpm --filter @repo/web dev:https`             | Same over HTTPS (self-signed), for microphone/camera access |
| `pnpm build`                                    | Typecheck and build everything                              |
| `pnpm lint` / `pnpm typecheck`                  | oxlint / `tsc` and `vue-tsc` in every package               |
| `pnpm test`                                     | Run the Vitest tests of every package once (not part of CI) |
| `pnpm fmt` / `pnpm fmt:check`                   | Format with oxfmt / check formatting (CI runs the check)    |
| `pnpm infra:up` / `infra:down`                  | Start / stop Postgres                                       |
| `pnpm infra:reset`                              | Stop it **and delete its data** (volume)                    |
| `pnpm infra:logs`                               | Follow the Postgres logs                                    |
| `pnpm db:up`                                    | Start only Postgres (same as `infra:up` for now)            |
| `pnpm db:migrate`                               | Apply the SQL migrations in `apps/api/drizzle/`             |
| `pnpm --filter @repo/api db:generate`           | Create a migration from schema changes                      |
| `pnpm --filter @repo/api db:push` / `db:studio` | Sync the schema without a migration / open Drizzle Studio   |
| `pnpm db:seed`                                  | Run the seed in `apps/api/src/db/seed-data.ts`              |

## Ports & URLs

| What                | URL / port                         | Change it with (file)                                |
| ------------------- | ---------------------------------- | ---------------------------------------------------- |
| Web                 | <http://localhost:5173>            | `WEB_PORT` (`apps/web/.env`)                         |
| API                 | <http://localhost:3000/api>        | `API_PORT` (root `.env`, also used by the web proxy) |
| Health check        | <http://localhost:5173/api/health> |                                                      |
| API docs (dev only) | <http://localhost:3000/api/docs/>  |                                                      |
| Postgres            | `localhost:5432`                   | `POSTGRES_PORT` (root `.env`)                        |

The web dev server proxies `/api` to the API, so the browser only talks to port 5173. Inside the devcontainer the services always use their default ports, and only the ports published on your machine change.

## Environment variables

Copy an `.env.example` to `.env` (git-ignored) to override its defaults.

| File                    | Keys                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env.example`          | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` (Compose), `API_PORT` (API and web proxy)                                                      |
| `apps/api/.env.example` | `NODE_ENV`, `HOST`, `LOG_LEVEL`, `CORS_ORIGIN` (comma-separated), `DATABASE_URL` (unset disables the database), `WATERING_CAN_URL` (unset sends nothing to the can) |
| `apps/web/.env.example` | `VITE_API_URL` (empty uses the `/api` proxy), `WEB_PORT`, `API_TARGET` (proxy `/api` to e.g. the Pi)                                                                |

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

### Test on your phone

1. Put the phone and the computer on the same Wi-Fi.
2. `pnpm --filter @repo/web dev:host`, and note the `Network:` address that Vite prints (the LAN IP of your computer).
3. Open `http://<that IP>:5173` on the phone. The `/api` proxy works the same way, so the API needs no change.
4. Microphone, camera and motion sensors only work on secure origins, which a LAN IP over http is not. For those, run `pnpm --filter @repo/web dev:https` instead and open `https://<that IP>:5173`. The certificate is self-signed, so accept the browser warning once (Advanced → Proceed).
5. On WSL the address Vite prints is the WSL one. Forward the port from Windows (`netsh interface portproxy add v4tov4 listenport=5173 connectaddress=<WSL IP> connectport=5173`, as admin) and allow it in the Windows firewall.

## Connect a device

Devices talk to the API over plain HTTP, like the browser: they send JSON to an endpoint defined in `@repo/contracts` (see [Add an API endpoint](#add-an-api-endpoint)). A device only needs the host's IP address, the port and the path. The repo is hardware-agnostic, so this works the same for a microcontroller, a phone app or a laptop.

### At the event (team network)

We use our own network from the start, not only when the venue Wi-Fi fails, so no address changes mid-event. The Pi is plugged into our switch, devices join the 5G router's Wi-Fi, and the venue Wi-Fi only gives the laptops internet.

| What                | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| Router Wi-Fi (SSID) | _fill in when the router is set up_                                           |
| Router admin login  | In the team password manager (entry "5G router")                              |
| API host (the Pi)   | _fill in_. Fixed by a DHCP reservation for the Pi's MAC address on the router |
| Base URL            | `http://<Pi IP>/api` (port 80, the web container proxies `/api` to the API)   |

- Use the IP, not a `.local` name: mDNS is unreliable on microcontrollers and some phones.
- A laptop reaches the Pi by plugging into the switch with a cable, so the venue Wi-Fi keeps providing its internet. Joining the router's Wi-Fi works too, but then the laptop has no venue internet unless it has a second adapter.
- The Pi runs the [production compose](#run-the-production-build), and every merge to `main` [deploys to it](#deploy-to-the-pi). The API has no authentication yet, so anyone on the team network can call it.

### During development (laptop as host)

`pnpm dev` starts the API on all interfaces of your laptop (`HOST=0.0.0.0`), port `3000`, so the base URL is `http://<laptop IP>:3000/api`.

1. Put the device and the laptop on the same network.
2. Find the laptop's LAN IP:
   - **Linux**: `hostname -I` (first address)
   - **macOS**: `ipconfig getifaddr en0` (Wi-Fi, `en1` or another interface otherwise)
   - **Windows**: `ipconfig`, the IPv4 address of the Wi-Fi or Ethernet adapter
3. Allow port 3000 through the firewall if the device can't connect:
   - **Linux**: `sudo ufw allow 3000/tcp` (only if ufw is active)
   - **macOS**: accept the "allow incoming connections" prompt for `node`
   - **Windows** (PowerShell as admin): `New-NetFirewallRule -DisplayName "API 3000" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow`
4. Check from another machine: `curl http://<laptop IP>:3000/api/health` should print `{"status":"ok",…}`.

**Windows + WSL**: forward the port from Windows like in [Test on your phone](#test-on-your-phone), as admin, plus the firewall rule:

```powershell
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectaddress=<WSL IP> connectport=3000
```

The WSL IP is the first address of `hostname -I` inside WSL, and it can change after a restart.

**Devcontainer**: VS Code forwards the ports to `localhost` only, so other devices can't reach them. Set `"remote.localPortHost": "allInterfaces"` in your VS Code user settings to forward them on your LAN IP as well.

### Payloads

Request and response bodies are the Zod schemas in [`packages/contracts/src/`](packages/contracts/src/). Firmware can read the generated JSON Schema files in [`packages/contracts/schemas/`](packages/contracts/schemas/) (`http.<SchemaName>.schema.json`). Bodies are UTF-8 JSON (`Content-Type: application/json`) with ISO 8601 timestamps (`2026-01-01T00:00:00.000Z`). The API answers an invalid body with a 400 and field-level `issues`.

### Send test requests without hardware

Use `curl`, or the "Try it out" button in the API docs (<http://localhost:3000/api/docs/>). `POST /api/readings` is a placeholder here, use an endpoint and body from the contracts:

```sh
# bash, zsh
curl -X POST http://localhost:3000/api/readings -H 'Content-Type: application/json' -d '{"deviceId":"s1","value":21.5,"ts":"2026-01-01T00:00:00.000Z"}'
```

```powershell
# PowerShell: Invoke-RestMethod sidesteps the quoting problems of curl.exe in Windows PowerShell 5.1
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/readings -ContentType 'application/json' -Body '{"deviceId":"s1","value":21.5,"ts":"2026-01-01T00:00:00.000Z"}'
```

On the Pi, use `http://<Pi IP>/api/...` instead. `docker compose -f compose.prod.yaml --env-file .env.prod logs -f api` shows the incoming requests.

## Run the production build

`compose.prod.yaml` runs web (Caddy), API and Postgres from images built out of this repo, on any machine with Docker. It is separate from the development `compose.yaml`.

1. `cp .env.prod.example .env.prod` and fill in `POSTGRES_PASSWORD` (`openssl rand -hex 24` works). Compose refuses to start while it is missing.
2. `docker compose -f compose.prod.yaml --env-file .env.prod up --build -d --wait`
3. Open <http://localhost> (web) and <http://localhost/api/health>, which should report `db: "ok"`.

| Variable                     | Meaning                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`          | Required. Password of the database user (`POSTGRES_USER`, `POSTGRES_DB` are optional) |
| `SITE_ADDRESS`               | `:80` (default) is plain HTTP. A domain name makes Caddy fetch an HTTPS certificate   |
| `TLS_DEFAULT_SNI`            | The single IP when `SITE_ADDRESS` contains an IP, so the TLS handshake works          |
| `CORS_ORIGIN`                | Only needed if the browser loads the app from another origin than the web container   |
| `WATERING_CAN_URL`           | Base URL of the watering can. The API POSTs the water total to `<url>/water`          |
| `WEB_PORT`, `WEB_HTTPS_PORT` | Published ports (80, 443)                                                             |

### Prebuilt images (GHCR)

CI builds the API and web images for `linux/amd64` and `linux/arm64` ([`images.yml`](.github/workflows/images.yml)) and pushes them from `main` to `ghcr.io/freunde-der-socken/hackathon-fulda-2026-api` and `-web`, tagged `latest` and with the commit SHA. A host can pull them instead of building:

```sh
docker compose -f compose.prod.yaml --env-file .env.prod pull
docker compose -f compose.prod.yaml --env-file .env.prod up -d --wait
```

`IMAGE_TAG` in `.env.prod` pins a commit SHA instead of `latest`. `IMAGE_PREFIX` points at another registry or fork.

- The arm64 images need a **64-bit** Raspberry Pi OS (`uname -m` prints `aarch64`).
- While the repo is private, so are the packages: to pull by hand, run `docker login ghcr.io` once on the host with a GitHub token that only has `read:packages`. A public repo makes the packages public too (set their visibility in the package settings), and no login is needed. The [deploy workflow](#deploy-to-the-pi) logs in by itself.
- Check the platforms: `docker buildx imagetools inspect ghcr.io/freunde-der-socken/hackathon-fulda-2026-api:latest`.
- Pull requests that touch app sources, the lockfile or a Dockerfile build both images (without pushing), so a broken Dockerfile fails there.

The API applies the SQL migrations in `apps/api/drizzle/` and runs the seed (`apps/api/src/db/seed-data.ts`) itself when it starts in production. Caddy keeps its certificates in the `caddy-data` volume. `docker compose -f compose.prod.yaml --env-file .env.prod down -v` deletes all data.

### Deploy to the Pi

[`deploy.yml`](.github/workflows/deploy.yml) deploys every push to `main` to the Raspberry Pi once the images are built. GitHub can't reach the Pi on the team network, so a self-hosted Actions runner on the Pi picks up the job (it only connects outbound). The job checks out the commit, pulls the images tagged with its SHA, runs `up -d --wait`, checks `/api/health` for `db: "ok"` and removes old images. Pull requests never run on the Pi.

One-time setup on the Pi (64-bit Raspberry Pi OS, online through the 5G router):

1. Install Docker and let your user run it: `curl -fsSL https://get.docker.com | sh`, then `sudo usermod -aG docker $USER` and log in again.
2. Put the production env file in place (outside the runner's workspace, never in the repo):
   ```sh
   sudo mkdir -p /opt/hackathon-fulda && sudo chown $USER /opt/hackathon-fulda
   # Copy .env.prod.example there as .env.prod and fill in POSTGRES_PASSWORD
   chmod 600 /opt/hackathon-fulda/.env.prod
   ```
3. Register the runner: in GitHub, **Settings → Actions → Runners → New self-hosted runner**, choose Linux / ARM64 and run the download and `config.sh` commands shown there, adding `--labels pi`. Then install it as a service so it survives reboots: `sudo ./svc.sh install $USER && sudo ./svc.sh start`.
4. Optional repository variables (**Settings → Secrets and variables → Actions → Variables**): `PI_URL` (e.g. `http://<Pi IP>`, shown on the deployment) and `PI_ENV_FILE` (if the env file is not at `/opt/hackathon-fulda/.env.prod`).

The workflow logs in to GHCR with its own token, so the Pi needs no GitHub token. A stack that was started by hand on the Pi is taken over, the volumes (database, certificates) stay. The **pi** environment in the repo sidebar lists what is deployed.

**Redeploy or roll back**: **Actions → Deploy → Run workflow**, optionally with the full SHA of an earlier `main` commit (its images must exist, i.e. its `Images` run succeeded). A rollback does not undo migrations: if the newer version changed the database schema, fix forward instead.

If the repo becomes public, set **Settings → Actions → General → Fork pull request workflows** to require approval for all outside collaborators, so nobody can run code on the Pi from a fork.

## Working with AI

The repo is set up so an AI agent knows the stack and the conventions. [`AGENTS.md`](AGENTS.md) is the one source of instructions (Claude Code reads it through the import in `CLAUDE.md`; Copilot, Cursor and Codex read `AGENTS.md` directly).

- **Skills** (Claude Code, [`.claude/skills/`](.claude/skills)): `add-endpoint`, `add-table`, `add-view`, `add-ui-component` and `verify`. They follow the [Recipes](#recipes) above. Ask for them by name, for example "use add-endpoint to add GET /api/greeting".
- **Rules**: small PRs. Run `verify` (the CI gate) before opening a PR. A human reviews AI-written code before it is merged. No secrets in prompts. Don't paste `.env` contents.
- **Marking AI-assisted work** (provisional, until we have checked the organizers' AI rules): tick the checkbox in the PR template. Commit trailers (`Co-Authored-By`) and the PR footer from the agent are welcome.

## Conventions

- **Branches**: `<type>/<issue>-<short-name>`, with type `feat`, `fix`, `docs`, `chore` or `ci` (for example `feat/12-login-page`).
- **Pull requests**: small, with `Closes #<issue>` in the description. CI (`fmt:check`, `lint`, `typecheck`, `build`) must be green before you merge.
- **Where code goes**: Zod schemas and types used by both sides go in `packages/contracts`. Database schema stays in the API (`apps/api/src/db/schema`). UI components go in `apps/web/src/components` (shadcn-vue ones in `components/ui`). Don't import from `apps/*` into `packages/*`.
- **Dependencies**: add shared ones through the pnpm catalog (see [Toolchain](#toolchain)).
- **API logging**: use `app.log` / `request.log`, not `console.*` (lint fails on it).
- **Merge conflicts**: the registry files (`packages/contracts/src/index.ts`, `apps/api/src/db/schema/index.ts`, `apps/api/src/routes/index.ts`, `apps/web/src/lib/navigation.ts`) use git's union merge (see [`.gitattributes`](.gitattributes)), so two branches that both append a line merge without a conflict. Keep one entry per line in them. If both sides add the same line it appears twice: `pnpm lint` / `pnpm typecheck` catch that, delete the duplicate. `apps/web/src/router/index.ts` spans several lines, so resolve conflicts there by hand. For a `pnpm-lock.yaml` conflict, merge the `package.json` changes, run `pnpm install` (it resolves the lockfile on its own) and commit the result.
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
- API tests build the app with `buildApp()` and call `app.inject(...)`. The config unsets `DATABASE_URL`, so `db` is `disabled`.

## Troubleshooting

- **Port already in use**: find the process with `lsof -i :<port>` (PowerShell: `Get-NetTCPConnection -LocalPort <port>`), or pick another port, see [Ports & URLs](#ports--urls). Postgres on 5432 is the usual one: set `POSTGRES_PORT` in the root `.env` and the same port in `DATABASE_URL`.
- **The API says `db: "disabled"`**: `DATABASE_URL` is not set. Copy `apps/api/.env.example` to `apps/api/.env`. The devcontainer sets it for you.
- **Everything is slow on Windows**: the repo is under `/mnt/c`. Clone it into the WSL filesystem (`~/…`) instead.
- **`pnpm install` fails on the Node version or on build scripts**: use Node 24, and see `allowBuilds` in `pnpm-workspace.yaml` for dependencies allowed to run install scripts.
- **Reset the database**: `pnpm infra:reset` deletes its volume, then `pnpm infra:up` and `pnpm db:migrate`.
- **Postgres won't start after switching versions**: Postgres 18 keeps its data in a versioned folder, so `compose.yaml` mounts the volume at `/var/lib/postgresql`, not `/var/lib/postgresql/data`. A volume created by another major version has to be reset with `pnpm infra:reset`.
- **A build, lint or typecheck result looks stale**: Turbo cached it. Run `pnpm turbo run <task> --force`. Env vars that affect a build must be listed in `turbo.json` (see [Toolchain](#toolchain)).
- **Opening the devcontainer replaced my `node_modules`**: host and container share the folder, and native binaries differ between systems. Run `pnpm install` again after switching.
