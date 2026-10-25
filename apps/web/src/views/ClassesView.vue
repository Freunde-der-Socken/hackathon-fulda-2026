<script setup lang="ts">
import type { SchoolClass } from '@repo/contracts';
import { CheckIcon, CopyIcon, PlusIcon, SproutIcon } from '@lucide/vue';
import { useClipboard } from '@vueuse/core';
import { storeToRefs } from 'pinia';
import type { AcceptableValue } from 'reka-ui';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import NewClassDialog from '@/components/NewClassDialog.vue';
import NewPlantDialog from '@/components/NewPlantDialog.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useClassesStore } from '@/stores/classes';

/** Select value for "no plant", since a select item can't have an empty value. */
const NONE = 'none';

const { t } = useI18n();
const store = useClassesStore();
const { classes, plants, error } = storeToRefs(store);
void store.load();

const classById = computed(() => new Map(classes.value?.map((c) => [c.id, c])));
const plantById = computed(() => new Map(plants.value?.map((p) => [p.id, p])));
const freePlants = computed(() => plants.value?.filter((p) => !p.classId) ?? []);
/** Free plants first in the picker, since those are the usual choice. */
const plantOptions = computed(() =>
  (plants.value ?? []).toSorted((a, b) => Number(!!a.classId) - Number(!!b.classId)),
);

const newClassOpen = ref(false);
const newPlantOpen = ref(false);
const busy = ref(false);

/** A plant picked for one class that still belongs to another, waiting for confirmation. */
const pendingMove = ref<{ plantId: string; plant: string; from: string; to: SchoolClass }>();

const { copy, copied } = useClipboard({ legacy: true });
const copiedId = ref<string>();

async function copyId(id: string) {
  await copy(id);
  copiedId.value = id;
  toast.success(t('classes.idCopied'));
}

async function run(action: () => Promise<unknown>, done: string) {
  busy.value = true;
  try {
    await action();
    toast.success(done);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('errors.generic'));
  } finally {
    busy.value = false;
  }
}

function connect(plantId: string, to: SchoolClass) {
  const plant = plantById.value.get(plantId)?.name;
  return run(() => store.assign(plantId, to.id), t('classes.connected', { plant, name: to.name }));
}

function choose(c: SchoolClass, value: AcceptableValue) {
  if (typeof value !== 'string' || value === c.plantId) return;
  if (value === NONE) {
    const plantId = c.plantId;
    if (plantId) {
      void run(() => store.disconnect(plantId), t('classes.disconnected', { name: c.name }));
    }
    return;
  }
  const plant = plantById.value.get(value);
  if (plant?.classId) {
    const from = classById.value.get(plant.classId)?.name ?? '';
    pendingMove.value = { plantId: plant.id, plant: plant.name, from, to: c };
  } else {
    void connect(value, c);
  }
}

