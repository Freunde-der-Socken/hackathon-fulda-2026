import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SensorsView from './SensorsView.vue';

const reading = (sensorId: string, unit: string, value: number, s: number) => {
  const ts = new Date(Date.UTC(2026, 0, 1, 0, 0, s)).toISOString();
  return { sensorId, unit, value, recordedAt: ts, receivedAt: ts };
};

afterEach(() => vi.unstubAllGlobals());

describe('SensorsView', () => {
  it('renders one chart per data type', async () => {
    const items = [
      reading('temp_sensor_01', 'C', 24.2, 0),
      reading('temp_sensor_01', 'C', 24.5, 2),
      reading('humidity_sensor_01', '%', 22, 1),
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ items }))),
    );
    const wrapper = mount(SensorsView);
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain('Temperature');
    expect(text).toContain('Humidity');
    expect(wrapper.findAll('svg[role="img"]')).toHaveLength(2);
    wrapper.unmount();
  });
});
