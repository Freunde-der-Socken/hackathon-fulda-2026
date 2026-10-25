import { describe, expect, it } from 'vitest';
import { CO2_BAD, CO2_GOOD, co2Color, DEMO_ROOM, estimateCo2 } from './co2';

// A full hour, so a lesson starts here with the demo room
const HOUR = Date.UTC(2026, 9, 26, 8);
const at = (minutes: number) => new Date(HOUR + minutes * 60_000);
const ppm = (minutes: number) => estimateCo2(at(minutes));

describe('estimateCo2', () => {
  it('matches the closed form of the mass balance during a lesson', () => {
    const { outdoor, people, perPerson, volume, airChangesLesson: ach } = DEMO_ROOM;
    const steady = outdoor + (people * perPerson * 1e6) / (volume * ach);
    const start = ppm(0);
    expect(ppm(20)).toBeCloseTo(steady + (start - steady) * Math.exp((-ach * 20) / 60), 6);
  });

  it('rises during the lesson and falls during the break', () => {
    expect(ppm(10)).toBeGreaterThan(ppm(0));
    expect(ppm(44)).toBeGreaterThan(ppm(30));
    expect(ppm(50)).toBeLessThan(ppm(45));
    expect(ppm(59)).toBeLessThan(ppm(50));
  });

  it('is continuous at the end of the lesson and of the cycle', () => {
    expect(ppm(44.999)).toBeCloseTo(ppm(45), 0);
    expect(ppm(59.999)).toBeCloseTo(ppm(60), 0);
  });

  it('repeats every cycle', () => {
    expect(ppm(17 + 3 * 60)).toBeCloseTo(ppm(17), 6);
  });

  it('starts a lesson in good air and ends it in bad air with the demo values', () => {
    expect(ppm(0)).toBeLessThan(CO2_GOOD);
    expect(ppm(0)).toBeGreaterThan(DEMO_ROOM.outdoor);
    expect(ppm(45)).toBeGreaterThan(CO2_BAD);
    expect(ppm(45)).toBeLessThan(3000);
  });

  it('stays at the outdoor level in an empty room', () => {
    const empty = { ...DEMO_ROOM, people: 0 };
    for (const minutes of [0, 20, 50]) {
      expect(estimateCo2(at(minutes), empty)).toBeCloseTo(DEMO_ROOM.outdoor, 6);
    }
  });

  it('handles times before the epoch', () => {
    expect(estimateCo2(new Date(-60 * 60_000 + 20 * 60_000))).toBeCloseTo(ppm(20), 6);
  });
});

describe('co2Color', () => {
  it('is green up to the good level', () => {
    expect(co2Color(420)).toEqual({ r: 0, g: 255, b: 0 });
    expect(co2Color(CO2_GOOD)).toEqual({ r: 0, g: 255, b: 0 });
  });

  it('is yellow halfway and red from the bad level', () => {
    expect(co2Color((CO2_GOOD + CO2_BAD) / 2)).toEqual({ r: 255, g: 255, b: 0 });
    expect(co2Color(CO2_BAD)).toEqual({ r: 255, g: 0, b: 0 });
    expect(co2Color(5000)).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('shifts gradually from green to red', () => {
    const colors = [1100, 1300, 1500, 1700, 1900].map(co2Color);
    // Red rises to its maximum first, then green falls
    const ordered = colors.map(({ r, g }) => r - g);
    expect(ordered).toEqual(ordered.toSorted((a, b) => a - b));
    expect(new Set(ordered.map(String)).size).toBe(colors.length);
  });
});
