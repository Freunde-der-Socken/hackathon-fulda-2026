# @repo/contracts

Every request, response and message schema shared by `apps/web` and `apps/api`, as Zod schemas plus inferred types. Both apps import the TypeScript source directly; there is no build step.

```ts
import { CreateItemBody, ErrorResponse, HealthResponse } from '@repo/contracts';
```

## Layout

- `src/common.ts`: `Id`, `Timestamp`, `IdParams`, `PaginationQuery`, `Paginated()`, `ErrorResponse`
- `src/health.ts`: `HealthResponse`
- `src/<domain>.ts`: one file per feature area, re-exported from `src/index.ts`
- `src/example.ts`: the `Item` CRUD set to copy. Delete it once the first real domain exists.

## Conventions

- **Schema and type share a name**: `export const Todo = z.object(...)` and `export type Todo = z.infer<typeof Todo>`.
- **One schema per endpoint part**: `TodoParams`, `ListTodosQuery`, `CreateTodoBody`, `UpdateTodoBody`, `TodoResponse`.
- **Derive, don't duplicate**: `CreateTodoBody = Todo.omit({ id: true, createdAt: true })`, `UpdateTodoBody = CreateTodoBody.partial()`.
- **Dates are ISO strings** (`Timestamp`, i.e. `z.iso.datetime()`), because JSON has no `Date`. Convert at the edges.
- **Query strings are text**: use `z.coerce.number()` / `z.stringbool()` for non-string query params.
- **Errors**: the API answers every 4xx / 5xx with `ErrorResponse` (`{ statusCode, error, message, issues? }`), and the web API wrapper parses it to show a toast.
- **Zod is the only dependency, and nothing is imported from apps**, so the package loads in both the browser and Node.
- **Relative imports have no extension** (`./common`), as the `@repo/typescript-config` presets expect.
