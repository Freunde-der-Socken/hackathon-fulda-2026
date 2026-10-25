import { DEMO_CLASS_ID, DEMO_PLANT_ID } from '@repo/contracts';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SensorsView from './SensorsView.vue';

const reading = (sensorId: string, unit: string, value: number, s: number) => {
  const ts = new Date(Date.UTC(2026, 0, 1, 0, 0, s)).toISOString();
  return {
    sensorId,
    plantId: DEMO_PLANT_ID,
    classId: DEMO_CLASS_ID,
    unit,
    value,
    recordedAt: ts,
    receivedAt: ts,
  };
};

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.unstubAllGlobals());

describe('SensorsView', () => {
  it('renders one chart per data type of the selected class', async () => {
    const items = [
      reading('temp_sensor_01', 'C', 24.2, 0),
      reading('temp_sensor_01', 'C', 24.5, 2),
      reading('humidity_sensor_01', '%', 22, 1),
    ];
    const fetch = vi.fn(
      async (url: string) =>
        // The class picker loads classes and plants too
        new Response(JSON.stringify({ items: url.includes('/sensor-data') ? items : [] })),
    );
    vi.stubGlobal('fetch', fetch);
    const wrapper = mount(SensorsView);
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('Temperature');
    expect(text).toContain('Humidity');
    expect(wrapper.findAll('svg[role="img"]')).toHaveLength(2);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/sensor-data?classId=${DEMO_CLASS_ID}`),
      expect.anything(),
    );
    wrapper.unmount();
  });
});
