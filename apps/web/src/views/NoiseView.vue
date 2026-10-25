<script setup lang="ts">
import {
  DEMO_PLANT_ID,
  PlantSilentPhase,
  SensorReading,
  SensorReadingInput,
  type SilentPhase,
} from '@repo/contracts';
import { useIntervalFn, useLocalStorage, useWakeLock } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiGet, apiPost } from '@/lib/api';
import { MIN_DB, SPL_OFFSET, toSpl, useMicLevel } from '@/composables/useMicLevel';

const SEND_INTERVAL_MS = 1000;
const POLL_INTERVAL_MS = 3000;

const { t, d, n } = useI18n();

const { level, peak, running, prepare, start, stop, takeAverage } = useMicLevel();
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

function micError(error: unknown) {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return t('noise.permissionDenied');
  }
  return error instanceof Error ? error.message : t('noise.micFailed');
}

// Automatic mode: the phone waits for a silent phase of the plant's class and measures while it
// runs. Not remembered across reloads, because the browser wants a new tap after one.
const armed = ref(false);
const phase = ref<SilentPhase | null>(null);
const statusError = ref<string>();
const autoError = ref<string>();
let autoStarted = false;
let switching = false;

// Chrome pauses the page when the screen turns off, which would also miss the next phase
watch([armed, running], ([isArmed, isRunning]) => {
  if (!wakeLock.isSupported.value) return;
  // Best effort: without the lock the page still works while the screen is on
  const done = isArmed || isRunning ? wakeLock.request('screen') : wakeLock.release();
  done.catch(() => undefined);
});

async function toggle() {
  if (running.value) {
    stop();
    // Otherwise the next poll would switch it back on during a phase
    armed.value = false;
    return;
  }
  try {
    await start();
    autoStarted = false;
  } catch (error) {
    toast.error(micError(error));
  }
}

async function arm() {
  try {
    await prepare();
    autoError.value = undefined;
    armed.value = true;
    await poll();
  } catch (error) {
    autoError.value = micError(error);
  }
}

function disarm() {
  armed.value = false;
  phase.value = null;
  statusError.value = undefined;
  autoError.value = undefined;
  if (autoStarted && running.value) stop();
}

// Starts or stops the microphone to match the phase. A failed start is retried on the next poll.
async function follow() {
  if (!armed.value || switching) return;
  switching = true;
  try {
    if (!phase.value) autoError.value = undefined;
    if (phase.value && !running.value) {
      await start();
      autoStarted = true;
      autoError.value = undefined;
    } else if (!phase.value && running.value && autoStarted) {
      stop();
    }
  } catch (error) {
    autoError.value = micError(error);
  } finally {
    switching = false;
  }
}

let polling = false;
async function poll() {
  if (!armed.value || polling) return;
  polling = true;
  try {
    // No plant picker yet, so every phone follows the seeded demo plant
    const status = await apiGet(`/plants/${DEMO_PLANT_ID}/silent-phase`, PlantSilentPhase);
    if (!armed.value) return;
    phase.value = status.activeSilentPhase;
    statusError.value = undefined;
  } catch (error) {
    statusError.value = error instanceof Error ? error.message : t('noise.statusError');
  } finally {
    polling = false;
  }
  await follow();
}
useIntervalFn(poll, POLL_INTERVAL_MS);

const autoStatus = computed(() => {
  if (!phase.value) return running.value ? t('noise.autoManual') : t('noise.autoWaiting');
  const since = d(new Date(phase.value.startedAt), 'time');
  if (running.value) return t('noise.autoActive', { since });
  return autoError.value ? t('noise.autoBlocked', { since }) : t('noise.autoStarting', { since });
});

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
        <CardTitle>{{ t('noise.auto') }}</CardTitle>
        <CardDescription>{{ t('noise.autoHint') }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3 text-sm">
        <div v-if="armed" class="flex items-center gap-2" role="status">
          <span
            class="size-2.5 shrink-0 rounded-full"
            :class="running ? 'bg-primary' : 'bg-muted-foreground/40'"
            aria-hidden="true"
          />
          <span>{{ autoStatus }}</span>
        </div>
        <p
          v-if="autoError"
          class="rounded-md border border-destructive/50 p-3 text-destructive"
          role="alert"
        >
          {{ autoError }}
        </p>
        <p v-if="statusError" class="text-destructive" role="alert">
          {{ t('noise.statusFailed', { error: statusError }) }}
        </p>
        <!-- After an error the browser wants a new tap, so "Get ready" comes back -->
        <Button
          v-if="!armed || autoError"
          variant="secondary"
          size="lg"
          class="w-full"
          :disabled="!secure"
          @click="arm"
        >
          {{ t('noise.arm') }}
        </Button>
        <Button v-if="armed" variant="outline" size="lg" class="w-full" @click="disarm">
          {{ t('noise.disarm') }}
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
