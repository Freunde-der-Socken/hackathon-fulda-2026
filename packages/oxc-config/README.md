# @repo/oxc-config

Shared [oxlint](https://oxc.rs/docs/guide/usage/linter) presets and the [oxfmt](https://oxc.rs/docs/guide/usage/formatter) config.

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