import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

describe('/api/sensor-data', () => {
  const appPromise = buildApp();
  afterAll(async () => (await appPromise).close());

  it('stores a reading and lists it', async () => {
    const app = await appPromise;
    const post = await app.inject({
      method: 'POST',
      url: '/api/sensor-data',
      payload: { sensorId: 'temp-1', value: 21.5, unit: '°C' },
    });
    expect(post.statusCode).toBe(201);
    expect(post.json()).toMatchObject({ sensorId: 'temp-1', value: 21.5, unit: '°C' });

    const res = await app.inject({ url: '/api/sensor-data?sensorId=temp-1' });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toHaveLength(1);
  });

  it('rejects an invalid reading', async () => {
    const app = await appPromise;
    const res = await app.inject({
      method: 'POST',
      url: '/api/sensor-data',
      payload: { sensorId: 'temp-1', value: 'warm' },
    });
    expect(res.statusCode).toBe(400);
  });
});
