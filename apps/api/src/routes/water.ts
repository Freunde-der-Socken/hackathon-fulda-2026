import {
  AwardWaterBody,
  ErrorResponse,
  IdParams,
  SilentPhase,
  WATER_RULES,
  WaterEvent,
  WaterQuery,
  WaterSummary,
} from '@repo/contracts';
import { and, count, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { classes, sensorReadings, silentPhases, waterEvents } from '../db/schema';

const toEvent = (row: typeof waterEvents.$inferSelect): WaterEvent => ({
  id: row.id,
  classId: row.classId,
  amount: row.amount,
  source: row.source as WaterEvent['source'],
  createdAt: row.createdAt.toISOString(),
});

const toPhase = (row: typeof silentPhases.$inferSelect): SilentPhase => ({
  id: row.id,
  classId: row.classId,
  startedAt: row.startedAt.toISOString(),
  endedAt: row.endedAt?.toISOString() ?? null,
  quietShare: row.quietShare,
  water: row.water,
});

// Water the class earns (docs/concept.md, "Earning water"): teacher buttons and silent phases
export const water: FastifyPluginAsyncZod = async (app) => {
  async function assertClass(id: string) {
    const [row] = await app.db.select({ id: classes.id }).from(classes).where(eq(classes.id, id));
    if (!row) throw app.httpErrors.notFound(`Unknown class ${id}`);
  }

  app.get(
    '/classes/:id/water',
    {
      schema: {
        params: IdParams,
        querystring: WaterQuery,
        response: { 200: WaterSummary, 404: ErrorResponse },
      },
    },
    async (request) => {
      const classId = request.params.id;
      const { from, to } = request.query;
      await assertClass(classId);
      const [events, [active]] = await Promise.all([
        app.db
          .select()
          .from(waterEvents)
          .where(
            and(
              eq(waterEvents.classId, classId),
              from ? gte(waterEvents.createdAt, new Date(from)) : undefined,
              to ? lte(waterEvents.createdAt, new Date(to)) : undefined,
            ),
          )
          .orderBy(desc(waterEvents.createdAt)),
        app.db
          .select()
          .from(silentPhases)
          .where(and(eq(silentPhases.classId, classId), isNull(silentPhases.endedAt))),
      ]);
      return {
        classId,
        total: events.reduce((sum, e) => sum + e.amount, 0),
        events: events.map(toEvent),
        activeSilentPhase: active ? toPhase(active) : null,
      };
    },
  );

  app.post(
    '/classes/:id/water',
    {
      schema: {
        params: IdParams,
        body: AwardWaterBody,
        response: { 201: WaterEvent, 404: ErrorResponse },
      },
    },
    async (request, reply) => {
      const classId = request.params.id;
      const { amount } = request.body;
      await assertClass(classId);
      const [row] = await app.db
        .insert(waterEvents)
        .values({ classId, amount: WATER_RULES[amount], source: amount })
        .returning();
      if (!row) throw new Error('Insert into water_events returned no row');
      request.log.info({ classId, amount: row.amount }, 'Water awarded');
      return reply.code(201).send(toEvent(row));
    },
  );

  app.post(
    '/classes/:id/silent-phases',
    {
      schema: {
        params: IdParams,
        response: { 201: SilentPhase, 404: ErrorResponse, 409: ErrorResponse },
      },
    },
    async (request, reply) => {
      const classId = request.params.id;
      await assertClass(classId);
      // The partial unique index allows one running phase per class
      const [row] = await app.db
        .insert(silentPhases)
        .values({ classId })
        .onConflictDoNothing()
        .returning();
      if (!row) throw app.httpErrors.conflict('A silent phase is already running for this class');
      return reply.code(201).send(toPhase(row));
    },
  );

  app.post(
    '/silent-phases/:id/stop',
    {
      schema: {
        params: IdParams,
        response: { 200: SilentPhase, 404: ErrorResponse, 409: ErrorResponse },
      },
    },
    async (request) => {
      const { id } = request.params;
      const phase = await app.db.transaction(async (tx) => {
        const [running] = await tx
          .select()
          .from(silentPhases)
          .where(eq(silentPhases.id, id))
          .for('update');
        if (!running) throw app.httpErrors.notFound(`Unknown silent phase ${id}`);
        if (running.endedAt) throw app.httpErrors.conflict('The silent phase has already ended');

        const endedAt = new Date();
        // Share of the noise readings in the phase that were quiet. Phones send one per second,
        // so this is close to the share of the time.
        const [noise] = await tx
          .select({
            all: count(),
            quiet: count(
              sql`case when ${sensorReadings.value} <= ${WATER_RULES.quietDb} then 1 end`,
            ),
          })
          .from(sensorReadings)
          .where(
            and(
              eq(sensorReadings.classId, running.classId),
              eq(sensorReadings.unit, 'dB'),
              gte(sensorReadings.recordedAt, running.startedAt),
              lte(sensorReadings.recordedAt, endedAt),
            ),
          );
        const quietShare = noise?.all ? noise.quiet / noise.all : null;
        const earned =
          quietShare === null ? 0 : Math.round(WATER_RULES.silentPhaseMax * quietShare);

        const [ended] = await tx
          .update(silentPhases)
          .set({ endedAt, quietShare, water: earned })
          .where(eq(silentPhases.id, id))
          .returning();
        if (!ended) throw new Error('Update of silent_phases returned no row');
        if (earned > 0) {
          await tx.insert(waterEvents).values({
            classId: running.classId,
            amount: earned,
            source: 'silent-phase',
            silentPhaseId: id,
            createdAt: endedAt,
          });
        }
        return ended;
      });
      request.log.info(
        { classId: phase.classId, quietShare: phase.quietShare, water: phase.water },
        'Silent phase ended',
      );
      return toPhase(phase);
    },
  );
};
