<script setup lang="ts">
import { NOISE_RULES, WorkMode } from '@repo/contracts';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useClassesStore } from '@/stores/classes';

// Sets how loud the selected class may be. At the mode's maxDb the plant's stalk is fully drawn
// in (docs/concept.md, "Noise score"). The slider positions follow the order of the enum.
const MODES = WorkMode.options;

const store = useClassesStore();
const { selected } = storeToRefs(store);
void store.ensureLoaded();
const { t } = useI18n();

/** The position while the teacher drags, until the API has saved it. */
const dragging = ref<number>();
const busy = ref(false);
watch(
  () => selected.value?.id,
  () => (dragging.value = undefined),
);

const index = computed(() => dragging.value ?? MODES.indexOf(selected.value?.workMode ?? 'silent'));
const mode = computed(() => MODES[index.value] ?? 'silent');

async function save(next: WorkMode) {
  const cls = selected.value;
  if (!cls || next === cls.workMode) {
    dragging.value = undefined;
    return;
  }
  busy.value = true;
  try {
    await store.setWorkMode(cls.id, next);
    toast.success(t('lesson.workModeSaved', { mode: t(`lesson.modes.${next}`) }));
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('errors.generic'));
  } finally {
    dragging.value = undefined;
    busy.value = false;
  }
}

const ALIGN = ['text-left', 'text-center', 'text-right'];
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t('lesson.workMode') }}</CardTitle>
      <CardDescription>{{ t('lesson.workModeHint') }}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <Skeleton v-if="!selected" class="h-24 w-full" />
      <template v-else>
        <Slider
          :model-value="[index]"
          :min="0"
          :max="MODES.length - 1"
          :step="1"
          :disabled="busy"
          :aria-label="t('lesson.workMode')"
          class="py-3 [&_[data-slot=slider-thumb]]:size-6"
          @update:model-value="(v) => (dragging = v?.[0])"
          @value-commit="(v) => save(MODES[v[0] ?? 0] ?? 'silent')"
        />
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="(m, i) in MODES"
            :key="m"
            type="button"
            :aria-pressed="m === mode"
            :disabled="busy"
            :class="
              cn(
                'flex min-h-11 min-w-0 flex-col rounded-md px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50',
                ALIGN[i],
                m === mode && 'font-semibold text-foreground',
              )
            "
            @click="save(m)"
          >
            <span>{{ t(`lesson.modes.${m}`) }}</span>
            <span class="text-xs font-normal tabular-nums">
              {{ t('lesson.dbRange', NOISE_RULES.modes[m]) }}
            </span>
          </button>
        </div>
        <p class="text-sm text-muted-foreground" aria-live="polite">
          {{ t('lesson.workModeMax', { db: NOISE_RULES.modes[mode].maxDb }) }}
        </p>
      </template>
    </CardContent>
  </Card>
</template>
