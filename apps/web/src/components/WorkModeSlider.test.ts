import { DEMO_CLASS_ID, NOISE_RULES } from '@repo/contracts';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkModeSlider from './WorkModeSlider.vue';

const demoClass = {
  id: DEMO_CLASS_ID,
  name: 'Demo class',
  plantId: null,
  workMode: 'silent',
  createdAt: '2026-10-24T10:00:00.000Z',
};

function respond(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}

const fetch = vi.fn((url: string, init?: RequestInit) => {
  if (init?.method === 'PUT') {
    const { workMode } = JSON.parse(String(init.body)) as { workMode: string };
    return respond({ ...demoClass, workMode });
  }
  return respond({ items: url.endsWith('/classes') ? [demoClass] : [] });
});

beforeEach(() => {
  setActivePinia(createPinia());
  fetch.mockClear();
  vi.stubGlobal('fetch', fetch);
});
afterEach(() => vi.unstubAllGlobals());

const pressed = (wrapper: ReturnType<typeof mount>) =>
  wrapper.find('button[aria-pressed="true"]').text();

describe('WorkModeSlider', () => {
  it('shows the saved work mode and the dB range of each mode', async () => {
    const wrapper = mount(WorkModeSlider);
    await flushPromises();
    expect(pressed(wrapper)).toContain('Silent work');
    const { minDb, maxDb } = NOISE_RULES.modes.group;
    expect(wrapper.text()).toContain(`${minDb}–${maxDb} dB`);
    expect(wrapper.text()).toContain(`fully drawn in at ${NOISE_RULES.modes.silent.maxDb} dB`);
    wrapper.unmount();
  });

  it('saves a new work mode through the API', async () => {
    const wrapper = mount(WorkModeSlider);
    await flushPromises();
    const group = wrapper.findAll('button').find((b) => b.text().includes('Group work'));
    await group?.trigger('click');
    await flushPromises();
    expect(fetch).toHaveBeenCalledWith(
      `/api/classes/${DEMO_CLASS_ID}/work-mode`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ workMode: 'group' }) }),
    );
    expect(pressed(wrapper)).toContain('Group work');
    wrapper.unmount();
  });
});
