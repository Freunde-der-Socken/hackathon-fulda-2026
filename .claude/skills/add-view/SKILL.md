---
name: add-view
description: Add a web view with its route and navigation entry, mobile first
---

# Add a view

1. Create `apps/web/src/views/<Name>View.vue` (`<script setup lang="ts">`). Mobile first: design for phone width and add `md:` styles for the sidebar layout (bottom tabs below `md`).
2. Add the route in `apps/web/src/router/index.ts`, like the existing ones. This file spans several lines, so resolve merge conflicts there by hand.
3. Add the navigation entry in `apps/web/src/lib/navigation.ts`, one entry per line. Icons come from `@lucide/vue`.
4. Load data through `apiGet` from `src/lib/api.ts` with a contract schema, or `useLiveTopic` for MQTT data. Reuse components from `src/components/ui` and Tailwind classes (CSS-first, no `tailwind.config.js`).
5. Add a test next to the view (`<Name>View.test.ts`, see `NotFoundView.test.ts`).
6. Run the `verify` skill and check the page at phone width.
