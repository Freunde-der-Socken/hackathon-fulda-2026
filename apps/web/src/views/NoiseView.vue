<script setup lang="ts">
import { DEMO_PLANT_ID, SensorReading, SensorReadingInput } from '@repo/contracts';
import { useIntervalFn, useLocalStorage, useWakeLock } from '@vueuse/core';
import { computed, ref } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiPost } from '@/lib/api';
import { MIN_DB, SPL_OFFSET, toSpl, useMicLevel } from '@/composables/useMicLevel';

const SEND_INTERVAL_MS = 1000;

const { t, d, n } = useI18n();

const { level, peak, running, start, stop, takeAverage } = useMicLevel();
const wakeLock = useWakeLock();

// One id per phone, so readings of several phones can be told apart
const sensorId = useLocalStorage(
  'noise-sensor-id',
  () => `phone-noise-${Math.random().toString(36).slice(2, 8)}`,
);
const sending = useLocalStorage('noise-sending', true);
const lastSent = ref<Date>();
const sendFailed = ref(false);
const secure = window.isSecureContext;

const percent = (db: number) => `${((db - MIN_DB) / -MIN_DB) * 100}%`;
const format = (db: number) => (running.value ? n(toSpl(db), 'oneDecimal') : '–');
const levelWidth = computed(() => percent(level.value));
const peakLeft = computed(() => percent(peak.value));

async function toggle() {
  if (running.value) {
    stop();
    await wakeLock.release();
    return;
  }
  try {
    await start();
    // Chrome pauses the page when the screen turns off
    if (wakeLock.isSupported.value) await wakeLock.request('screen');
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('noise.micFailed'));
  }
}

let inFlight = false;
useIntervalFn(async () => {
  const average = takeAverage();
  if (!average || !sending.value || inFlight) return;
  inFlight = true;
  try {
    await apiPost(
      '/sensor-data',
      SensorReadingInput,
      {
        sensorId: sensorId.value,
        // No plant picker yet, so every phone reports for the seeded demo plant
        plantId: DEMO_PLANT_ID,
        value: Math.round(toSpl(average.level) * 10) / 10,
        unit: 'dB',
        recordedAt: new Date().toISOString(),
      },
      SensorReading,
    );
    lastSent.value = new Date();
    sendFailed.value = false;
  } catch (error) {
    // One toast per outage instead of one per second
    if (!sendFailed.value) {
      toast.error(error instanceof Error ? error.message : t('noise.sendError'));
    }
    sendFailed.value = true;
  } finally {
    inFlight = false;
  }
}, SEND_INTERVAL_MS);
</script>

<template>
  <div class="flex flex-col gap-4">
    <h1 class="text-2xl font-semibold">{{ t('noise.title') }}</h1>

    <p
      v-if="!secure"
      class="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
      role="alert"
    >
      {{ t('noise.insecure') }}
    </p>

    <Card>
      <CardHeader>
        <CardTitle>{{ t('noise.ambient') }}</CardTitle>
        <CardDescription>{{ t('noise.ambientHint') }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-muted-foreground">{{ t('noise.level') }}</div>
            <div class="text-4xl font-bold tabular-nums">{{ format(level) }}</div>
          </div>
          <div>
            <div class="text-sm text-muted-foreground">{{ t('noise.peak') }}</div>
            <div class="text-4xl font-bold tabular-nums">{{ format(peak) }}</div>
          </div>
        </div>

        <div
          class="relative h-4 overflow-hidden rounded-full bg-muted"
          role="meter"
          :aria-valuemin="toSpl(MIN_DB)"
          :aria-valuemax="SPL_OFFSET"
          :aria-valuenow="toSpl(level)"
          :aria-label="t('noise.meter')"
        >
          <div
            class="absolute inset-y-0 left-0 bg-primary transition-[width] duration-100"
            :style="{ width: levelWidth }"
          />
          <div class="absolute inset-y-0 w-0.5 bg-destructive" :style="{ left: peakLeft }" />
        </div>

        <Button size="lg" class="w-full" @click="toggle">
          {{ running ? t('noise.stop') : t('noise.start') }}
        </Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>{{ t('noise.send') }}</CardTitle>
        <CardDescription>
          <I18nT keypath="noise.sendHint" scope="global">
            <template #endpoint><code>POST /api/sensor-data</code></template>
          </I18nT>
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3 text-sm">
        <label class="flex min-h-11 items-center gap-3">
          <input v-model="sending" type="checkbox" class="size-5 accent-primary" />
          {{ t('noise.sendReadings') }}
        </label>
        <I18nT keypath="noise.sensorId" tag="div" scope="global">
          <template #id
            ><code>{{ sensorId }}</code></template
          >
        </I18nT>
        <div class="text-muted-foreground">
          <template v-if="sendFailed">{{ t('noise.sendFailed') }}</template>
          <template v-else-if="lastSent">
            {{ t('noise.lastSent', { time: d(lastSent, 'timeSeconds') }) }}
          </template>
          <template v-else>{{ t('noise.nothingSent') }}</template>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
