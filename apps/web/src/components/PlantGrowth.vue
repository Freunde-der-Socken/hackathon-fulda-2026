<script setup lang="ts">
import { computed } from 'vue';

// The digital plant (docs/concept.md, watering mode): a sprout at 0 that grows leaves and a bud
// and blooms in colour at 1, like the physical plant's stalk and LED ring.
const props = defineProps<{
  /** 0 = sprout, 1 = full bloom. Values outside are clamped. */
  growth: number;
}>();

const g = computed(() => Math.min(1, Math.max(0, props.growth)));
const GROUND = 96;
const top = computed(() => GROUND - 14 - 62 * g.value);

// Leaf pairs appear one after another as the stalk grows
const leaves = computed(() =>
  [0, 0.3, 0.55]
    .filter((at) => g.value >= at)
    .map((at, i) => ({
      y: GROUND - 8 - (GROUND - 8 - top.value) * (0.25 + i * 0.28),
      size: 0.7 + at,
    })),
);

const PETALS = [5, 4, 7, 2, 5, 4];
</script>

<template>
  <svg viewBox="0 0 100 120" role="img" :aria-label="`Plant, ${Math.round(g * 100)} % grown`">
    <path
      :d="`M50 ${GROUND} L50 ${top}`"
      stroke="var(--primary)"
      stroke-width="4"
      stroke-linecap="round"
    />
    <g v-for="(leaf, i) in leaves" :key="i" fill="var(--primary)">
      <ellipse
        :cx="50 - 9 * leaf.size"
        :cy="leaf.y"
        :rx="9 * leaf.size"
        :ry="4 * leaf.size"
        :transform="`rotate(-25 ${50 - 9 * leaf.size} ${leaf.y})`"
      />
      <ellipse
        :cx="50 + 9 * leaf.size"
        :cy="leaf.y - 4"
        :rx="9 * leaf.size"
        :ry="4 * leaf.size"
        :transform="`rotate(25 ${50 + 9 * leaf.size} ${leaf.y - 4})`"
      />
    </g>
    <g v-if="g >= 1">
      <circle
        v-for="(series, i) in PETALS"
        :key="i"
        :cx="50 + 9 * Math.cos((i * Math.PI) / 3)"
        :cy="top + 9 * Math.sin((i * Math.PI) / 3)"
        r="7"
        :fill="`var(--series-${series})`"
      />
      <circle cx="50" :cy="top" r="5" fill="var(--warning)" />
    </g>
    <ellipse v-else-if="g >= 0.75" cx="50" :cy="top - 3" rx="4" ry="6" fill="var(--primary)" />
    <path d="M30 96 H70 L65 118 H35 Z" class="fill-amber-700 dark:fill-amber-600" />
  </svg>
</template>
