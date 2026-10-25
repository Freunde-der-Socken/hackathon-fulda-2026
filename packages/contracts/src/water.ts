import { z } from 'zod';
import { Id, Timestamp } from './common';

/**
 * PLACEHOLDERS until the team decides (open in docs/concept.md): the water amounts and the level
 * that counts as quiet. Change them here, the API and the web app both read them.
 */
export const WATER_RULES = {
  /** "kleine Menge" button. */
  small: 2,
  /** "große Menge" button. */
  large: 5,
  /** A silent phase that stays quiet the whole time. Less quiet earns the same share of it. */
  silentPhaseMax: 10,
  /** A noise reading (unit `dB`) at or below this counts as quiet. */
  quietDb: 55,
  /** Water a plant needs to bloom fully in one measuring phase. Growth resets every phase. */
  fullBloom: { day: 20, week: 80 },
} as const;

/** Where water came from: a teacher button or a silent phase. */
export const WaterSource = z.enum(['small', 'large', 'silent-phase']);
export type WaterSource = z.infer<typeof WaterSource>;

export const WaterEvent = z.object({
  id: Id,
  classId: Id,
  amount: z.number().int().nonnegative(),
  source: WaterSource,
  createdAt: Timestamp,
});
export type WaterEvent = z.infer<typeof WaterEvent>;

/** Body of `POST /api/classes/:id/water`: the teacher taps a button. */
export const AwardWaterBody = z.object({ amount: z.enum(['small', 'large']) });
export type AwardWaterBody = z.infer<typeof AwardWaterBody>;

/**
 * A silent work phase. It runs until the teacher stops it (`endedAt` null while running). On stop
 * the API sets `quietShare` from the class's noise readings in between and awards `water`.
 * `quietShare` stays null when there were no noise readings, and then no water is awarded.
 */
export const SilentPhase = z.object({
  id: Id,
  classId: Id,
  startedAt: Timestamp,
  endedAt: Timestamp.nullable(),
  quietShare: z.number().min(0).max(1).nullable(),
  water: z.number().int().nonnegative().nullable(),
});
export type SilentPhase = z.infer<typeof SilentPhase>;

/**
 * `GET /api/classes/:id/water`. The measuring phase (day or week) is a time window, so the caller
 * passes its start as `from`. Without `from` and `to`, all water counts.
 */
export const WaterQuery = z.object({ from: Timestamp.optional(), to: Timestamp.optional() });
export type WaterQuery = z.infer<typeof WaterQuery>;

export const WaterSummary = z.object({
  classId: Id,
  /** Sum of `events`. */
  total: z.number().int().nonnegative(),
  /** Newest first. */
  events: z.array(WaterEvent),
  activeSilentPhase: SilentPhase.nullable(),
});
export type WaterSummary = z.infer<typeof WaterSummary>;

/**
 * Body of `POST /water` on the watering can's own HTTP server. The API sends it whenever a class
 * earns water, so the can's display stays current.
 *
 * PLACEHOLDER until the hardware team decides (YouTrack GREEN-42): the fields, the unit and range
 * of the level on the display, and how a can is matched to a class. `total` is all water of the
 * class so far, like `GET /api/classes/:id/water` without `from`.
 */
export const WateringCanUpdate = z.object({
  classId: Id,
  total: z.number().int().nonnegative(),
});
export type WateringCanUpdate = z.infer<typeof WateringCanUpdate>;
