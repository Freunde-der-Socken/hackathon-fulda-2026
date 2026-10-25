<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import { computed, ref, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  gapThreshold,
  niceTicks,
  type Point,
  splitAtGaps,
  unitLabel,
  valueDomain,
} from '@/lib/sensor-series';

export interface ChartSeries {
  id: string;
  /** CSS color of the line, e.g. `var(--series-1)`. */
  color: string;
  points: Point[];
}

const props = defineProps<{
  series: ChartSeries[];
  unit: string;
  /** Shared by all charts on the page, so their time axes line up. */
  xDomain: [number, number];
  /** Include outliers in the line and the y scale instead of marking them at the edge. */
  showOutliers: boolean;
  label: string;
}>();

const HEIGHT = 200;
const M = { top: 12, right: 56, bottom: 24, left: 44 };
const PLOT_H = HEIGHT - M.top - M.bottom;

const container = useTemplateRef<HTMLDivElement>('container');
const { width } = useElementSize(container);
const plotW = computed(() => Math.max(width.value - M.left - M.right, 10));

const isPlotted = (p: Point) => props.showOutliers || !p.outlier;

const yDomain = computed(() =>
  valueDomain(props.series.flatMap((s) => s.points.filter(isPlotted).map((p) => p.value))),
);
const yTicks = computed(() => niceTicks(...yDomain.value));

const x = (t: number) => {
  const [t0, t1] = props.xDomain;
  return M.left + ((t - t0) / (t1 - t0 || 1)) * plotW.value;
};
const y = (v: number) => {
  const [lo, hi] = yDomain.value;
  return M.top + (1 - (v - lo) / (hi - lo)) * PLOT_H;
};
const clampY = (v: number) => Math.min(M.top + PLOT_H, Math.max(M.top, y(v)));

// `t` is a timestamp throughout this file
const { t: translate, d, n } = useI18n();
const compact = (value: number) => n(value, 'compact');
const precise = (value: number) => n(value, 'precise');
const time = (ms: number, seconds = false) => d(ms, seconds ? 'timeSeconds' : 'time');

const MINUTE = 60_000;
const TIME_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440].map((m) => m * MINUTE);
const xTicks = computed(() => {
  const [t0, t1] = props.xDomain;
  const wanted = Math.max(2, Math.floor(plotW.value / 90));
  const step = TIME_STEPS.find((s) => s >= (t1 - t0) / wanted) ?? TIME_STEPS.at(-1)!;
  const ticks: number[] = [];
  for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) ticks.push(t);
  return ticks;
});

const lines = computed(() =>
  props.series.map((s) => {
    const runs = splitAtGaps(s.points.filter(isPlotted), gapThreshold(s.points));
    return {
      ...s,
      paths: runs
        .filter((run) => run.length > 1)
        .map((run) => run.map((p, i) => `${i ? 'L' : 'M'}${x(p.t)},${y(p.value)}`).join('')),
      // A lone reading between two gaps has no line, so it gets a dot
      singles: runs.filter((run) => run.length === 1).map((run) => run[0]!),
      hidden: props.showOutliers ? [] : s.points.filter((p) => p.outlier),
      last: s.points.findLast(isPlotted),
    };
  }),
);

// End labels only when they don't collide; otherwise the legend and tooltip carry the values
const endLabels = computed(() => {
  const ends = lines.value
    .filter((l) => l.last)
    .map((l) => ({ id: l.id, y: y(l.last!.value), value: l.last!.value }))
    .toSorted((a, b) => a.y - b.y);
  const clear = ends.every((e, i) => i === 0 || e.y - ends[i - 1]!.y >= 14);
  return clear ? ends : [];
});

// Hover: the crosshair snaps to the nearest reading of any series
const times = computed(() =>
  [...new Set(props.series.flatMap((s) => s.points.map((p) => p.t)))].toSorted((a, b) => a - b),
);
const hoverIndex = ref<number>();
const hoverT = computed(() =>
  hoverIndex.value === undefined ? undefined : times.value[hoverIndex.value],
);

function nearestIndex(list: number[], t: number) {
  let lo = 0;
  let hi = list.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid]! < t) lo = mid + 1;
    else hi = mid;
  }
  return lo > 0 && t - list[lo - 1]! < list[lo]! - t ? lo - 1 : lo;
}

const readout = computed(() => {
  const t = hoverT.value;
  if (t === undefined) return [];
  return props.series.flatMap((s) => {
    if (!s.points.length) return [];
    const p =
      s.points[
        nearestIndex(
          s.points.map((q) => q.t),
          t,
        )
      ]!;
    // A series that has no reading near this time is left out instead of showing a stale value
    return Math.abs(p.t - t) <= gapThreshold(s.points) / 2 ? [{ ...s, point: p }] : [];
  });
});

