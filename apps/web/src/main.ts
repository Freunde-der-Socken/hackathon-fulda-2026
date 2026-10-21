import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
// oxlint-disable-next-line import/no-unassigned-import
import './style.css';

createApp(App).use(createPinia()).use(router).mount('#app');
