import { config } from '@vue/test-utils';
import { i18n } from '@/lib/i18n';

// Every mounted component gets i18n, in English unless a test switches it
i18n.global.locale.value = 'en';
config.global.plugins.push(i18n);
