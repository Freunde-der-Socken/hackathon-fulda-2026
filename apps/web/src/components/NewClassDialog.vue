<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClassesStore } from '@/stores/classes';

const NONE = 'none';

const open = defineModel<boolean>('open', { required: true });
const { t } = useI18n();
const store = useClassesStore();
const { plants } = storeToRefs(store);
const freePlants = computed(() => plants.value?.filter((p) => !p.classId) ?? []);

const name = ref('');
const plantId = ref(NONE);
const busy = ref(false);

watch(open, (isOpen) => {
  if (!isOpen) return;
  name.value = '';
  plantId.value = NONE;
});

async function submit() {
  const trimmed = name.value.trim();
  if (!trimmed) return;
  busy.value = true;
  try {
    const created = await store.createClass(trimmed);
    if (plantId.value !== NONE) await store.assign(plantId.value, created.id);
    toast.success(t('classes.added', { name: trimmed }));
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
          <DialogTitle>{{ t('classes.newClass') }}</DialogTitle>
          <DialogDescription>{{ t('classes.newClassHint') }}</DialogDescription>
        </DialogHeader>
        <div class="flex flex-col gap-2">
          <Label for="new-class-name">{{ t('classes.name') }}</Label>
          <Input
            id="new-class-name"
            v-model="name"
            :placeholder="t('classes.newClassPlaceholder')"
            class="min-h-11"
          />
        </div>
        <div v-if="freePlants.length" class="flex flex-col gap-2">
          <Label for="new-class-plant">{{ t('classes.plant') }}</Label>
          <Select v-model="plantId">
            <SelectTrigger id="new-class-plant" class="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="NONE">{{ t('classes.noPlant') }}</SelectItem>
              <SelectItem v-for="p in freePlants" :key="p.id" :value="p.id">
                {{ p.name }}
              </SelectItem>
            </SelectContent>
          </Select>
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
