import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NoiseView from '@/views/NoiseView.vue';
import { i18n, setLocale } from './i18n';

afterEach(() => {
  setLocale('en');
  localStorage.clear();
  vi.restoreAllMocks();
  vi.resetModules();
});

async function freshLocale(languages: string[]) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages);
  vi.resetModules();
  const fresh = await import('./i18n');
  return fresh.i18n.global.locale.value;
}

describe('initial locale', () => {
  it('follows the first browser language we have', async () => {
    expect(await freshLocale(['fr-FR', 'de-AT', 'en'])).toBe('de');
  });

  it('falls back to English', async () => {
    expect(await freshLocale(['fr-FR'])).toBe('en');
  });

  it('prefers the language picked before', async () => {
    localStorage.setItem('locale', 'en');
    expect(await freshLocale(['de-DE'])).toBe('en');
  });
});

describe('setLocale', () => {
  it('switches a mounted page at once and remembers the choice', async () => {
    const wrapper = mount(NoiseView);
    expect(wrapper.find('h1').text()).toBe('Noise level');

    setLocale('de');
    await wrapper.vm.$nextTick();
    expect(wrapper.find('h1').text()).toBe('Lautstärke');
    expect(wrapper.find('button').text()).toBe('Messung starten');
    expect(document.documentElement.lang).toBe('de');
    expect(localStorage.getItem('locale')).toBe('de');
    wrapper.unmount();
  });

  it('formats numbers and dates in the language', () => {
    setLocale('de');
    expect(i18n.global.n(54.25, 'oneDecimal')).toBe('54,3');
    setLocale('en');
    expect(i18n.global.n(54.25, 'oneDecimal')).toBe('54.3');
  });
});
