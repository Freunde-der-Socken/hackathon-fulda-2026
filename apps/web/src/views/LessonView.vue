<script setup lang="ts">
import {
  AwardWaterBody,
  SilentPhase,
  WATER_RULES,
  WaterEvent,
  type WaterSource,
  WaterSummary,
} from '@repo/contracts';
import { DropletIcon, DropletsIcon, TimerIcon } from '@lucide/vue';
import { useIntervalFn } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { z } from 'zod';
import ClassPicker from '@/components/ClassPicker.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet, apiPost } from '@/lib/api';
import { phaseStart } from '@/lib/phases';
import { useClassesStore } from '@/stores/classes';

const REFRESH_MS = 5000;
const NoBody = z.object({});

const { selectedId: classId } = storeToRefs(useClassesStore());
const today = ref<WaterSummary>();
const week = ref<WaterSummary>();
const error = ref<string>();
const busy = ref(false);

async function load() {
  const requested = classId.value;
  const water = (from: Date) =>
    apiGet(
      `/classes/${requested}/water?${new URLSearchParams({ from: from.toISOString() })}`,
      WaterSummary,
    );
  try {
    const [day, wk] = await Promise.all([water(phaseStart('day')), water(phaseStart('week'))]);
    // A slow response for the class picked before must not overwrite the new one
    if (requested !== classId.value) return;
    today.value = day;
    week.value = wk;
    error.value = undefined;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Loading the water failed';
  }
}
// Polling also picks up a silent phase started on another device
useIntervalFn(load, REFRESH_MS, { immediateCallback: true });
watch(classId, () => {
  today.value = week.value = undefined;
  void load();
});

const active = computed(() => week.value?.activeSilentPhase);
const now = ref(Date.now());
useIntervalFn(() => (now.value = Date.now()), 1000);
const elapsed = computed(() => {
  if (!active.value) return '';
  const s = Math.max(0, Math.floor((now.value - Date.parse(active.value.startedAt)) / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
});

async function act<T>(action: () => Promise<T>, done: (result: T) => void) {
  busy.value = true;
  try {
    done(await action());
    await load();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Something went wrong');
  } finally {
    busy.value = false;
  }
}

const startPhase = () =>
  act(
    () => apiPost(`/classes/${classId.value}/silent-phases`, NoBody, {}, SilentPhase),
    () => toast.success('Silent phase started'),
  );

const stopPhase = (id: string) =>
  act(
    () => apiPost(`/silent-phases/${id}/stop`, NoBody, {}, SilentPhase),
    (phase) =>
      phase.quietShare === null
        ? toast.warning('No noise readings during the phase, so no water. Is the noise page on?')
        : toast.success(
            `Quiet ${Math.round(phase.quietShare * 100)} % of the time: +${phase.water} water`,
          ),
  );

const award = (amount: AwardWaterBody['amount']) =>
  act(
    () => apiPost(`/classes/${classId.value}/water`, AwardWaterBody, { amount }, WaterEvent),
    (event) => toast.success(`+${event.amount} water`),
  );

const pad = (n: number) => String(n).padStart(2, '0');
const SOURCES: Record<WaterSource, string> = {
  small: 'Small amount',
  large: 'Large amount',
  'silent-phase': 'Silent phase',
};
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-2xl font-semibold">Lesson</h1>
      <ClassPicker />
    </div>

    <p
      v-if="error"
      class="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
      role="alert"
    >
      {{ error }}
    </p>

    <Card>
      <CardHeader>
        <CardTitle>Water collected</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton v-if="!week && !error" class="h-16 w-full" />
        <dl v-else-if="week && today" class="grid grid-cols-2 gap-4">
          <div>
            <dt class="text-sm text-muted-foreground">Today</dt>
            <dd class="flex items-center gap-2 text-4xl font-bold text-water tabular-nums">
              <DropletIcon class="size-7" aria-hidden="true" />
              {{ today.total }}
            </dd>
          </div>
          <div>
            <dt class="text-sm text-muted-foreground">This week</dt>
            <dd class="flex items-center gap-2 text-4xl font-bold text-water tabular-nums">
              <DropletsIcon class="size-7" aria-hidden="true" />
              {{ week.total }}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>

    <div class="grid gap-4 md:grid-cols-2 md:items-start">
      <Card>
        <CardHeader>
          <CardTitle>Silent work phase</CardTitle>
          <CardDescription>
            Quiet the whole time earns {{ WATER_RULES.silentPhaseMax }} water, otherwise the share
            of the time it was quiet. The noise page has to run in the room.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <template v-if="active">
            <div class="flex items-center justify-center gap-3 py-2" role="timer" aria-live="off">
              <TimerIcon class="size-8 text-primary" aria-hidden="true" />
              <span class="text-5xl font-bold tabular-nums">{{ elapsed }}</span>
            </div>
            <Button
              size="lg"
              variant="outline"
              class="h-14 w-full text-base"
              :disabled="busy"
              @click="stopPhase(active.id)"
            >
              Stop and award water
            </Button>
          </template>
          <Button
            v-else
            size="lg"
            class="h-14 w-full text-base"
            :disabled="busy || !week"
            @click="startPhase"
          >
            <TimerIcon class="size-5" />
            Start silent phase
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Award water</CardTitle>
          <CardDescription>For good work outside a silent phase.</CardDescription>
        </CardHeader>
        <CardContent class="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            class="h-20 flex-col gap-1 bg-water text-base text-water-foreground hover:bg-water/90"
            :disabled="busy || !week"
            @click="award('small')"
          >
            <DropletIcon class="size-5" />
            Small amount
            <span class="text-sm font-normal opacity-90">+{{ WATER_RULES.small }}</span>
          </Button>
          <Button
            size="lg"
            class="h-20 flex-col gap-1 bg-water text-base text-water-foreground hover:bg-water/90"
            :disabled="busy || !week"
            @click="award('large')"
          >
            <DropletsIcon class="size-5" />
            Large amount
            <span class="text-sm font-normal opacity-90">+{{ WATER_RULES.large }}</span>
          </Button>
        </CardContent>
      </Card>
    </div>

    <Card v-if="today?.events.length">
      <CardHeader>
        <CardTitle>Today</CardTitle>
      </CardHeader>
      <CardContent>
        <ul class="flex flex-col divide-y text-sm">
          <li v-for="e in today.events" :key="e.id" class="flex justify-between gap-3 py-2">
            <span>
              <span class="text-muted-foreground tabular-nums">{{ time(e.createdAt) }}</span>
              {{ SOURCES[e.source] }}
            </span>
            <span class="font-medium text-water tabular-nums">+{{ e.amount }}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  </div>
</template>
