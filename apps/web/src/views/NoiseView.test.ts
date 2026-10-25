import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { SPL_OFFSET, toDb, toSpl } from '@/composables/useMicLevel';
import NoiseView from './NoiseView.vue';

describe('NoiseView', () => {
  it('renders the meter and a start button', () => {
    const wrapper = mount(NoiseView);
    expect(wrapper.text()).toContain('Noise level');
    expect(wrapper.find('[role="meter"]').exists()).toBe(true);
    expect(wrapper.find('button').text()).toBe('Start measuring');
  });

  it('offers the automatic mode for silent phases', () => {
    const wrapper = mount(NoiseView);
    expect(wrapper.text()).toContain('Silent phases');
    expect(wrapper.findAll('button').map((b) => b.text())).toContain('Get ready');
  });
});

describe('toDb', () => {
  it('converts amplitude to dBFS and clamps it', () => {
    expect(toDb(1)).toBe(0);
    expect(toDb(0.1)).toBeCloseTo(-20);
    expect(toDb(0)).toBe(-96);
    expect(toDb(2)).toBe(0);
  });
});

describe('toSpl', () => {
  it('shifts dBFS by the estimated offset', () => {
    expect(toSpl(0)).toBe(SPL_OFFSET);
    expect(toSpl(-22.4)).toBeCloseTo(89.6);
  });
});
