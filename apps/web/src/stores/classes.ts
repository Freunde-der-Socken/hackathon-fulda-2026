import {
  AssignPlantBody,
  CreatePlantBody,
  CreateSchoolClassBody,
  DEMO_CLASS_ID,
  Plant,
  PlantList,
  type SchoolClass,
  SchoolClass as SchoolClassSchema,
  SchoolClassList,
} from '@repo/contracts';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';

/**
 * Classes, plants and the class the teacher is looking at. Every class-specific page (sensors,
 * lesson, review) reads `selectedId`, and `ClassPicker` changes it. The choice survives reloads.
 */
export const useClassesStore = defineStore('classes', () => {
  const classes = ref<SchoolClass[]>();
  const plants = ref<Plant[]>();
  const error = ref<string>();
  const stored = useLocalStorage('selected-class', DEMO_CLASS_ID);

  /** Falls back to the first class when the stored one was deleted or the list isn't loaded. */
  const selected = computed(
    () => classes.value?.find((c) => c.id === stored.value) ?? classes.value?.[0],
  );
  const selectedId = computed({
    get: () => selected.value?.id ?? stored.value,
    set: (id: string) => (stored.value = id),
  });

  async function load() {
    try {
      const [classList, plantList] = await Promise.all([
        apiGet('/classes', SchoolClassList),
        apiGet('/plants', PlantList),
      ]);
      classes.value = classList.items;
      plants.value = plantList.items;
      error.value = undefined;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Loading the classes failed';
    }
  }

  /** Loads once per session. Pages call this from setup; mutations below reload anyway. */
  let loading: Promise<void> | undefined;
  const ensureLoaded = () => (loading ??= load());

  async function createClass(name: string) {
    const created = await apiPost('/classes', CreateSchoolClassBody, { name }, SchoolClassSchema);
    await load();
    return created;
  }

  async function createPlant(name: string) {
    const created = await apiPost('/plants', CreatePlantBody, { name }, Plant);
    await load();
    return created;
  }

  async function assign(plantId: string, classId: string) {
    await apiPut(`/plants/${plantId}/class`, AssignPlantBody, { classId }, Plant);
    await load();
  }

  async function disconnect(plantId: string) {
    await apiDelete(`/plants/${plantId}/class`, Plant);
    await load();
  }

  return {
    classes,
    plants,
    error,
    selected,
    selectedId,
    load,
    ensureLoaded,
    createClass,
    createPlant,
    assign,
    disconnect,
  };
});
