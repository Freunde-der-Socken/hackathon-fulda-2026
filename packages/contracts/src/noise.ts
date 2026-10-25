import { z } from 'zod';
import { Id } from './common';

/** How loud a class may be right now. The teacher sets it per class. */
export const WorkMode = z.enum(['silent', 'discussion', 'group', 'test']);
export type WorkMode = z.infer<typeof WorkMode>;

/**
 * How noise readings become the 1–100 noise score the plant shows (docs/concept.md, "Noise
 * score"). Change them here, the API and the web app both read them.
 */
export const NOISE_RULES = {
  /** At `minDb` and below the score is 1, at `maxDb` and above 100, linear in between. */
  modes: {
    /** Stillarbeit */
    silent: { minDb: 40, maxDb: 55 },
    /** Unterrichtsgespräch */
    discussion: { minDb: 50, maxDb: 60 },
    /** Gruppenarbeit */
    group: { minDb: 60, maxDb: 80 },
    /** For trying out the plant: a quiet room is low, clapping or shouting reaches the top */
    test: { minDb: 30, maxDb: 90 },
  },
  /** The target score comes from the median of the class's noise readings in this window. */
  windowSeconds: 10,
  /** The score the plant gets moves toward the target by at most this much per second. */
  maxStepPerSecond: 3,
  /** Without noise readings the score holds this long, then it becomes null. */
  holdSeconds: 60,
} as const;

/** Maps a dB level to 1–100 for the work mode. */
export function noiseScore(db: number, mode: WorkMode): number {
  const { minDb, maxDb } = NOISE_RULES.modes[mode];
  const share = (db - minDb) / (maxDb - minDb);
  return Math.round(1 + 99 * Math.min(Math.max(share, 0), 1));
}

const NoiseScoreValue = z.number().int().min(1).max(100);

/**
 * `GET /api/plants/:id/noise-score`, which the plant polls every second. `noiseScore` is null when
 * the plant has no class or its class sent no noise readings for a while: keep the last position.
 */
export const NoiseScore = z.object({
  plantId: Id,
  classId: Id.nullable(),
  workMode: WorkMode.nullable(),
  noiseScore: NoiseScoreValue.nullable(),
});
export type NoiseScore = z.infer<typeof NoiseScore>;

/** Body of `PUT /api/classes/:id/work-mode`. */
export const SetWorkModeBody = z.object({ workMode: WorkMode });
export type SetWorkModeBody = z.infer<typeof SetWorkModeBody>;
