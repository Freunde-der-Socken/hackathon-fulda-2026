import { describe, expect, it } from 'vitest';
import { nextPhaseStart, phaseStart } from './phases';

describe('phaseStart', () => {
  // Sunday 25 October 2026, 14:30 local time
  const at = new Date(2026, 9, 25, 14, 30);

  it('starts a day at midnight', () => {
    expect(phaseStart('day', at)).toEqual(new Date(2026, 9, 25));
  });

  it('starts a week on Monday', () => {
    expect(phaseStart('week', at)).toEqual(new Date(2026, 9, 19));
    // A Sunday still belongs to the week that started on the Monday before, a Monday starts one
    expect(phaseStart('week', new Date(2026, 9, 26, 9))).toEqual(new Date(2026, 9, 26));
    expect(phaseStart('week', new Date(2026, 9, 19, 0, 1))).toEqual(new Date(2026, 9, 19));
  });

  it('steps to the next phase', () => {
    expect(nextPhaseStart('week', new Date(2026, 9, 19))).toEqual(new Date(2026, 9, 26));
    expect(nextPhaseStart('day', new Date(2026, 9, 25))).toEqual(new Date(2026, 9, 26));
  });
});
