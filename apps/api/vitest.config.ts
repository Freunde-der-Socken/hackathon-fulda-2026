import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // An empty value counts as unset (see env.ts), so tests run without db and mqtt
    env: { NODE_ENV: 'test', LOG_LEVEL: 'fatal', DATABASE_URL: '', MQTT_URL: '' },
  },
});
