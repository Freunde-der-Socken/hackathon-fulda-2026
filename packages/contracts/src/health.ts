import { z } from 'zod';

export const HealthResponse = z.object({
  status: z.literal('ok'),
  version: z.string(),
  /** `disabled` when the API runs without DATABASE_URL */
  db: z.enum(['ok', 'down', 'disabled']),
});
export type HealthResponse = z.infer<typeof HealthResponse>;
