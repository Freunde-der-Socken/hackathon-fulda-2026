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
  SetWorkModeBody,
  type WorkMode,
} from '@repo/contracts';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { i18n } from '@/lib/i18n';

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
      error.value = e instanceof Error ? e.message : i18n.global.t('errors.loadClasses');
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

  /**
   * Connects a plant to a class, moving it away from its old class and freeing the class's old plant
   * first, since the API only connects free pairs. Not atomic: if a step fails, both may end up free.
   */
  async function assign(plantId: string, classId: string) {
    const oldClass = plants.value?.find((p) => p.id === plantId)?.classId;
    const oldPlant = classes.value?.find((c) => c.id === classId)?.plantId;
    if (oldClass === classId) return;
    try {
      if (oldClass) await apiDelete(`/plants/${plantId}/class`, Plant);
      if (oldPlant) await apiDelete(`/plants/${oldPlant}/class`, Plant);
      await apiPut(`/plants/${plantId}/class`, AssignPlantBody, { classId }, Plant);
    } finally {
      await load();
    }
  }

  async function disconnect(plantId: string) {
    await apiDelete(`/plants/${plantId}/class`, Plant);
    await load();
  }

  /** Swaps in the class the API returns, so the slider doesn't wait for a full reload. */
  async function setWorkMode(classId: string, workMode: WorkMode) {
    const updated = await apiPut(
      `/classes/${classId}/work-mode`,
      SetWorkModeBody,
      { workMode },
      SchoolClassSchema,
    );
    classes.value = classes.value?.map((c) => (c.id === updated.id ? updated : c));
    return updated;
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
    setWorkMode,
  };
});
