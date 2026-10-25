<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { ref, watch } from 'vue';
import { I18nT, useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClassesStore } from '@/stores/classes';

const open = defineModel<boolean>('open', { required: true });
const { t } = useI18n();
const store = useClassesStore();
const { copy } = useClipboard({ legacy: true });

const name = ref('');
const busy = ref(false);

watch(open, (isOpen) => {
  if (isOpen) name.value = '';
});

async function submit() {
  const trimmed = name.value.trim();
  if (!trimmed) return;
  busy.value = true;
  try {
    const created = await store.createPlant(trimmed);
    // The id goes onto the ESP32 next, so offer it right here
    toast.success(t('classes.added', { name: trimmed }), {
      action: { label: t('classes.copyId'), onClick: () => void copy(created.id) },
    });
    open.value = false;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('errors.generic'));
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>{{ t('classes.newPlant') }}</DialogTitle>
          <DialogDescription>
            <I18nT keypath="classes.newPlantHint" scope="global">
              <template #field><code>plantId</code></template>
            </I18nT>
          </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-2">
          <Label for="new-plant-name">{{ t('classes.name') }}</Label>
          <Input
            id="new-plant-name"
            v-model="name"
            :placeholder="t('classes.newPlantPlaceholder')"
            class="min-h-11"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" class="min-h-11" @click="open = false">
            {{ t('classes.cancel') }}
          </Button>
          <Button type="submit" class="min-h-11" :disabled="busy || !name.trim()">
            {{ t('classes.add') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
