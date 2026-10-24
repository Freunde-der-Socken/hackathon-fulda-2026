import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

// Tests run without a database (see vitest.config.ts), so only the "disabled" case is covered here
describe('/api/sensor-data', () => {
  const appPromise = buildApp();
  afterAll(async () => (await appPromise).close());

  it('is not registered without a database', async () => {
    const app = await appPromise;
    const res = await app.inject({ url: '/api/sensor-data' });
    expect(res.statusCode).toBe(404);
  });
});
