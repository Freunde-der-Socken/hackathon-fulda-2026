// Example CRUD: the round trip from Zod contract to Drizzle to Postgres. Copy it for real features.
import {
  CreateItemBody,
  ItemParams,
  ItemResponse,
  ListItemsQuery,
  ListItemsResponse,
  UpdateItemBody,
} from '@repo/contracts';
import { count, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { items, type ItemRow } from '../db/schema';

const toItem = (row: ItemRow): ItemResponse => ({ ...row, createdAt: row.createdAt.toISOString() });

export const itemRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/items',
    { schema: { querystring: ListItemsQuery, response: { 200: ListItemsResponse } } },
    async (request) => {
      const { cursor, limit, done } = request.query;
      const where = done === undefined ? undefined : eq(items.done, done);
      // The cursor is just an offset, which is fine for a demo. Switch to keyset pagination
      // (createdAt + id) before this has to handle a lot of rows.
      const offset = Number(cursor ?? 0) || 0;
      const [rows, [totals]] = await Promise.all([
        app.db
          .select()
          .from(items)
          .where(where)
          .orderBy(desc(items.createdAt), items.id)
          .limit(limit)
          .offset(offset),
        app.db.select({ total: count() }).from(items).where(where),
      ]);
      const total = totals?.total ?? 0;
      const next = offset + rows.length;
      return { items: rows.map(toItem), total, nextCursor: next < total ? String(next) : null };
    },
  );

  app.get(
    '/items/:id',
    { schema: { params: ItemParams, response: { 200: ItemResponse } } },
    async (request) => {
      const [row] = await app.db.select().from(items).where(eq(items.id, request.params.id));
      if (!row) throw app.httpErrors.notFound('Item not found');
      return toItem(row);
    },
  );

  app.post(
    '/items',
    { schema: { body: CreateItemBody, response: { 201: ItemResponse } } },
    async (request, reply) => {
      const [row] = await app.db.insert(items).values(request.body).returning();
      if (!row) throw new Error('Insert returned no row');
      return reply.status(201).send(toItem(row));
    },
  );

  app.patch(
    '/items/:id',
    { schema: { params: ItemParams, body: UpdateItemBody, response: { 200: ItemResponse } } },
    async (request) => {
      const { id } = request.params;
      // An empty patch would make an empty SET clause, so just return the current row
      const query =
        Object.keys(request.body).length === 0
          ? app.db.select().from(items).where(eq(items.id, id))
          : app.db.update(items).set(request.body).where(eq(items.id, id)).returning();
      const [row] = await query;
      if (!row) throw app.httpErrors.notFound('Item not found');
      return toItem(row);
    },
  );

  app.delete(
    '/items/:id',
    { schema: { params: ItemParams, response: { 204: z.null() } } },
    async (request, reply) => {
      const deleted = await app.db
        .delete(items)
        .where(eq(items.id, request.params.id))
        .returning({ id: items.id });
      if (deleted.length === 0) throw app.httpErrors.notFound('Item not found');
      return reply.status(204).send(null);
    },
  );
};
