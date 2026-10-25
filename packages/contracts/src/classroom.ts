import { z } from 'zod';
import { Id, Timestamp } from './common';

const Name = z.string().trim().min(1).max(80);

/** A school class. `plantId` is its active plant, or null when it has none. */
export const SchoolClass = z.object({
  id: Id,
  name: z.string(),
  plantId: Id.nullable(),
  createdAt: Timestamp,
});
export type SchoolClass = z.infer<typeof SchoolClass>;

export const CreateSchoolClassBody = z.object({ name: Name });
export type CreateSchoolClassBody = z.infer<typeof CreateSchoolClassBody>;

export const SchoolClassList = z.object({ items: z.array(SchoolClass) });
export type SchoolClassList = z.infer<typeof SchoolClassList>;

/** A physical plant. Its `id` is the `plantId` devices send. `classId` is null while unassigned. */
export const Plant = z.object({
  id: Id,
  name: z.string(),
  classId: Id.nullable(),
  createdAt: Timestamp,
});
export type Plant = z.infer<typeof Plant>;

export const CreatePlantBody = z.object({ name: Name });
export type CreatePlantBody = z.infer<typeof CreatePlantBody>;

export const PlantList = z.object({ items: z.array(Plant) });
export type PlantList = z.infer<typeof PlantList>;

/**
 * Body of `PUT /api/plants/:id/class`. Both the plant and the class must be free: the API answers
 * 409 instead of moving an existing assignment, so disconnect first (`DELETE` on the same path).
 */
export const AssignPlantBody = z.object({ classId: Id });
export type AssignPlantBody = z.infer<typeof AssignPlantBody>;
