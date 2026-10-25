import { NOISE_RULES } from '@repo/contracts';

type State = { score: number; at: number; lastTargetAt: number };

/**
 * Moves each class's noise score toward its target by at most `NOISE_RULES.maxStepPerSecond`, so
 * the plant moves slowly instead of jumping. Advances whenever it is asked, so it needs no timer.
 * The state lives in memory: there is one API instance, and after a restart the score starts at
 * the target once.
 */
export function createScoreSmoother(now = () => Date.now()) {
  const states = new Map<string, State>();
  const holdMs = NOISE_RULES.holdSeconds * 1000;

  return (classId: string, target: number | null): number | null => {
    const t = now();
    const state = states.get(classId);
    const fresh = state && t - state.lastTargetAt <= holdMs;

    if (target === null) {
      if (!fresh) {
        states.delete(classId);
        return null;
      }
      // Hold, and restart the clock so the next target doesn't get one big step
      state.at = t;
      return Math.round(state.score);
    }
    if (!fresh) {
      states.set(classId, { score: target, at: t, lastTargetAt: t });
      return target;
    }
    const maxStep = (NOISE_RULES.maxStepPerSecond * (t - state.at)) / 1000;
    const score = state.score + Math.min(Math.max(target - state.score, -maxStep), maxStep);
    states.set(classId, { score, at: t, lastTargetAt: t });
    return Math.round(score);
  };
}
