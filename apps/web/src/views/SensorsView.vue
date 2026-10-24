<script setup lang="ts">
import { type SensorReading, SensorReadingList } from '@repo/contracts';
import { useIntervalFn, useLocalStorage } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import ClassPicker from '@/components/ClassPicker.vue';
import SensorChart from '@/components/SensorChart.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { apiGet } from '@/lib/api';
import { groupReadings, groupTitle, unitLabel } from '@/lib/sensor-series';
import { useClassesStore } from '@/stores/classes';

const REFRESH_MS = 5000;
const RANGES = [
  { id: '15m', label: '15 min', ms: 15 * 60_000 },
  { id: '1h', label: '1 h', ms: 60 * 60_000 },
  { id: 'all', label: 'All', ms: Infinity },
] as const;
const SERIES_COLORS = 8;

const readings = ref<SensorReading[]>();
const error = ref<string>();
const range = useLocalStorage<(typeof RANGES)[number]['id']>('sensors-range', 'all');
const showOutliers = useLocalStorage('sensors-show-outliers', false);
const { selectedId: classId } = storeToRefs(useClassesStore());

async function load() {
  const requested = classId.value;
  try {
    const query = new URLSearchParams({ classId: requested });
    const list = await apiGet(`/sensor-data?${query}`, SensorReadingList);
    // A slow response for the class picked before must not overwrite the new one
    if (requested !== classId.value) return;
    readings.value = list.items;
    error.value = undefined;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Loading the sensor data failed';
  }
}
useIntervalFn(load, REFRESH_MS, { immediateCallback: true });

// Clicking the active item would deselect it, which a time range can't be
const setRange = (value: unknown) => {
  const picked = RANGES.find((r) => r.id === value);
  if (picked) range.value = picked.id;
};

// The range counts back from the newest reading, so old data still shows when devices are off
const filtered = computed(() => {
  const all = readings.value ?? [];
  const newest = Math.max(...all.map((r) => Date.parse(r.recordedAt)));
  const ms = RANGES.find((r) => r.id === range.value)?.ms ?? Infinity;
  return all.filter((r) => newest - Date.parse(r.recordedAt) <= ms);
});

const groups = computed(() => groupReadings(filtered.value));

const xDomain = computed<[number, number]>(() => {
  const ts = groups.value.flatMap((g) => g.series.flatMap((s) => s.points.map((p) => p.t)));
  return ts.length ? [Math.min(...ts), Math.max(...ts)] : [0, 1];
});

// A sensor keeps its color while others come and go (color follows the entity, not its rank)
const slots = new Map<string, number>();
function colorOf(unit: string, sensorId: string) {
  const key = `${unit}\u0000${sensorId}`;
  if (!slots.has(key)) {
    const used = [...slots.keys()].filter((k) => k.startsWith(`${unit}\u0000`)).length;
    slots.set(key, used % SERIES_COLORS);
  }
  return `var(--series-${slots.get(key)! + 1})`;
}

watch(classId, () => {
  readings.value = undefined;
  // Another class has other sensors, so its colours start at the first series again
  slots.clear();
  void load();
});

const cards = computed(() =>
  groups.value.map((g) => {
    const series = g.series.map((s) => ({
      id: s.sensorId,
      color: colorOf(g.unit, s.sensorId),
      points: s.points,
      latest: s.points.at(-1),
    }));
    const count = series.reduce((n, s) => n + s.points.length, 0);
    const outliers = series.reduce((n, s) => n + s.points.filter((p) => p.outlier).length, 0);
    const rows = series
      .flatMap((s) => s.points.map((p) => ({ ...p, sensorId: s.id })))
      .toSorted((a, b) => b.t - a.t);
    return { unit: g.unit, title: groupTitle(g.unit), series, count, outliers, rows };
  }),
);

const precise = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
const time = (t: number) => new Date(t).toLocaleTimeString();
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-2xl font-semibold">Sensors</h1>
      <ClassPicker />
    </div>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <ToggleGroup
        type="single"
        variant="outline"
        :model-value="range"
        aria-label="Time range"
        @update:model-value="setRange"
      >
        <ToggleGroupItem v-for="r in RANGES" :key="r.id" :value="r.id" class="min-h-11 md:min-h-9">
          {{ r.label }}
        </ToggleGroupItem>
      </ToggleGroup>
      <label class="flex min-h-11 items-center gap-2">
        <input v-model="showOutliers" type="checkbox" class="size-5 accent-primary" />
        Show outliers
      </label>
    </div>

    <p
      v-if="error"
      class="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
      role="alert"
    >
      {{ error }}
    </p>

    <template v-if="!readings && !error">
      <Skeleton v-for="i in 3" :key="i" class="h-72 w-full" />
    </template>

    <p v-else-if="readings && !cards.length" class="text-sm text-muted-foreground">
      No sensor data for this class yet. Its plant and the noise page send it to
      <code>POST /api/sensor-data</code>.
    </p>

    <div class="flex flex-col gap-4">
      <Card v-for="card in cards" :key="card.unit">
        <CardHeader>
          <CardTitle>{{ card.title }}</CardTitle>
          <CardDescription>
            {{ unitLabel(card.unit) || 'no unit' }} · {{ card.count }} readings
            <template v-if="card.outliers">
              · {{ card.outliers }} {{ card.outliers === 1 ? 'outlier' : 'outliers' }}
              {{ showOutliers ? 'included' : 'marked at the edge (likely failed reads)' }}
            </template>
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <!-- Legend: always there, latest value per sensor -->
          <ul class="flex flex-wrap gap-x-6 gap-y-2">
            <li v-for="s in card.series" :key="s.id" class="flex flex-col">
              <span class="flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  v-if="card.series.length > 1"
                  class="h-0.5 w-4 rounded-full"
                  :style="{ background: s.color }"
                />
                {{ s.id }}
              </span>
              <span v-if="s.latest" class="text-2xl font-semibold">
                {{ precise.format(s.latest.value) }}
                <span class="text-base font-normal text-muted-foreground">
                  {{ unitLabel(card.unit) }}
                </span>
              </span>
              <span v-if="s.latest" class="text-xs text-muted-foreground">
                at {{ time(s.latest.t) }}
              </span>
            </li>
          </ul>

          <SensorChart
            :series="card.series"
            :unit="card.unit"
            :x-domain="xDomain"
            :show-outliers="showOutliers"
            :label="`${card.title} over time, ${card.count} readings. Use the table for exact values.`"
          />

          <details class="text-sm">
            <summary class="min-h-11 cursor-pointer content-center text-muted-foreground">
              Show table
            </summary>
            <div class="max-h-64 overflow-auto rounded-md border">
              <table class="w-full text-left tabular-nums">
                <thead class="sticky top-0 bg-card text-muted-foreground">
                  <tr>
                    <th class="px-3 py-1.5 font-medium">Time</th>
                    <th class="px-3 py-1.5 font-medium">Sensor</th>
                    <th class="px-3 py-1.5 text-right font-medium">
                      Value ({{ unitLabel(card.unit) }})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in card.rows" :key="`${row.sensorId}${row.t}`" class="border-t">
                    <td class="px-3 py-1">{{ time(row.t) }}</td>
                    <td class="px-3 py-1">{{ row.sensorId }}</td>
                    <td class="px-3 py-1 text-right">
                      {{ precise.format(row.value) }}
                      <span v-if="row.outlier" class="text-muted-foreground">(outlier)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
