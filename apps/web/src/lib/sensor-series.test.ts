import type { SensorReading } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { groupReadings, markOutliers, niceTicks, splitAtGaps, valueDomain } from './sensor-series';

const at = (s: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, s)).toISOString();

const reading = (sensorId: string, value: number, unit: string, s: number): SensorReading => ({
  sensorId,
  plantId: '6f1c0b6e-2a4d-4c43-9a8e-0d6a2f1b7c11',
  classId: '3b8e5d2a-7c1f-4e9b-8a6d-5f2c1e0b9a44',
  value,
  unit,
  recordedAt: at(s),
  receivedAt: at(s),
});

describe('markOutliers', () => {
  it('flags an isolated failed read', () => {
    const values = [24.2, 24.8, 24.4, 0.3, 24.1, 24.6, 24.3];
    expect(markOutliers(values)).toEqual([false, false, false, true, false, false, false]);
  });

  it('keeps a run of real values, like the light switched off', () => {
    const values = [2400, 2410, 2390, 0, 0, 0, 0, 0, 0, 2405, 2395, 2400];
    expect(markOutliers(values).some(Boolean)).toBe(false);
  });

  it('keeps small changes in a flat series', () => {
    expect(markOutliers([22, 22, 22, 23, 22, 21, 21]).some(Boolean)).toBe(false);
  });
});

describe('groupReadings', () => {
  it('groups by unit, then sensor, sorted by time', () => {
    const groups = groupReadings([
      reading('t2', 21, 'C', 2),
      reading('t1', 20, 'C', 1),
      reading('h1', 40, '%', 3),
      reading('t1', 19, 'C', 0),
    ]);
    expect(groups.map((g) => g.unit)).toEqual(['%', 'C']);
    expect(groups[1]!.series.map((s) => s.sensorId)).toEqual(['t1', 't2']);
    expect(groups[1]!.series[0]!.points.map((p) => p.value)).toEqual([19, 20]);
  });
});

describe('splitAtGaps', () => {
  it('breaks the line at a long pause', () => {
    const points = [0, 2, 4, 6, 600, 602].map((s) => ({ t: s * 1000, value: 1, outlier: false }));
    expect(splitAtGaps(points).map((run) => run.length)).toEqual([4, 2]);
  });
});

describe('scales', () => {
  it('picks round ticks', () => {
    expect(niceTicks(21.3, 24.9)).toEqual([22, 23, 24]);
    expect(niceTicks(0, 2500)).toEqual([0, 1000, 2000]);
  });

  it('pads the domain and never returns zero height', () => {
    expect(valueDomain([10, 20])).toEqual([9, 21]);
    expect(valueDomain([22, 22])).toEqual([20.9, 23.1]);
  });
});
