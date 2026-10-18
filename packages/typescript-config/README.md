# @repo/typescript-config

Shared `tsconfig` presets. Extend one of them from a package's `tsconfig.json`:

| Preset      | Use for                                            | Adds on top of `base.json`                  |
| ----------- | -------------------------------------------------- | ------------------------------------------- |
| `base.json` | Runtime-agnostic packages (e.g. `@repo/contracts`) | –                                           |
| `node.json` | `apps/api` and Node scripts                        | `types: ["node"]`                           |
| `vue.json`  | `apps/web`                                         | DOM libs, Vue JSX, `types: ["vite/client"]` |

```json
{
  "extends": "@repo/typescript-config/node.json",
  "include": ["src"]
}
```

The consuming package must depend on `@repo/typescript-config` (`workspace:*`) plus the packages behind its `types` entry (`@types/node` or `vite`).
