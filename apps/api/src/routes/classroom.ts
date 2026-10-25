import {
  AssignPlantBody,
  CreatePlantBody,
  CreateSchoolClassBody,
  ErrorResponse,
  IdParams,
  Plant,
  PlantList,
  SchoolClass,
  SchoolClassList,
  SetWorkModeBody,
} from '@repo/contracts';
import { asc, eq } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { classes, plantClasses, plants } from '../db/schema';

type ClassRow = typeof classes.$inferSelect & { plantId: string | null };
type PlantRow = typeof plants.$inferSelect & { classId: string | null };

const toClass = (row: ClassRow): SchoolClass => ({
  id: row.id,
  name: row.name,
  plantId: row.plantId,
  workMode: row.workMode as SchoolClass['workMode'],
  createdAt: row.createdAt.toISOString(),
});

const toPlant = (row: PlantRow): Plant => ({
  id: row.id,
  name: row.name,
  classId: row.classId,
  createdAt: row.createdAt.toISOString(),
});

// Classes and plants, and which plant a class has. Readings copy the classId when they are stored
// (see get_sensor_data.ts), so changing the assignment only affects new readings.
export const classroom: FastifyPluginAsyncZod = async (app) => {
  async function findPlant(id: string) {
    const [row] = await app.db
      .select({
        id: plants.id,
        name: plants.name,
        createdAt: plants.createdAt,
        classId: plantClasses.classId,
      })
      .from(plants)
      .leftJoin(plantClasses, eq(plantClasses.plantId, plants.id))
      .where(eq(plants.id, id));
    if (!row) throw app.httpErrors.notFound(`Unknown plant ${id}`);
    return row;
  }

  app.get('/classes', { schema: { response: { 200: SchoolClassList } } }, async () => {
    const rows = await app.db
      .select({
        id: classes.id,
        name: classes.name,
        workMode: classes.workMode,
        createdAt: classes.createdAt,
        plantId: plantClasses.plantId,
      })
      .from(classes)
      .leftJoin(plantClasses, eq(plantClasses.classId, classes.id))
      .orderBy(asc(classes.name));
    return { items: rows.map(toClass) };
  });

  app.post(
    '/classes',
    { schema: { body: CreateSchoolClassBody, response: { 201: SchoolClass } } },
    async (request, reply) => {
      const [row] = await app.db.insert(classes).values(request.body).returning();
      if (!row) throw new Error('Insert into classes returned no row');
      return reply.code(201).send(toClass({ ...row, plantId: null }));
    },
  );

  // The noise score follows the new range right away, but moves there slowly (routes/noise.ts)
  app.put(
    '/classes/:id/work-mode',
    {
      schema: {
        params: IdParams,
        body: SetWorkModeBody,
        response: { 200: SchoolClass, 404: ErrorResponse },
      },
    },
    async (request) => {
      const { id } = request.params;
      const { workMode } = request.body;
      const [row] = await app.db
        .update(classes)
        .set({ workMode })
        .where(eq(classes.id, id))
        .returning();
      if (!row) throw app.httpErrors.notFound(`Unknown class ${id}`);
      const [mapping] = await app.db
        .select({ plantId: plantClasses.plantId })
        .from(plantClasses)
        .where(eq(plantClasses.classId, id));
      request.log.info({ classId: id, workMode }, 'Work mode changed');
      return toClass({ ...row, plantId: mapping?.plantId ?? null });
    },
  );

  app.get('/plants', { schema: { response: { 200: PlantList } } }, async () => {
    const rows = await app.db
      .select({
        id: plants.id,
        name: plants.name,
        createdAt: plants.createdAt,
        classId: plantClasses.classId,
      })
      .from(plants)
      .leftJoin(plantClasses, eq(plantClasses.plantId, plants.id))
      .orderBy(asc(plants.name));
    return { items: rows.map(toPlant) };
  });

  app.post(
    '/plants',
    { schema: { body: CreatePlantBody, response: { 201: Plant } } },
    async (request, reply) => {
      const [row] = await app.db.insert(plants).values(request.body).returning();
      if (!row) throw new Error('Insert into plants returned no row');
      return reply.code(201).send(toPlant({ ...row, classId: null }));
    },
  );

  app.put(
    '/plants/:id/class',
    {
      schema: {
        params: IdParams,
        body: AssignPlantBody,
        response: { 200: Plant, 404: ErrorResponse, 409: ErrorResponse },
      },
    },
    async (request) => {
      const { classId } = request.body;
      const plant = await findPlant(request.params.id);
      if (plant.classId === classId) return toPlant(plant);

      const [schoolClass] = await app.db
        .select({ plantId: plantClasses.plantId })
        .from(classes)
        .leftJoin(plantClasses, eq(plantClasses.classId, classes.id))
        .where(eq(classes.id, classId));
      if (!schoolClass) throw app.httpErrors.notFound(`Unknown class ${classId}`);
      // What happens to an existing assignment is still open (GREEN-29), so nothing moves silently
      if (plant.classId) throw app.httpErrors.conflict('The plant already belongs to a class');
      if (schoolClass.plantId) throw app.httpErrors.conflict('The class already has a plant');

      await app.db.insert(plantClasses).values({ plantId: plant.id, classId });
      request.log.info({ plantId: plant.id, classId }, 'Plant assigned to class');
      return toPlant({ ...plant, classId });
    },
  );

  app.delete(
    '/plants/:id/class',
    { schema: { params: IdParams, response: { 200: Plant, 404: ErrorResponse } } },
    async (request) => {
      const plant = await findPlant(request.params.id);
      await app.db.delete(plantClasses).where(eq(plantClasses.plantId, plant.id));
      request.log.info({ plantId: plant.id, classId: plant.classId }, 'Plant disconnected');
      return toPlant({ ...plant, classId: null });
    },
  );
};
