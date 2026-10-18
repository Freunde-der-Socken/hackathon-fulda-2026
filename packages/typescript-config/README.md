# @repo/typescript-config

Shared `tsconfig` presets. Extend one of them from a package's `tsconfig.json`:

| Preset | Use for | Adds on top of `base.json` |
| --- | --- | --- |
| `base.json` | Runtime-agnostic packages (e.g. `@repo/contracts`) | – |
| `node.json` | `apps/api` and Node scripts | `types: ["node"]` |
| `vue.json` | `apps/web` | DOM libs, Vue JSX, `types: ["vite/client"]` |

```json
{
  "extends": "@repo/typescript-config/node.json",
  "include": ["src"]
}
```

The consuming package must depend on `@repo/typescript-config` (`workspace:*`) plus the packages behind its `types` entry (`@types/node` or `vite`).

## Why these settings

- **`module: "Preserve"` + `moduleResolution: "bundler"` everywhere, including Node.** Nothing is executed by `tsc`: the web app is bundled by Vite, the API runs through `tsx` and is bundled by `tsdown`. This lets workspace packages ship raw `.ts` with extensionless imports, which `NodeNext` would reject.
- **`noEmit: true`.** `tsc` / `vue-tsc` only type-check; bundlers produce the output.
- **`types: []` in the base.** TypeScript 6 no longer picks up every `@types/*` package automatically, so each preset lists the globals it needs.
- **No `baseUrl`.** It is deprecated in TypeScript 6 and fails the build. Declare `paths` (e.g. `"@/*": ["./src/*"]`) without it; they resolve relative to the `tsconfig.json`.
