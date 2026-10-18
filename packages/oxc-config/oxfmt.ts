import { defineConfig } from 'oxfmt';

export default defineConfig({
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
  vueIndentScriptAndStyle: false,
  ignorePatterns: ['**/dist/**', 'pnpm-lock.yaml'],
});
