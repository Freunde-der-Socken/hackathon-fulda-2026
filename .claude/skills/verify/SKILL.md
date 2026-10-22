---
name: verify
description: Run the CI gate (format, lint, typecheck, build) plus the health check before calling a task done or opening a PR
---

# Verify

1. Run `pnpm fmt:check && pnpm lint && pnpm typecheck && pnpm build`. This is what CI runs. If `fmt:check` fails, run `pnpm fmt` and check again. Fix every error and keep warnings at zero.
2. If `packages/contracts/src/mqtt/` changed, run `pnpm --filter @repo/contracts schemas` and commit the regenerated `packages/contracts/schemas/` (CI fails on a diff).
3. Run `pnpm test` when the change touches code that has tests (not part of CI).
4. If the change affects the API or the web app, start `pnpm dev` and open `http://localhost:5173/api/health`: it should report `status: "ok"` (`db` and `mqtt` are `ok` with `pnpm infra:up`, `disabled` without it). For UI changes, also look at the page at phone width.
5. Report what passed and what you could not run.
