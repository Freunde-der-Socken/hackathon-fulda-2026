import { z } from 'zod';

export const Id = z.uuid();
export type Id = z.infer<typeof Id>;

/** ISO 8601 string on the wire, since JSON has no `Date` type. Convert at the edges. */
export const Timestamp = z.iso.datetime();
export type Timestamp = z.infer<typeof Timestamp>;

export const IdParams = z.object({ id: Id });
export type IdParams = z.infer<typeof IdParams>;

/** Query strings arrive as text, so `limit` is coerced. */
export const PaginationQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

export const Paginated = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number().int(), nextCursor: z.string().nullable() });
export type Paginated<T> = z.infer<ReturnType<typeof Paginated<z.ZodType<T>>>>;

/** Body of every 4xx / 5xx response from the API. */
export const ErrorResponse = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  issues: z
    .array(z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() }))
    .optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
