# hackathon-fulda-2026

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