async function confirmMove() {
  const move = pendingMove.value;
  if (!move) return;
  await connect(move.plantId, move.to);
  pendingMove.value = undefined;
}
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">{{ t('classes.title') }}</h1>
        <p class="text-sm text-muted-foreground">{{ t('classes.intro') }}</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" class="min-h-11 md:min-h-9" @click="newPlantOpen = true">
          <PlusIcon />{{ t('classes.newPlant') }}
        </Button>
        <Button class="min-h-11 md:min-h-9" @click="newClassOpen = true">
          <PlusIcon />{{ t('classes.newClass') }}
        </Button>
      </div>
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
        <CardTitle>{{ t('classes.classes') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <Skeleton v-if="!classes && !error" class="h-24 w-full" />
        <div v-else-if="classes && !classes.length" class="flex flex-col items-start gap-3">
          <p class="text-sm text-muted-foreground">{{ t('classes.noClasses') }}</p>
          <Button variant="outline" class="min-h-11 md:min-h-9" @click="newClassOpen = true">
            <PlusIcon />{{ t('classes.newClass') }}
          </Button>
        </div>
        <ul v-if="classes?.length" class="flex flex-col divide-y">
          <li
            v-for="c in classes"
            :key="c.id"
            class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <span class="font-medium">{{ c.name }}</span>
            <div class="flex items-center gap-2 sm:w-80">
              <Select
                :model-value="c.plantId"
                :disabled="busy"
                @update:model-value="(value) => choose(c, value)"
              >
                <SelectTrigger
                  :class="cn('min-h-11 w-full flex-1 md:min-h-9', !c.plantId && 'border-dashed')"
                  :aria-label="t('classes.plantFor', { name: c.name })"
                >
                  <span class="flex min-w-0 items-center gap-2">
                    <SproutIcon v-if="c.plantId" class="text-primary" />
                    <!-- Not the item text, which reka caches and which includes the old class -->
                    <SelectValue :placeholder="t('classes.pickPlant')">
                      {{ c.plantId ? plantById.get(c.plantId)?.name : t('classes.pickPlant') }}
                    </SelectValue>
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="p in plantOptions" :key="p.id" :value="p.id">
                    {{ p.name }}
                    <span v-if="p.classId && p.classId !== c.id" class="text-muted-foreground">
                      {{ t('classes.inClass', { name: classById.get(p.classId)?.name }) }}
                    </span>
                  </SelectItem>
                  <template v-if="c.plantId">
                    <SelectSeparator />
                    <SelectItem :value="NONE">{{ t('classes.noPlant') }}</SelectItem>
                  </template>
                </SelectContent>
              </Select>
              <Button
                v-if="c.plantId"
                variant="ghost"
                size="icon"
                class="size-11 md:size-9"
                :title="t('classes.copyId')"
                :aria-label="
                  t('classes.copyIdOf', { name: plantById.get(c.plantId)?.name ?? c.plantId })
                "
                @click="copyId(c.plantId)"
              >
                <CheckIcon v-if="copied && copiedId === c.plantId" />
                <CopyIcon v-else />
              </Button>
              <!-- Keeps the selects aligned in rows without a copy button, once they share a line -->
              <div v-else class="hidden size-11 shrink-0 sm:block md:size-9" aria-hidden="true" />
            </div>
          </li>
        </ul>
      </CardContent>
    </Card>

    <Card v-if="freePlants.length">
      <CardHeader>
        <CardTitle>{{ t('classes.freePlants') }}</CardTitle>
        <CardDescription>{{ t('classes.freePlantsHint') }}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul class="flex flex-col divide-y">
          <li
            v-for="p in freePlants"
            :key="p.id"
            class="flex min-h-11 items-center justify-between gap-3 py-2"
          >
            <span class="font-medium">{{ p.name }}</span>
            <Button
              variant="outline"
              class="min-h-11 md:min-h-9"
              :aria-label="t('classes.copyIdOf', { name: p.name })"
              @click="copyId(p.id)"
            >
              <CheckIcon v-if="copied && copiedId === p.id" />
              <CopyIcon v-else />
              {{ t('classes.copyId') }}
            </Button>
          </li>
        </ul>
      </CardContent>
    </Card>

    <NewClassDialog v-model:open="newClassOpen" />
    <NewPlantDialog v-model:open="newPlantOpen" />

    <Dialog
      :open="!!pendingMove"
      @update:open="(open) => !open && !busy && (pendingMove = undefined)"
    >
      <DialogContent v-if="pendingMove">
        <DialogHeader>
          <DialogTitle>{{ t('classes.moveTitle', { plant: pendingMove.plant }) }}</DialogTitle>
          <DialogDescription>
            {{
              t('classes.moveText', {
                plant: pendingMove.plant,
                from: pendingMove.from,
                to: pendingMove.to.name,
              })
            }}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            class="min-h-11"
            :disabled="busy"
            @click="pendingMove = undefined"
          >
            {{ t('classes.cancel') }}
          </Button>
          <Button class="min-h-11" :disabled="busy" @click="confirmMove">
            {{ t('classes.move') }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
