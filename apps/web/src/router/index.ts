import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    {
      path: '/sensors',
      name: 'sensors',
      component: () => import('@/views/SensorsView.vue'),
      meta: { fullWidth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
});

declare module 'vue-router' {
  interface RouteMeta {
    /** Use the whole width next to the sidebar instead of the readable max-w-4xl column. */
    fullWidth?: boolean;
  }
}
