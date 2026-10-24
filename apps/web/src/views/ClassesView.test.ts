import { DEMO_CLASS_ID, DEMO_PLANT_ID } from '@repo/contracts';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
      vi.fn((url: string) =>
        url.endsWith('/classes')
          ? respond({
              items: [
                { id: DEMO_CLASS_ID, name: 'Demo class', plantId: DEMO_PLANT_ID, createdAt },
                { id: SPARE_CLASS, name: '7b', plantId: null, createdAt },
              ],
            })
          : respond({
              items: [
                { id: DEMO_PLANT_ID, name: 'Demo plant', classId: DEMO_CLASS_ID, createdAt },
                { id: SPARE_PLANT, name: 'Fern', classId: null, createdAt },
              ],
            }),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lists classes and plants with their assignment', async () => {
    const wrapper = mount(ClassesView);
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('Demo class');
    expect(text).toContain('No plant');
    expect(text).toContain(SPARE_PLANT);
    // The connected plant can be disconnected, the spare one connected
    const buttons = wrapper.findAll('button').map((b) => b.text());
    expect(buttons).toContain('Disconnect');
    expect(buttons).toContain('Connect');
  });
});
