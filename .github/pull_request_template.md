Closes #

## What changed

## How to test

## Checklist

- [ ] CI is green (`pnpm fmt:check && pnpm lint && pnpm typecheck && pnpm build`)
- [ ] Shared schemas and types live in `@repo/contracts`
- [ ] Migrations generated and committed (`pnpm --filter @repo/api db:generate`), if the DB schema changed
- [ ] Screenshot added, if the UI changed
