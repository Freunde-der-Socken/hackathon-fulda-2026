# @repo/contracts

Zod schemas and inferred types shared by `apps/web` and `apps/api`, imported as TypeScript source (no build step).

| File           | Contains                                                                               |
| -------------- | -------------------------------------------------------------------------------------- |
| `classroom.ts` | `SchoolClass`, `Plant` and the bodies to create them and to assign a plant to a class  |
| `common.ts`    | `Id`, `Timestamp`, `IdParams`, `PaginationQuery`, `Paginated()`, `ErrorResponse`       |
| `demo.ts`      | `DEMO_PLANT_ID`, `DEMO_CLASS_ID`: the plant mapping the API seed always creates        |
| `noise.ts`     | `WorkMode`, `NOISE_RULES` (dB ranges, window, smoothing), `noiseScore()`, `NoiseScore` |
| `water.ts`     | `WATER_RULES` (placeholder amounts), `WaterEvent`, `SilentPhase`, `WaterSummary`       |
| `health.ts`    | `HealthResponse`                                                                       |
| `<domain>.ts`  | One file per feature area, re-exported from `index.ts`                                 |

```ts
export const Todo = z.object({ id: Id, title: z.string(), createdAt: Timestamp });
export type Todo = z.infer<typeof Todo>;
export const CreateTodoBody = Todo.omit({ id: true, createdAt: true });
export type CreateTodoBody = z.infer<typeof CreateTodoBody>;
```

## JSON Schema for firmware

Firmware (C/C++, MicroPython) can't import Zod, so every schema is also generated as JSON Schema (draft 2020-12) into [`schemas/`](schemas/). The files are committed, so you can read them on GitHub.

There is one file per schema exported from `index.ts` (params, query, bodies, responses), named `http.<Name>.schema.json`.

Use them as the reference for request and response structs, or to validate test bodies, e.g. `check-jsonschema --schemafile schemas/http.<Name>.schema.json body.json`.

After changing a Zod schema, run `pnpm --filter @repo/contracts schemas` and commit the result. CI regenerates the files and fails on any diff. Don't edit them by hand; they are excluded from `pnpm fmt`.

## Conventions

- **Schema and type share a name.** Name endpoint schemas `TodoParams`, `ListTodosQuery`, `CreateTodoBody`, `UpdateTodoBody`, `TodoResponse`.
- **Derive, don't duplicate**, with `.omit()`, `.partial()`, `.extend()`.
- **Dates are ISO strings** (`Timestamp`), since JSON has no `Date`.
- **Every API error is an `ErrorResponse`**, which the web API wrapper parses for its toast.
- **Only Zod, no imports from apps**, so the package runs in the browser and in Node.
