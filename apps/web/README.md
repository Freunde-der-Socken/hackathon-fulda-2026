# @repo/web

Vue 3 + TypeScript app: Vite, Vue Router, Pinia, Tailwind v4 and [shadcn-vue](https://www.shadcn-vue.com).

## Run

```sh
pnpm dev                    # from the repo root: web (:5173) and API (:3000) together
pnpm --filter @repo/web dev # web only
```

Requests to `/api` are proxied to `http://localhost:3000` (see `vite.config.ts`). To talk to another API, copy `.env.example` to `.env` and set `VITE_API_URL`. Leave it empty to use the proxy.

## Structure

| Path                    | Purpose                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/layouts/`          | `AppLayout.vue`: bottom tabs below `md`, collapsible sidebar from `md` up                                                                                      |
| `src/lib/navigation.ts` | Navigation entries, defined once and rendered by both variants. Add new pages here.                                                                            |
| `src/lib/api.ts`        | `apiGet` / `apiPost` / `apiPatch` / `apiPut` / `apiDelete`. Every response is parsed with a Zod schema, and request bodies are validated before they are sent. |
| `src/components/ui/`    | shadcn-vue components. They are our code, so edit them freely.                                                                                                 |
| `src/views/`            | One component per route. Register routes in `src/router/index.ts`.                                                                                             |

Schemas live in `@repo/contracts`, shared with the API. Don't redefine types here:

```ts
import { HealthResponse } from '@repo/contracts';
const health = await apiGet('/health', HealthResponse); // typed as HealthResponse
```

Show errors with `toast.error(...)` from `vue-sonner`. The `<Toaster />` is already in the layout.

## Texts and languages

The app speaks English and German ([vue-i18n](https://vue-i18n.intlify.dev), Composition API). Every visible text lives in `src/locales/en.ts`, with the German one under the same key in `src/locales/de.ts` (TypeScript fails the build if a key is missing). In a component:

```ts
const { t, d, n } = useI18n();
t('lesson.awarded', { amount: 3 }); // "+3 water" / "+3 Wasser"
d(date, 'time'); // dates and times: formats in src/lib/i18n.ts
n(value, 'precise'); // numbers, e.g. 54.3 / 54,3
```

Outside components use `i18n.global.t` from `@/lib/i18n`. For text around markup such as `<code>`, use `<I18nT keypath="..." scope="global">` with a slot per parameter. The start language follows the browser (fallback English), the picker in the layout calls `setLocale`, which also sets `<html lang>` and remembers the choice. Tests run in English (`src/test-setup.ts`).

## Design library

Colours are tokens in `src/style.css`, set for light (`:root`) and dark (`.dark`). Use them as Tailwind classes (`bg-primary`, `text-water`, ...), never as hex values in components. Dark mode follows the system until someone uses the sun/moon button in the layout (`useDark`).

| Token                       | Use it for                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `primary`                   | The plant and the main action on a page. Green is a stand-in until the team picks its colour |
| `water`                     | Water the class earns: amounts, progress, the award buttons                                  |
| `warning`                   | Something to act on soon, e.g. the air getting worse                                         |
| `destructive`               | Errors and actions that delete something                                                     |
| `muted` / `accent`          | Quiet surfaces and hover states                                                              |
| `--series-1` … `--series-8` | Chart lines, in fixed order (see `SensorsView.vue`)                                          |

| Component              | Use it for                                                           |
| ---------------------- | -------------------------------------------------------------------- |
| `Button`               | Actions. `size="lg"` for the big touch targets on the lesson page    |
| `Card`                 | One topic per card: a chart, a counter, a form                       |
| `ToggleGroup`          | Picking one of a few options that are all visible, e.g. a time range |
| `Select`               | Picking one of many, e.g. the class                                  |
| `Tabs`                 | Switching between views of the same data                             |
| `Badge`                | Short status labels, e.g. "connected" or a plant's mode              |
| `Progress`             | A value towards a goal, e.g. water towards a full bloom              |
| `Dialog` / `Sheet`     | Forms that need focus (Dialog), more navigation on phones (Sheet)    |
| `Input` / `Label`      | Form fields, always with a label                                     |
| `Skeleton`             | Placeholders while data loads                                        |
| `toast` (`vue-sonner`) | Errors and short confirmations                                       |

## Add a shadcn-vue component

```sh
cd apps/web
pnpm dlx shadcn-vue@latest add <component>
```

The config is in `components.json`. Check the result after adding a component:

- It must import `cn` from `@/lib/utils`. The CLI wrote `from "cn"` (an unrelated npm package) for the starter set, so run `pnpm shadcn:fix` and `pnpm remove cn` if it happens again.
- Icons come from `@lucide/vue` (`lucide-vue-next` is deprecated).
- The CLI may add new theme tokens to `src/style.css`. Keep them.

Then run `pnpm fmt` from the repo root, since the CLI writes double quotes.
