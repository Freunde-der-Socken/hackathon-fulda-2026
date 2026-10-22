---
name: add-endpoint
description: Add an API endpoint contract-first (Zod schema in contracts, Fastify route, registration, typed call from the web app)
---

# Add an API endpoint

Follow the recipe "Add an API endpoint" in the root `README.md`. In short:

1. Contract: `packages/contracts/src/<domain>.ts` with the Zod schemas (hand-written, dates as ISO strings), exported from `packages/contracts/src/index.ts`.
2. Route: `apps/api/src/routes/<domain>.ts` as a `FastifyPluginAsyncZod` using the contract schemas for `querystring`, `params`, `body` and `response`. Register it in `routes/index.ts`, one line. Errors use `ErrorResponse`. Log with `request.log`, never `console.*`.
3. Web: call it through `apiGet` / `apiPost` / `apiPatch` from `apps/web/src/lib/api.ts` with the same contract schema, from `onMounted` or an event handler.
4. Add a test next to the route (`<domain>.test.ts`, `buildApp()` and `app.inject(...)`, see `routes/health.test.ts`).
5. Run the `verify` skill.
