import { describe, expect, it } from 'vitest';
import { createScoreSmoother } from './score-smoother';

function setup() {
  let t = 0;
  const smooth = createScoreSmoother(() => t);
  const after = (seconds: number) => (t += seconds * 1000);
  return { smooth, after };
}

describe('createScoreSmoother', () => {
  it('starts at the first target', () => {
    const { smooth } = setup();
    expect(smooth('a', 80)).toBe(80);
  });

  it('moves at most 3 points per second', () => {
    const { smooth, after } = setup();
    smooth('a', 100);
    after(1);
    expect(smooth('a', 1)).toBe(97);
    after(2);
    expect(smooth('a', 1)).toBe(91);
    after(0.5);
    expect(smooth('a', 1)).toBe(90);
    after(100);
    expect(smooth('a', 1)).toBe(1);
  });

  it('keeps classes apart', () => {
    const { smooth, after } = setup();
    smooth('a', 100);
    smooth('b', 1);
    after(1);
    expect(smooth('a', 1)).toBe(97);
    expect(smooth('b', 100)).toBe(4);
  });

  it('holds without readings, then returns null', () => {
    const { smooth, after } = setup();
    expect(smooth('a', null)).toBeNull();
    smooth('a', 50);
    after(30);
    expect(smooth('a', null)).toBe(50);
    after(31);
    expect(smooth('a', null)).toBeNull();
  });

  it('does not jump when readings come back after a hold', () => {
    const { smooth, after } = setup();
    smooth('a', 50);
    after(30);
    smooth('a', null);
    after(1);
    expect(smooth('a', 100)).toBe(53);
  });
});
