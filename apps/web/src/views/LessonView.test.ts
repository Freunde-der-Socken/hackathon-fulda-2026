import { DEMO_CLASS_ID, WATER_RULES } from '@repo/contracts';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LessonView from './LessonView.vue';

const summary = (total: number, active: boolean) => ({
  classId: DEMO_CLASS_ID,
  total,
  events: [],
  activeSilentPhase: active
    ? {
        id: '0ee20042-4b34-46df-a967-ae6931b3ee5f',
        classId: DEMO_CLASS_ID,
        startedAt: new Date().toISOString(),
        endedAt: null,
        quietShare: null,
        water: null,
      }
    : null,
});

function stubWater(active: boolean) {
  let waterCalls = 0;
  const fetch = vi.fn(async (url: string) => {
    if (url.includes('/water')) {
      // The view asks for today first and the week second (on Mondays both start at midnight)
      const isToday = waterCalls++ % 2 === 0;
      return new Response(JSON.stringify(summary(isToday ? 4 : 11, active)));
    }
    return new Response(JSON.stringify({ items: [] }));
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.unstubAllGlobals());

describe('LessonView', () => {
  it('shows the water and the award buttons', async () => {
    stubWater(false);
    const wrapper = mount(LessonView);
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('This week');
    expect(text).toContain('11');
    expect(text).toContain(`+${WATER_RULES.small}`);
    expect(text).toContain('Start silent phase');
    wrapper.unmount();
  });

  it('shows the timer while a silent phase runs', async () => {
    stubWater(true);
    const wrapper = mount(LessonView);
    await flushPromises();
    expect(wrapper.find('[role="timer"]').text()).toBe('00:00');
    expect(wrapper.text()).toContain('Stop and award water');
    wrapper.unmount();
  });
});
