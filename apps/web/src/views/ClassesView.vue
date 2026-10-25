<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useClassesStore } from '@/stores/classes';

const store = useClassesStore();
const { classes, plants, error } = storeToRefs(store);
void store.load();

const classById = computed(() => new Map(classes.value?.map((c) => [c.id, c])));
const plantById = computed(() => new Map(plants.value?.map((p) => [p.id, p])));
// Only classes without a plant can get one: moving an assignment is an open decision (GREEN-29)
const freeClasses = computed(() => classes.value?.filter((c) => !c.plantId) ?? []);

const newClass = ref('');
const newPlant = ref('');
/** Class picked in each unassigned plant's row, by plant id. */
const picked = reactive<Record<string, string>>({});
const busy = ref(false);

async function run(action: () => Promise<unknown>, done: string) {
  busy.value = true;
  try {
    await action();
    toast.success(done);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Something went wrong');
  } finally {
    busy.value = false;
  }
}

async function addClass() {
  const name = newClass.value.trim();
  if (!name) return;
  await run(() => store.createClass(name), `Added ${name}`);
  newClass.value = '';
}

async function addPlant() {
  const name = newPlant.value.trim();
  if (!name) return;
  await run(() => store.createPlant(name), `Added ${name}`);
  newPlant.value = '';
}

function connect(plantId: string) {
  const classId = picked[plantId];
  if (!classId) return;
  const name = classById.value.get(classId)?.name;
  void run(() => store.assign(plantId, classId), `Connected to ${name}`);
}

function disconnect(plantId: string) {
  void run(() => store.disconnect(plantId), 'Disconnected');
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      <h1 class="text-2xl font-semibold">Classes and plants</h1>
      <p class="text-sm text-muted-foreground">
        Each class has one plant. Readings count for the class the plant belongs to when they
        arrive.
      </p>
    </div>

    <p
      v-if="error"
      class="rounded-md border border-destructive/50 p-3 text-sm text-destructive"
      role="alert"
    >
      {{ error }}
    </p>

    <div class="grid gap-4 md:grid-cols-2 md:items-start">
      <Card>
        <CardHeader>
          <CardTitle>Classes</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <Skeleton v-if="!classes && !error" class="h-24 w-full" />
          <p v-else-if="classes && !classes.length" class="text-sm text-muted-foreground">
            No classes yet.
          </p>
          <ul v-if="classes?.length" class="flex flex-col divide-y">
            <li
              v-for="c in classes"
              :key="c.id"
              class="flex min-h-11 items-center justify-between gap-3 py-2"
            >
              <span class="font-medium">{{ c.name }}</span>
              <Badge v-if="c.plantId" variant="secondary">
                {{ plantById.get(c.plantId)?.name ?? 'Unnamed plant' }}
              </Badge>
              <Badge v-else variant="outline">No plant</Badge>
            </li>
          </ul>
          <form class="flex flex-col gap-2" @submit.prevent="addClass">
            <Label for="new-class">New class</Label>
            <div class="flex gap-2">
              <Input id="new-class" v-model="newClass" placeholder="e.g. 7b" class="min-h-11" />
              <Button type="submit" class="min-h-11" :disabled="busy || !newClass.trim()">
                Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plants</CardTitle>
          <CardDescription>
            A plant sends its id as <code>plantId</code> with every reading.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <Skeleton v-if="!plants && !error" class="h-24 w-full" />
          <p v-else-if="plants && !plants.length" class="text-sm text-muted-foreground">
            No plants yet.
          </p>
          <ul v-if="plants?.length" class="flex flex-col divide-y">
            <li v-for="p in plants" :key="p.id" class="flex flex-col gap-2 py-3">
              <div class="flex flex-wrap items-baseline justify-between gap-x-3">
                <span class="font-medium">{{ p.name }}</span>
                <code class="text-xs break-all text-muted-foreground select-all">{{ p.id }}</code>
              </div>
              <div v-if="p.classId" class="flex items-center justify-between gap-2">
                <span class="text-sm">
                  Class <strong>{{ classById.get(p.classId)?.name ?? 'unknown' }}</strong>
                </span>
                <Button
                  variant="outline"
                  class="min-h-11 md:min-h-9"
                  :disabled="busy"
                  @click="disconnect(p.id)"
                >
                  Disconnect
                </Button>
              </div>
              <div v-else-if="freeClasses.length" class="flex gap-2">
                <Select v-model="picked[p.id]">
                  <SelectTrigger
                    class="min-h-11 flex-1 md:min-h-9"
                    :aria-label="`Class for ${p.name}`"
                  >
                    <SelectValue placeholder="Pick a class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="c in freeClasses" :key="c.id" :value="c.id">
                      {{ c.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  class="min-h-11 md:min-h-9"
                  :disabled="busy || !picked[p.id]"
                  @click="connect(p.id)"
                >
                  Connect
                </Button>
              </div>
              <p v-else class="text-sm text-muted-foreground">
                Every class has a plant. Disconnect one first.
              </p>
            </li>
          </ul>
          <form class="flex flex-col gap-2" @submit.prevent="addPlant">
            <Label for="new-plant">New plant</Label>
            <div class="flex gap-2">
              <Input
                id="new-plant"
                v-model="newPlant"
                placeholder="e.g. Fern by the window"
                class="min-h-11"
              />
              <Button type="submit" class="min-h-11" :disabled="busy || !newPlant.trim()">
                Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