function onPointerMove(event: PointerEvent) {
  if (!times.value.length) return;
  const [t0, t1] = props.xDomain;
  const t = t0 + ((event.offsetX - M.left) / plotW.value) * (t1 - t0);
  hoverIndex.value = nearestIndex(times.value, t);
}

function onKeydown(event: KeyboardEvent) {
  const last = times.value.length - 1;
  if (last < 0) return;
  const current = hoverIndex.value ?? last;
  const next = {
    ArrowLeft: current - 1,
    ArrowRight: current + 1,
    Home: 0,
    End: last,
  }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  hoverIndex.value = Math.min(last, Math.max(0, next));
}

// Beside the crosshair inside the plot, on whichever side has more room
const tooltipStyle = computed(() => {
  if (hoverT.value === undefined) return {};
  const cx = x(hoverT.value);
  return cx < width.value / 2 ? { left: `${cx + 12}px` } : { right: `${width.value - cx + 12}px` };
});
</script>

<template>
  <div ref="container" class="relative w-full">
    <svg
      :width="width"
      :height="HEIGHT"
      class="block touch-pan-y overflow-visible outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      role="img"
      :aria-label="label"
      tabindex="0"
      @pointermove="onPointerMove"
      @pointerdown="onPointerMove"
      @pointerleave="hoverIndex = undefined"
      @focus="hoverIndex = times.length - 1"
      @blur="hoverIndex = undefined"
      @keydown="onKeydown"
    >
      <g class="text-[11px] tabular-nums" fill="var(--muted-foreground)">
        <template v-for="tick in yTicks" :key="tick">
          <line
            :x1="M.left"
            :x2="M.left + plotW"
            :y1="y(tick)"
            :y2="y(tick)"
            stroke="var(--border)"
          />
          <text :x="M.left - 6" :y="y(tick)" text-anchor="end" dominant-baseline="middle">
            {{ compact(tick) }}
          </text>
        </template>
        <text v-for="tick in xTicks" :key="tick" :x="x(tick)" :y="HEIGHT - 6" text-anchor="middle">
          {{ time(tick) }}
        </text>
      </g>

      <line
        v-if="hoverT !== undefined"
        :x1="x(hoverT)"
        :x2="x(hoverT)"
        :y1="M.top"
        :y2="M.top + PLOT_H"
        stroke="var(--muted-foreground)"
      />

      <g v-for="line in lines" :key="line.id">
        <path
          v-for="(d, i) in line.paths"
          :key="i"
          :d="d"
          fill="none"
          :stroke="line.color"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle
          v-for="p in line.singles"
          :key="p.t"
          :cx="x(p.t)"
          :cy="y(p.value)"
          r="3"
          :fill="line.color"
        />
        <!-- Outliers outside the scale sit on its edge, hollow, so they stay visible -->
        <circle
          v-for="p in line.hidden"
          :key="`o${p.t}`"
          :cx="x(p.t)"
          :cy="clampY(p.value)"
          r="4"
          fill="var(--card)"
          :stroke="line.color"
          stroke-width="2"
        />
        <circle
          v-if="line.last"
          :cx="x(line.last.t)"
          :cy="y(line.last.value)"
          r="5"
          :fill="line.color"
          stroke="var(--card)"
          stroke-width="2"
        />
      </g>

      <g v-if="readout.length">
        <circle
          v-for="r in readout"
          :key="r.id"
          :cx="x(r.point.t)"
          :cy="isPlotted(r.point) ? y(r.point.value) : clampY(r.point.value)"
          r="5"
          :fill="r.color"
          stroke="var(--card)"
          stroke-width="2"
        />
      </g>

      <text
        v-for="e in endLabels"
        :key="e.id"
        :x="M.left + plotW + 10"
        :y="e.y"
        dominant-baseline="middle"
        class="text-xs font-medium tabular-nums"
        fill="var(--foreground)"
      >
        {{ precise(e.value) }}
      </text>
    </svg>

    <div
      v-if="hoverT !== undefined && readout.length"
      class="pointer-events-none absolute top-1 z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
      :style="tooltipStyle"
    >
      <div class="mb-1 text-muted-foreground tabular-nums">{{ time(hoverT, true) }}</div>
      <div v-for="r in readout" :key="r.id" class="flex items-center gap-2 whitespace-nowrap">
        <span class="h-0.5 w-3 rounded-full" :style="{ background: r.color }" />
        <span class="font-semibold tabular-nums">
          {{ precise(r.point.value) }} {{ unitLabel(unit) }}
        </span>
        <span class="text-muted-foreground">{{ r.id }}</span>
        <span v-if="r.point.outlier" class="text-muted-foreground">
          · {{ translate('sensors.failedRead') }}
        </span>
      </div>
    </div>
  </div>
</template>
