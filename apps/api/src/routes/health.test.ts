import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

describe('GET /api/health', () => {
  const appPromise = buildApp();
  afterAll(async () => (await appPromise).close());

  it('reports ok with db disabled', async () => {
    const app = await appPromise;
    const res = await app.inject({ url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', db: 'disabled' });
  });
});
