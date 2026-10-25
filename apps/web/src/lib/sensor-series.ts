import type { SensorReading } from '@repo/contracts';

export interface Point {
  t: number;
  value: number;
  /** Isolated spike, typically a failed sensor read (see markOutliers). */
  outlier: boolean;
}

export interface Series {
  sensorId: string;
  points: Point[];
}

/** One data type: every sensor that reports the same unit. */
export interface SensorGroup {
  unit: string;
  series: Series[];
}

const TITLES: Record<string, string> = {
  C: 'Temperature',
  '°C': 'Temperature',
  '%': 'Humidity',
  adc: 'Light (LDR)',
  lx: 'Light',
  dB: 'Noise',
  dBFS: 'Noise',
};

export const groupTitle = (unit: string) => TITLES[unit] ?? (unit || 'No unit');

/** Unit as shown next to a value. */
export const unitLabel = (unit: string) => (unit === 'C' ? '°C' : unit === 'adc' ? 'raw' : unit);

/** 12-bit ADC (ESP32) referenced to 3.3 V. */
const ADC_MAX = 4095;
const VCC = 3.3;
/** Voltage divider: LDR to 3.3 V, fixed 10 kΩ to ground, so the voltage rises with light. */
const R_FIXED = 10_000;
/** GL5528 LDR, typical datasheet values: about 15 kΩ at 10 lx, gamma 0.7. */
const R_10LX = 15_000;
const GAMMA = 0.7;

/** U_out = ADC value × 3.3 V / 4095. */
export const adcToVolts = (adc: number) => (adc * VCC) / ADC_MAX;

/** Raw LDR reading to an estimated illuminance in lux. Uncalibrated, so only roughly absolute. */
export function adcToLux(adc: number) {
  // Full scale would mean a 0 Ω LDR, so cap one step below it
  const volts = adcToVolts(Math.min(Math.max(adc, 0), ADC_MAX - 1));
  if (volts === 0) return 0;
  const rLdr = (R_FIXED * (VCC - volts)) / volts;
  return 10 * (R_10LX / rLdr) ** (1 / GAMMA);
}

const median = (values: number[]) => {
  const sorted = values.toSorted((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/**
 * Flags isolated spikes, like a DHT sensor reading 0 once: a value far from the readings both
 * before and after it (a Hampel test per side). A step or a run stays, because it matches one
 * side (the light switched off for a minute). The threshold never drops below 10 % of the series
 * median, so a flat series doesn't flag its noise.
 */
export function markOutliers(values: number[], window = 3): boolean[] {
  if (values.length < 3) return values.map(() => false);
  const floor = Math.max(0.1 * Math.abs(median(values)), 1e-9);
  const farFrom = (value: number, side: number[]) => {
    const center = median(side);
    const mad = 1.4826 * median(side.map((n) => Math.abs(n - center)));
    return Math.abs(value - center) > Math.max(3 * mad, floor);
  };
  return values.map((value, i) => {
    const sides = [values.slice(Math.max(0, i - window), i), values.slice(i + 1, i + 1 + window)];
    return sides.filter((side) => side.length).every((side) => farFrom(value, side));
  });
}

/** Groups readings by unit, then by sensor, sorted by time. Raw LDR values become lux. */
export function groupReadings(readings: SensorReading[]): SensorGroup[] {
  const byUnit = new Map<string, Map<string, { t: number; value: number }[]>>();
  for (const r of readings) {
    const isAdc = r.unit === 'adc';
    const unit = isAdc ? 'lx' : (r.unit ?? '');
    const bySensor = byUnit.get(unit) ?? new Map();
    byUnit.set(unit, bySensor);
    const points = bySensor.get(r.sensorId) ?? [];
    bySensor.set(r.sensorId, points);
    points.push({ t: Date.parse(r.recordedAt), value: isAdc ? adcToLux(r.value) : r.value });
  }
  return [...byUnit]
    .map(([unit, bySensor]) => ({
      unit,
      series: [...bySensor]
        .map(([sensorId, raw]) => {
          raw.sort((a, b) => a.t - b.t);
          const outliers = markOutliers(raw.map((p) => p.value));
          return { sensorId, points: raw.map((p, i) => ({ ...p, outlier: outliers[i]! })) };
        })
        .toSorted((a, b) => a.sensorId.localeCompare(b.sensorId)),
    }))
    .toSorted((a, b) => groupTitle(a.unit).localeCompare(groupTitle(b.unit)));
}

/** Pause after which the line breaks instead of bridging the gap. */
export function gapThreshold(points: Point[]) {
  if (points.length < 2) return Infinity;
  const steps = points.slice(1).map((p, i) => p.t - points[i]!.t);
  return Math.max(5 * median(steps), 10_000);
}

/** Splits a series into runs without long pauses, so a line never bridges a gap. */
export function splitAtGaps(points: Point[], threshold = gapThreshold(points)): Point[][] {
  const runs: Point[][] = [];
  let run: Point[] = [];
  for (const p of points) {
    if (run.length && p.t - run.at(-1)!.t > threshold) {
      runs.push(run);
      run = [];
    }
    run.push(p);
  }
  if (run.length) runs.push(run);
  return runs;
}

/** About `count` round tick values covering min..max. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks;
}

/** Y range of the plotted values with some headroom, never zero-height. */
export function valueDomain(values: number[]): [number, number] {
  if (!values.length) return [0, 1];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = hi === lo ? Math.max(Math.abs(hi) * 0.05, 1) : (hi - lo) * 0.1;
  return [lo - pad, hi + pad];
}
