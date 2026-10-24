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

  it('does not accept readings without a database', async () => {
    const app = await appPromise;
    const res = await app.inject({
      method: 'POST',
      url: '/api/sensor-data',
      payload: {
        sensorId: 'moisture-1',
        plantId: '6f1c0b6e-2a4d-4c43-9a8e-0d6a2f1b7c11',
        value: 42,
      },
    });
    expect(res.statusCode).toBe(404);
  });
});
