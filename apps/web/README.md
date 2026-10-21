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
