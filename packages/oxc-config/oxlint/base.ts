import { defineConfig } from 'oxlint';

export default defineConfig({
  // Setting plugins replaces the defaults, which keeps react out
  plugins: ['typescript', 'unicorn', 'oxc', 'import'],
  categories: {
    correctness: 'error',
    suspicious: 'warn',
    perf: 'warn',
  },
  env: { es2024: true },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'eqeqeq': ['error', 'smart'],
    'no-console': 'warn',
    'typescript/no-explicit-any': 'warn',
    'typescript/consistent-type-imports': 'error',
    'import/no-cycle': 'off', // slow and noisy, not worth it for 25h
    'unicorn/filename-case': 'off', // Vue SFCs are PascalCase
  },
  ignorePatterns: ['**/dist/**', '**/coverage/**', '**/*.gen.ts'],
});
