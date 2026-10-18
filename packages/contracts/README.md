# @repo/contracts

Zod schemas and inferred types shared by `apps/web` and `apps/api`, imported as TypeScript source (no build step).

| File          | Contains                                                                         |
| ------------- | -------------------------------------------------------------------------------- |
| `common.ts`   | `Id`, `Timestamp`, `IdParams`, `PaginationQuery`, `Paginated()`, `ErrorResponse` |
| `health.ts`   | `HealthResponse`                                                                 |
| `example.ts`  | `Item` CRUD set to copy; delete once the first real domain exists                |
| `<domain>.ts` | One file per feature area, re-exported from `index.ts`                           |

```ts
export const Todo = z.object({ id: Id, title: z.string(), createdAt: Timestamp });
export type Todo = z.infer<typeof Todo>;
export const CreateTodoBody = Todo.omit({ id: true, createdAt: true });
export type CreateTodoBody = z.infer<typeof CreateTodoBody>;
```

## Conventions

- **Schema and type share a name.** Name endpoint schemas `TodoParams`, `ListTodosQuery`, `CreateTodoBody`, `UpdateTodoBody`, `TodoResponse`.
- **Derive, don't duplicate**, with `.omit()`, `.partial()`, `.extend()`.
- **Dates are ISO strings** (`Timestamp`), since JSON has no `Date`.
- **Every API error is an `ErrorResponse`**, which the web API wrapper parses for its toast.
- **Only Zod, no imports from apps**, so the package runs in the browser and in Node.
