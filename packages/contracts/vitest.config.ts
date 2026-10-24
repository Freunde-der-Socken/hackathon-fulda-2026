import { defineConfig } from 'vitest/config';

export default defineConfig({
  // passWithNoTests: `pnpm test` stays green until the package has tests again
  test: { environment: 'node', include: ['src/**/*.test.ts'], passWithNoTests: true },
});
