<script setup lang="ts">
import { WATER_RULES, WaterSummary } from '@repo/contracts';
import { DropletIcon } from '@lucide/vue';
import { useLocalStorage } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import ClassPicker from '@/components/ClassPicker.vue';
import PlantGrowth from '@/components/PlantGrowth.vue';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { apiGet } from '@/lib/api';
import { type PhaseKind, phaseStart, phaseStarts, waterPerPhase } from '@/lib/phases';
import { useClassesStore } from '@/stores/classes';

// The class review (docs/concept.md, page 4): the plant of every day or week, like a calendar
const WEEKS = 8;
const DAYS = 28;

const { t, d } = useI18n();

const { selectedId: classId } = storeToRefs(useClassesStore());
// Which phase length a class uses is still open, so the review can show both
const kind = useLocalStorage<PhaseKind>('review-phase', 'week');
const summary = ref<WaterSummary>();
const error = ref<string>();

async function load() {
  const requested = classId.value;
  const from = phaseStarts('week', WEEKS)[0]!;
  try {
    const result = await apiGet(
      `/classes/${requested}/water?${new URLSearchParams({ from: from.toISOString() })}`,
      WaterSummary,
    );
    if (requested !== classId.value) return;
    summary.value = result;
    error.value = undefined;
  } catch (e) {
    error.value = e instanceof Error ? e.message : t('errors.loadWater');
  }
}
void load();
watch(classId, () => {
  summary.value = undefined;
  void load();
});

const setKind = (value: unknown) => {
  if (value === 'day' || value === 'week') kind.value = value;
};

const growth = (water: number, k: PhaseKind) => water / WATER_RULES.fullBloom[k];
const percent = (g: number) => Math.min(100, Math.round(g * 100));

const phases = computed(() => {
  const starts = phaseStarts(kind.value, kind.value === 'week' ? WEEKS : DAYS);
  const totals = waterPerPhase(summary.value?.events ?? [], kind.value, starts);
  const now = Date.now();
  const current = phaseStart(kind.value).getTime();
  return starts.map((start, i) => ({
    start,
    water: totals[i]!,
    growth: growth(totals[i]!, kind.value),
    future: start.getTime() > now,
    current: start.getTime() === current,
  }));
});
const current = computed(() => phases.value.find((p) => p.current)!);

// The day grid starts on a Monday, like phaseStarts
const weekdays = computed(() => phaseStarts('day', 7).map((day) => d(day, 'weekday')));
const dateLabel = (date: Date) => d(date, 'dayMonth');
const phaseLabel = (p: { start: Date }) =>
  kind.value === 'week' ? t('review.weekOf', { date: dateLabel(p.start) }) : dateLabel(p.start);
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-2xl font-semibold">{{ t('review.title') }}</h1>
      <ClassPicker />
    </div>

    <ToggleGroup
      type="single"
      variant="outline"
      class="text-sm"
      :model-value="kind"
      :aria-label="t('review.phaseLength')"
      @update:model-value="setKind"
    >
      <ToggleGroupItem value="day" class="min-h-11 md:min-h-9">{{
        t('review.days')
      }}</ToggleGroupItem>
      <ToggleGroupItem value="week" class="min-h-11 md:min-h-9">{{
        t('review.weeks')
      }}</ToggleGroupItem>
    </ToggleGroup>

    <p
      v-if="error"
      class="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
      role="alert"
    >
      {{ error }}
    </p>

    <Card>
      <CardHeader>
        <CardTitle>{{ kind === 'week' ? t('review.thisWeek') : t('review.today') }}</CardTitle>
        <CardDescription>
          {{
            t(kind === 'week' ? 'review.restartsWeek' : 'review.restartsDay', {
              water: WATER_RULES.fullBloom[kind],
            })
          }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton v-if="!summary && !error" class="h-48 w-full" />
        <div v-else class="flex items-center gap-6">
          <PlantGrowth :growth="current.growth" class="h-44 w-36 shrink-0 md:h-56 md:w-44" />
          <div class="flex flex-1 flex-col gap-3">
            <div class="flex items-center gap-2 text-4xl font-bold text-water tabular-nums">
              <DropletIcon class="size-7" aria-hidden="true" />
              {{ current.water }}
            </div>
            <Progress
              :model-value="percent(current.growth)"
              class="h-3 bg-water/20 *:bg-water"
              :aria-label="t('review.toFullBloom', { percent: percent(current.growth) })"
            />
            <p class="text-sm text-muted-foreground">
              {{
                current.growth >= 1
                  ? t('review.fullBloom')
                  : t('review.moreWater', { water: WATER_RULES.fullBloom[kind] - current.water })
              }}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>
          {{ t('review.lastWeeks', { count: kind === 'week' ? WEEKS : DAYS / 7 }) }}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton v-if="!summary && !error" class="h-48 w-full" />
        <ol v-else-if="kind === 'week'" class="grid grid-cols-4 gap-2 md:grid-cols-8">
          <li
            v-for="p in phases"
            :key="p.start.getTime()"
            class="flex flex-col items-center rounded-md border p-2 text-center"
            :class="p.current && 'border-primary bg-accent'"
          >
            <PlantGrowth :growth="p.growth" class="h-16 w-14" />
            <span class="text-xs text-muted-foreground">{{ dateLabel(p.start) }}</span>
            <span class="text-sm font-medium text-water tabular-nums">{{ p.water }}</span>
            <span class="sr-only">
              {{ t('review.grown', { phase: phaseLabel(p), percent: percent(p.growth) }) }}
            </span>
          </li>
        </ol>
        <div v-else>
          <div
            class="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground"
            aria-hidden="true"
          >
            <span v-for="day in weekdays" :key="day">{{ day }}</span>
          </div>
          <ol class="grid grid-cols-7 gap-1">
            <li
              v-for="p in phases"
              :key="p.start.getTime()"
              class="flex flex-col items-center rounded-md border px-0.5 py-1 text-center"
              :class="[p.current && 'border-primary bg-accent', p.future && 'opacity-40']"
            >
              <PlantGrowth v-if="!p.future" :growth="p.growth" class="h-10 w-8 md:h-14 md:w-12" />
              <span v-else class="h-10 md:h-14" />
              <span class="text-[11px] text-muted-foreground tabular-nums">
                {{ p.start.getDate() }}
              </span>
              <span class="sr-only">
                {{
                  p.future
                    ? t('review.notYet', { phase: phaseLabel(p) })
                    : t('review.dayGrown', {
                        phase: phaseLabel(p),
                        water: p.water,
                        percent: percent(p.growth),
                      })
                }}
              </span>
            </li>
          </ol>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
