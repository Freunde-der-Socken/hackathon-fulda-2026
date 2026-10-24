import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

// Tests run without a database (see vitest.config.ts), so only the "disabled" case is covered here
describe('classes and plants', () => {
  const appPromise = buildApp();
  afterAll(async () => (await appPromise).close());

  it.each(['/api/classes', '/api/plants'])(
    '%s is not registered without a database',
    async (url) => {
      const app = await appPromise;
      const res = await app.inject({ url });
      expect(res.statusCode).toBe(404);
    },
  );
});
