import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import HomeView from './HomeView.vue';

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.unstubAllGlobals());

describe('HomeView', () => {
  it('links to every page, even without the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 502 })),
    );
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:any(.*)*', component: HomeView }],
    });
    await router.push('/');
    const wrapper = mount(HomeView, { global: { plugins: [router] } });
    await flushPromises();
    const links = wrapper.findAll('nav a').map((a) => a.attributes('href'));
    expect(links).toEqual(['/lesson', '/sensors', '/review', '/noise', '/classes']);
    wrapper.unmount();
  });
});
