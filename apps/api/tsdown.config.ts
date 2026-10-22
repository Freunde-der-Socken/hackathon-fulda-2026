import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/server.ts'],
  format: 'esm',
  platform: 'node',
  // emit dist/server.js (the package is "type": "module") instead of .mjs
  fixedExtension: false,
  // @repo/contracts ships raw .ts, so it has to be bundled
  deps: { alwaysBundle: [/^@repo\//] },
});
