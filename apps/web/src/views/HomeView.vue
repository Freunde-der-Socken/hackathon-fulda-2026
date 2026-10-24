<script setup lang="ts">
import { WATER_RULES, WaterSummary } from '@repo/contracts';
import { ChevronRightIcon, DropletIcon, TimerIcon } from '@lucide/vue';
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import ClassPicker from '@/components/ClassPicker.vue';
import PlantGrowth from '@/components/PlantGrowth.vue';
import { Card, CardContent } from '@/components/ui/card';
import { apiGet } from '@/lib/api';
import { navItems } from '@/lib/navigation';
import { phaseStart } from '@/lib/phases';
import { useClassesStore } from '@/stores/classes';

// One line per page, shown on its card. Pages without one (Home, API docs) get no card.
const DESCRIPTIONS: Record<string, string> = {
  '/lesson': 'Start a silent phase and award water during the lesson.',
  '/sensors': "Temperature, humidity, light and noise of the class's plant as charts.",
  '/review': 'The plant of every day and week, to look back on with the class.',
  '/classes': 'Create classes and plants and connect them.',
  '/noise': 'Turns a phone into the noise sensor of the room.',
};
const pages = computed(() =>
  navItems.flatMap((item) => {
    const description = DESCRIPTIONS[item.to];
    return description ? [{ ...item, description }] : [];
  }),
);

const { selected, selectedId: classId } = storeToRefs(useClassesStore());
const week = ref<WaterSummary>();

async function load() {
  const requested = classId.value;
  const from = phaseStart('week').toISOString();
  try {
    const result = await apiGet(
      `/classes/${requested}/water?${new URLSearchParams({ from })}`,
      WaterSummary,
    );
    if (requested === classId.value) week.value = result;
  } catch {
    // The overview is a bonus: without the API the links below still work
    week.value = undefined;
  }
}
void load();
watch(classId, load);
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-2xl font-semibold">Hello!</h1>
      <ClassPicker />
    </div>

    <Card v-if="week">
      <CardContent class="flex items-center gap-4">
        <PlantGrowth :growth="week.total / WATER_RULES.fullBloom.week" class="h-28 w-24 shrink-0" />
        <div class="flex flex-col gap-1">
          <span class="text-sm text-muted-foreground">
            {{ selected?.name ?? 'Your class' }} this week
          </span>
          <span class="flex items-center gap-2 text-3xl font-bold text-water tabular-nums">
            <DropletIcon class="size-6" aria-hidden="true" />
            {{ week.total }}
          </span>
          <RouterLink
            v-if="week.activeSilentPhase"
            to="/lesson"
            class="flex items-center gap-1 text-sm font-medium text-primary"
          >
            <TimerIcon class="size-4" aria-hidden="true" />
            Silent phase running
          </RouterLink>
        </div>
      </CardContent>
    </Card>

    <nav aria-label="Pages">
      <ul class="grid gap-3 sm:grid-cols-2">
        <li v-for="page in pages" :key="page.to">
          <RouterLink
            :to="page.to"
            class="flex min-h-20 items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"
            >
              <component :is="page.icon" class="size-5" />
            </span>
            <span class="flex flex-1 flex-col">
              <span class="font-medium">{{ page.label }}</span>
              <span class="text-sm text-muted-foreground">{{ page.description }}</span>
            </span>
            <ChevronRightIcon class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </RouterLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
