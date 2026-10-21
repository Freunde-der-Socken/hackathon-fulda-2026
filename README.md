# hackathon-fulda-2026

## Getting started

### Devcontainer (recommended)

Prerequisites: Docker Desktop or Docker Engine, and VS Code with the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension.

1. Clone the repo. On Windows, clone it inside WSL (`~/…`), not under `/mnt/c`: bind mounts from the Windows filesystem are very slow.
2. Open the folder in VS Code and run **Dev Containers: Reopen in Container**. The first build installs the dependencies on its own.
3. In the container terminal, run `pnpm dev`. Web is on <http://localhost:5173> and the API on <http://localhost:3000>, forwarded to your browser by VS Code.

Postgres and Mosquitto start with the container. Inside it they are reached by service name (`DATABASE_URL` and `MQTT_URL` are preset), and `docker compose ps` works from the container terminal. If a host port is already taken, set another one:

| Service             | Where                                            | Variable                                     |
| ------------------- | ------------------------------------------------ | -------------------------------------------- |
| Postgres, Mosquitto | root `.env` (see [`.env.example`](.env.example)) | `POSTGRES_PORT`, `MQTT_PORT`, `MQTT_WS_PORT` |
| Web                 | `apps/web/.env` (see its `.env.example`)         | `WEB_PORT`                                   |
| API                 | root `.env` (also used by the web dev proxy)     | `API_PORT`                                   |

Inside the container the services always use their default ports. Only the ports published on your machine change.

To open the app on a phone on the same Wi-Fi, run `pnpm --filter @repo/web dev:host` and browse to `http://<LAN IP of your computer>:5173`. On WSL this also needs a port forward from Windows to the WSL IP.

### Local

Node 24, `npm i -g pnpm@11.25.0`, then:

```sh
pnpm install
pnpm infra:up   # Postgres + Mosquitto
pnpm dev
```

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
