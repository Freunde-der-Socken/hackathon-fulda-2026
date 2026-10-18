import { defineConfig } from 'oxlint';
import base from './base.ts';

export default defineConfig({
  ...base,
  plugins: [...base.plugins!, 'node', 'promise'],
  env: { ...base.env, node: true },
  rules: {
    ...base.rules,
    'no-console': 'error', // use fastify.log / request.log instead
    'promise/no-return-wrap': 'error',
  },
});
