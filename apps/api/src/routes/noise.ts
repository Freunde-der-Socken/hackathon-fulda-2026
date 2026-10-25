import {
  ErrorResponse,
  IdParams,
  NOISE_RULES,
  NoiseScore,
  noiseScore,
  type WorkMode,
} from '@repo/contracts';
import { and, eq, gte, sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { classes, plantClasses, plants, sensorReadings } from '../db/schema';
import { createScoreSmoother } from '../lib/score-smoother';

// The noise score the plant polls every second (docs/concept.md, "Noise score")
export const noise: FastifyPluginAsyncZod = async (app) => {
  const smooth = createScoreSmoother();

  // Median of the class's noise readings in the window, as 1–100 for the work mode. Only the
  // first reading per sensor and second counts, so a client that floods readings can't outvote
  // the others. The window uses receivedAt, since devices can send any recordedAt.
  async function targetScore(classId: string, workMode: WorkMode) {
    const since = new Date(Date.now() - NOISE_RULES.windowSeconds * 1000);
    const second = sql`date_trunc('second', ${sensorReadings.receivedAt})`;
    const perSecond = app.db
      .selectDistinctOn([sensorReadings.sensorId, second], { value: sensorReadings.value })
      .from(sensorReadings)
      .where(
        and(
          eq(sensorReadings.classId, classId),
          eq(sensorReadings.unit, 'dB'),
          gte(sensorReadings.receivedAt, since),
        ),
      )
      .orderBy(sensorReadings.sensorId, second, sensorReadings.receivedAt)
      .as('per_second');
    const [row] = await app.db
      .select({
        median: sql<number | null>`percentile_cont(0.5) within group (order by ${perSecond.value})`,
      })
      .from(perSecond);
    return row?.median == null ? null : noiseScore(row.median, workMode);
  }

  app.get(
    '/plants/:id/noise-score',
    { schema: { params: IdParams, response: { 200: NoiseScore, 404: ErrorResponse } } },
    async (request) => {
      const plantId = request.params.id;
      const [row] = await app.db
        .select({ classId: plantClasses.classId, workMode: classes.workMode })
        .from(plants)
        .leftJoin(plantClasses, eq(plantClasses.plantId, plants.id))
        .leftJoin(classes, eq(classes.id, plantClasses.classId))
        .where(eq(plants.id, plantId));
      if (!row) throw app.httpErrors.notFound(`Unknown plant ${plantId}`);
      if (!row.classId || !row.workMode) {
        return { plantId, classId: row.classId, workMode: null, noiseScore: null };
      }

      const workMode = row.workMode as WorkMode;
      const target = await targetScore(row.classId, workMode);
      return { plantId, classId: row.classId, workMode, noiseScore: smooth(row.classId, target) };
    },
  );
};
