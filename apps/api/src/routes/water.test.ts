import { DEMO_CLASS_ID } from '@repo/contracts';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

// Tests run without a database (see vitest.config.ts), so only the "disabled" case is covered here
describe('water', () => {
  const appPromise = buildApp();
  afterAll(async () => (await appPromise).close());

  it('is not registered without a database', async () => {
    const app = await appPromise;
    const res = await app.inject({ url: `/api/classes/${DEMO_CLASS_ID}/water` });
    expect(res.statusCode).toBe(404);
  });
});
