import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.url().optional(),
});
export type Env = z.infer<typeof Env>;

function parseEnv(source: NodeJS.ProcessEnv): Env {
  // An empty value (`API_PORT=`) means "unset", so the default applies
  const defined = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const result = Env.safeParse(defined);
  if (!result.success) {
    // The logger isn't built yet, and a stack trace would hide the actual problem
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    process.stderr.write(`Invalid environment variables:\n${details}\n`);
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv(process.env);
