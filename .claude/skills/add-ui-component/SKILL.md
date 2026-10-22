---
name: add-ui-component
description: Add a shadcn-vue component and apply the cn import fix
---

# Add a shadcn-vue component

Follow the recipe "Add a shadcn-vue component" in the root `README.md` (details in `apps/web/README.md`).

```sh
cd apps/web
pnpm dlx shadcn-vue@latest add <component>
pnpm shadcn:fix   # rewrites `from "cn"` to `@/lib/utils`
pnpm remove cn    # the CLI also installs an unrelated npm package named cn
cd ../.. && pnpm fmt
```

Skip the two fix steps only if the CLI no longer writes `from "cn"`: check with `grep -rn 'from "cn"' apps/web/src`. Components land in `apps/web/src/components/ui`. Then run the `verify` skill.
