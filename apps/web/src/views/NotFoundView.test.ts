import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import NotFoundView from './NotFoundView.vue';

describe('NotFoundView', () => {
  it('renders the message and a link home', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: NotFoundView }],
    });
    await router.push('/');
    const wrapper = mount(NotFoundView, { global: { plugins: [router] } });
    expect(wrapper.text()).toContain('Page not found');
    expect(wrapper.find('a').attributes('href')).toBe('/');
  });
});
