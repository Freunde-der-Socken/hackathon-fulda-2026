import { DEMO_CLASS_ID, WATER_RULES } from '@repo/contracts';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewView from './ReviewView.vue';

const event = (amount: number, createdAt: Date) => ({
  id: crypto.randomUUID(),
  classId: DEMO_CLASS_ID,
  amount,
  source: 'large',
  createdAt: createdAt.toISOString(),
});

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('ReviewView', () => {
  it("shows this week's plant and the last weeks", async () => {
    const events = [event(WATER_RULES.fullBloom.week, new Date())];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('/water')
          ? new Response(
              JSON.stringify({
                classId: DEMO_CLASS_ID,
                total: WATER_RULES.fullBloom.week,
                events,
                activeSilentPhase: null,
              }),
            )
          : new Response(JSON.stringify({ items: [] })),
      ),
    );
    const wrapper = mount(ReviewView);
    await flushPromises();
    expect(wrapper.text()).toContain('In full bloom!');
    // The big plant plus one per week
    expect(wrapper.findAll('svg[role="img"]')).toHaveLength(1 + 8);
    expect(wrapper.text()).toContain('100 % grown');
    wrapper.unmount();
  });
});
