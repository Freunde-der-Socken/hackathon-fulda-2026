// Example domain: the pattern to copy for real features. Delete it once the first real domain exists.
import { z } from 'zod';
import { Id, IdParams, Paginated, PaginationQuery, Timestamp } from './common';

export const Item = z.object({
  id: Id,
  name: z.string().min(1).max(200),
  done: z.boolean(),
  createdAt: Timestamp,
});
export type Item = z.infer<typeof Item>;

// GET /items
export const ListItemsQuery = PaginationQuery.extend({ done: z.stringbool().optional() });
export type ListItemsQuery = z.infer<typeof ListItemsQuery>;
export const ListItemsResponse = Paginated(Item);
export type ListItemsResponse = z.infer<typeof ListItemsResponse>;

// GET / PATCH / DELETE /items/:id
export const ItemParams = IdParams;
export type ItemParams = z.infer<typeof ItemParams>;

// POST /items
export const CreateItemBody = Item.omit({ id: true, createdAt: true });
export type CreateItemBody = z.infer<typeof CreateItemBody>;

// PATCH /items/:id
export const UpdateItemBody = CreateItemBody.partial();
export type UpdateItemBody = z.infer<typeof UpdateItemBody>;

export const ItemResponse = Item;
export type ItemResponse = z.infer<typeof ItemResponse>;
