import { DEMO_CLASS_ID, DEMO_PLANT_ID } from '@repo/contracts';
import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app';

// Tests run without a database (see vitest.config.ts), so only the "disabled" case is covered here.
// The smoothing has its own tests in lib/score-smoother.test.ts.
describe('noise score', () => {
  const appPromise = buildApp();
  afterAll(async () => (await appPromise).close());

  it('is not registered without a database', async () => {
    const app = await appPromise;
    const res = await app.inject({ url: `/api/plants/${DEMO_PLANT_ID}/noise-score` });
    expect(res.statusCode).toBe(404);
  });

  it('does not accept a work mode without a database', async () => {
    const app = await appPromise;
    const res = await app.inject({
      method: 'PUT',
      url: `/api/classes/${DEMO_CLASS_ID}/work-mode`,
      payload: { workMode: 'group' },
    });
    expect(res.statusCode).toBe(404);
  });
});
