<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClassesStore } from '@/stores/classes';

// Picks the class every class-specific page shows. Hidden while there is only one class.
const store = useClassesStore();
const { classes, selectedId } = storeToRefs(store);
void store.ensureLoaded();

const id = useId();
const { t } = useI18n();
</script>

<template>
  <div v-if="classes && classes.length > 1" class="flex items-center gap-2 text-sm">
    <label :for="id" class="text-muted-foreground">{{ t('classPicker.label') }}</label>
    <Select v-model="selectedId">
      <SelectTrigger :id="id" class="min-h-11 min-w-40 md:min-h-9">
        <SelectValue :placeholder="t('classPicker.placeholder')" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <span v-else-if="classes?.length === 1" class="text-sm text-muted-foreground">
    {{ classes[0]!.name }}
  </span>
</template>
