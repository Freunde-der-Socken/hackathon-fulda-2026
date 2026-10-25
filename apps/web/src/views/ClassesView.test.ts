import { DEMO_CLASS_ID, DEMO_PLANT_ID } from '@repo/contracts';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useClassesStore } from '@/stores/classes';
import ClassesView from './ClassesView.vue';

const createdAt = '2026-10-24T10:00:00.000Z';
const SPARE_PLANT = '0b5a7c3e-1d2f-4a6b-8c9d-0e1f2a3b4c5d';
const SPARE_CLASS = '9c8b7a6d-5e4f-4321-8fed-cba987654321';

function respond(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}

describe('ClassesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (init?.method === 'PUT' || init?.method === 'DELETE') {
          return respond({ id: SPARE_PLANT, name: 'Fern', classId: null, createdAt });
        }
        return url.endsWith('/classes')
          ? respond({
              items: [
                {
                  id: DEMO_CLASS_ID,
                  name: 'Demo class',
                  plantId: DEMO_PLANT_ID,
                  workMode: 'silent',
                  createdAt,
                },
                { id: SPARE_CLASS, name: '7b', plantId: null, workMode: 'silent', createdAt },
              ],
            })
          : respond({
              items: [
                { id: DEMO_PLANT_ID, name: 'Demo plant', classId: DEMO_CLASS_ID, createdAt },
                { id: SPARE_PLANT, name: 'Fern', classId: null, createdAt },
              ],
            });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows each class with its plant and lists the free plants', async () => {
    const wrapper = mount(ClassesView);
    await flushPromises();
    const rows = wrapper.findAll('li').map((li) => li.text());
    expect(rows[0]).toContain('Demo class');
    expect(rows[0]).toContain('Demo plant');
    expect(rows[1]).toContain('7b');
    expect(rows[1]).toContain('Pick a plant');
    // The free plant offers its id for the ESP32 instead of printing it
    expect(rows[2]).toContain('Fern');
    expect(rows[2]).toContain('Copy id');
    expect(wrapper.text()).not.toContain(SPARE_PLANT);
  });

  it('frees the class before connecting another plant to it', async () => {
    const store = useClassesStore();
    await store.load();
    await store.assign(SPARE_PLANT, DEMO_CLASS_ID);
    const writes = vi
      .mocked(fetch)
      .mock.calls.filter(([, init]) => init?.method && init.method !== 'GET')
      .map(([url, init]) => `${init?.method} ${String(url)}`);
    expect(writes).toEqual([
      `DELETE /api/plants/${DEMO_PLANT_ID}/class`,
      `PUT /api/plants/${SPARE_PLANT}/class`,
    ]);
  });
});
