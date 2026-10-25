import { describe, expect, it } from 'vitest';
import { noiseScore } from './noise';

describe('noiseScore', () => {
  it.each([
    [30, 1],
    [40, 1],
    [47.5, 51],
    [55, 100],
    [70, 100],
  ])('maps %d dB to %d in silent mode', (db, score) => {
    expect(noiseScore(db, 'silent')).toBe(score);
  });

  it('uses the range of the work mode', () => {
    expect(noiseScore(55, 'discussion')).toBe(51);
    expect(noiseScore(55, 'group')).toBe(1);
    expect(noiseScore(80, 'group')).toBe(100);
    expect(noiseScore(60, 'test')).toBe(51);
  });
});
