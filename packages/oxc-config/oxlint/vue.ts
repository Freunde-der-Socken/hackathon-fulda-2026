import { defineConfig } from 'oxlint';
import base from './base.ts';

export default defineConfig({
  ...base,
  plugins: [...base.plugins!, 'vue'],
  env: { ...base.env, browser: true },
  rules: {
    ...base.rules,
  },
});
