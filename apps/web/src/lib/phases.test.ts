import { describe, expect, it } from 'vitest';
import { nextPhaseStart, phaseStart, phaseStarts, waterPerPhase } from './phases';

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

describe('phaseStarts', () => {
  const at = new Date(2026, 9, 25, 14, 30);

  it('lists weeks oldest first, ending with the current one', () => {
    const weeks = phaseStarts('week', 3, at);
    expect(weeks).toEqual([new Date(2026, 9, 5), new Date(2026, 9, 12), new Date(2026, 9, 19)]);
  });

  it('lists days in whole weeks from a Monday', () => {
    const days = phaseStarts('day', 14, at);
    expect(days).toHaveLength(14);
    expect(days[0]).toEqual(new Date(2026, 9, 12));
    expect(days.at(-1)).toEqual(new Date(2026, 9, 25));
  });
});

describe('waterPerPhase', () => {
  it('sums the water per phase and ignores events outside', () => {
    const starts = phaseStarts('day', 7, new Date(2026, 9, 25, 14, 30));
    const events = [
      { amount: 2, createdAt: new Date(2026, 9, 19, 9).toISOString() },
      { amount: 5, createdAt: new Date(2026, 9, 19, 23, 59).toISOString() },
      { amount: 3, createdAt: new Date(2026, 9, 25, 8).toISOString() },
      { amount: 9, createdAt: new Date(2026, 9, 18, 12).toISOString() },
    ];
    expect(waterPerPhase(events, 'day', starts)).toEqual([7, 0, 0, 0, 0, 0, 3]);
    expect(waterPerPhase(events, 'week', phaseStarts('week', 2, starts[0]))).toEqual([9, 10]);
  });
});
