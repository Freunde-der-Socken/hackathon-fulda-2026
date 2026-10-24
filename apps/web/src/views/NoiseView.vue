<script setup lang="ts">
import { SensorReading, SensorReadingInput } from '@repo/contracts';
import { useIntervalFn, useLocalStorage, useWakeLock } from '@vueuse/core';
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiPost } from '@/lib/api';
import { MIN_DB, SPL_OFFSET, toSpl, useMicLevel } from '@/composables/useMicLevel';

const SEND_INTERVAL_MS = 1000;
// Plant from the dev seed, so readings are accepted without setting anything up
const DEMO_PLANT_ID = '6f1c0b6e-2a4d-4c43-9a8e-0d6a2f1b7c11';

const { level, peak, running, start, stop, takeAverage } = useMicLevel();
const wakeLock = useWakeLock();

// One id per phone, so readings of several phones can be told apart
const sensorId = useLocalStorage(
  'noise-sensor-id',
  () => `phone-noise-${Math.random().toString(36).slice(2, 8)}`,
);
// The API only accepts plants that are mapped to a class
const plantId = useLocalStorage('noise-plant-id', DEMO_PLANT_ID);
const sending = useLocalStorage('noise-sending', true);
const lastSent = ref<string>();
const sendFailed = ref(false);
const secure = window.isSecureContext;

const percent = (db: number) => `${((db - MIN_DB) / -MIN_DB) * 100}%`;
const format = (db: number) => (running.value ? toSpl(db).toFixed(1) : '–');
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
    toast.error(error instanceof Error ? error.message : 'Could not start the microphone');
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
        plantId: plantId.value,
        value: Math.round(toSpl(average.level) * 10) / 10,
        unit: 'dB',
        recordedAt: new Date().toISOString(),
      },
      SensorReading,
    );
    lastSent.value = new Date().toLocaleTimeString();
    sendFailed.value = false;
  } catch (error) {
    // One toast per outage instead of one per second
    if (!sendFailed.value) {
      toast.error(error instanceof Error ? error.message : 'Sending the reading failed');
    }
    sendFailed.value = true;
  } finally {
    inFlight = false;
  }
}, SEND_INTERVAL_MS);
</script>

<template>
  <div class="flex flex-col gap-4">
    <h1 class="text-2xl font-semibold">Noise level</h1>

    <p
      v-if="!secure"
      class="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
      role="alert"
    >
      The microphone only works over HTTPS or on localhost. Open the app through an HTTPS address.
    </p>

    <Card>
      <CardHeader>
        <CardTitle>Ambient sound</CardTitle>
        <CardDescription>
          Estimated sound pressure in dB, measured with this phone's microphone. Not calibrated:
          phones can be off by up to ~10 dB, so compare trends rather than exact values.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-sm text-muted-foreground">Level (dB)</div>
            <div class="text-4xl font-bold tabular-nums">{{ format(level) }}</div>
          </div>
          <div>
            <div class="text-sm text-muted-foreground">Peak (dB)</div>
            <div class="text-4xl font-bold tabular-nums">{{ format(peak) }}</div>
          </div>
        </div>

        <div
          class="relative h-4 overflow-hidden rounded-full bg-muted"
          role="meter"
          :aria-valuemin="toSpl(MIN_DB)"
          :aria-valuemax="SPL_OFFSET"
          :aria-valuenow="toSpl(level)"
          aria-label="Sound level"
        >
          <div
            class="absolute inset-y-0 left-0 bg-primary transition-[width] duration-100"
            :style="{ width: levelWidth }"
          />
          <div class="absolute inset-y-0 w-0.5 bg-destructive" :style="{ left: peakLeft }" />
        </div>

        <Button size="lg" class="w-full" @click="toggle">
          {{ running ? 'Stop measuring' : 'Start measuring' }}
        </Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Send to API</CardTitle>
        <CardDescription>
          Every second the average level goes to <code>POST /api/sensor-data</code>.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3 text-sm">
        <label class="flex min-h-11 items-center gap-3">
          <input v-model="sending" type="checkbox" class="size-5 accent-primary" />
          Send readings
        </label>
        <div>
          Sensor id: <code>{{ sensorId }}</code>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="noise-plant-id">Plant id</Label>
          <Input id="noise-plant-id" v-model.trim="plantId" class="font-mono" />
        </div>
        <div class="text-muted-foreground">
          <template v-if="sendFailed">Sending failed, retrying …</template>
          <template v-else-if="lastSent">Last sent at {{ lastSent }}</template>
          <template v-else>Nothing sent yet.</template>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
