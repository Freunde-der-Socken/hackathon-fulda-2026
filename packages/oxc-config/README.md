# @repo/oxc-config

Shared [oxlint](https://oxc.rs/docs/guide/usage/linter) presets and the [oxfmt](https://oxc.rs/docs/guide/usage/formatter) config. The repo has no ESLint or Prettier.

| Export        | Use for                                            | Adds on top of `base`                                           |
| ------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| `oxlint/base` | Runtime-agnostic packages (e.g. `@repo/contracts`) | –                                                               |
| `oxlint/vue`  | `apps/web`                                         | `vue` plugin, browser globals                                   |
| `oxlint/node` | `apps/api`                                         | `node` + `promise` plugins, Node globals, `no-console` as error |
| `oxfmt`       | The root `oxfmt.config.ts` only                    | –                                                               |

Each package re-exports its preset from an `oxlint.config.ts` and adds `@repo/oxc-config` (`workspace:*`) as a dev dependency:

```ts
export { default } from '@repo/oxc-config/oxlint/vue';
```

```json
"scripts": {
  "lint": "oxlint",
  "lint:fix": "oxlint --fix"
}
```

## Why it works this way

- **Spread + re-export instead of `extends`.** oxlint loads the preset as the config itself, so every field (including `categories` and `ignorePatterns`) applies. To tweak one app, spread the preset in its `oxlint.config.ts` and override locally. Changes that apply to every app go here.
- **No `-c` / `--config` in scripts.** An explicit path disables oxlint's nested config lookup.
- **No formatter config in apps.** oxfmt uses the nearest config file walking up the tree, so the root `oxfmt.config.ts` covers everything. Formatting runs once at the root (`pnpm fmt`, `pnpm fmt:check`), not as a Turbo task.
- **Errors fail, warnings don't.** Real bugs (`correctness`) are errors; `suspicious` and `perf` are warnings. `pedantic` and `style` are off because formatting is oxfmt's job.
- **Turbo cache.** `lint` depends on `transit`, so editing a rule here invalidates the lint cache of every package that depends on `@repo/oxc-config`.
- **`oxlint` and `oxfmt` are pinned exactly** in the root `package.json`, because oxfmt is still pre-1.0. Install them from npm, not as standalone binaries: the binary can't read `oxfmt.config.ts` or format Vue templates.
