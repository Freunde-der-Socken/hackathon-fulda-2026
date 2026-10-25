import { DEMO_CLASS_ID, DEMO_PLANT_ID } from '@repo/contracts';
import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CO2_ESTIMATE_SENSOR_ID, co2EstimatePlugin, type Co2EstimateOptions } from './co2-estimate';

// Just enough of the Drizzle API for the plugin: select().from() and insert().values()
function fakeDb(mappings: { plantId: string; classId: string }[]) {
  const inserted: Record<string, unknown>[] = [];
  const db = {
    select: () => ({ from: async () => mappings }),
    insert: () => ({ values: async (rows: Record<string, unknown>[]) => inserted.push(...rows) }),
  };
  return { db, inserted };
}

async function build(options: Co2EstimateOptions, db?: unknown) {
  const app = Fastify({ logger: false });
  if (db) app.decorate('db', db as never);
  await app.register(co2EstimatePlugin, { intervalMs: 60_000, ...options });
  await app.ready();
  return app;
}

describe('CO2 estimate', () => {
  const cleanup: (() => unknown)[] = [];
  afterEach(async () => {
    await Promise.all(cleanup.splice(0).map((fn) => fn()));
  });

  it('stores one ppm reading per plant when the app is ready', async () => {
    const { db, inserted } = fakeDb([{ plantId: DEMO_PLANT_ID, classId: DEMO_CLASS_ID }]);
    const source = vi.fn(() => 1234.4);
    const app = await build({ mode: 'estimate', source }, db);
    cleanup.push(() => app.close());

    await vi.waitFor(() => expect(inserted).toHaveLength(1));
    expect(source).toHaveBeenCalledWith(DEMO_CLASS_ID, expect.any(Date));
    expect(inserted[0]).toMatchObject({
      sensorId: CO2_ESTIMATE_SENSOR_ID,
      plantId: DEMO_PLANT_ID,
      classId: DEMO_CLASS_ID,
      value: 1234,
      unit: 'ppm',
    });
  });

  it('stores again every interval', async () => {
    const { db, inserted } = fakeDb([{ plantId: DEMO_PLANT_ID, classId: DEMO_CLASS_ID }]);
    const app = await build({ mode: 'estimate', intervalMs: 20 }, db);
    cleanup.push(() => app.close());
    await vi.waitFor(() => expect(inserted.length).toBeGreaterThanOrEqual(3));
  });

  it('does not store anything when it is off', async () => {
    const { db, inserted } = fakeDb([{ plantId: DEMO_PLANT_ID, classId: DEMO_CLASS_ID }]);
    const source = vi.fn(() => 800);
    const app = await build({ mode: 'off', source, intervalMs: 20 }, db);
    cleanup.push(() => app.close());
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(source).not.toHaveBeenCalled();
    expect(inserted).toHaveLength(0);
  });

  it('starts without a database', async () => {
    const app = await build({ mode: 'estimate' });
    cleanup.push(() => app.close());
    expect(app.hasDecorator('db')).toBe(false);
  });

  it('keeps running when storing fails', async () => {
    const select = vi.fn(() => ({ from: async () => Promise.reject(new Error('db down')) }));
    const app = await build({ mode: 'estimate', intervalMs: 20 }, { select });
    cleanup.push(() => app.close());
    await vi.waitFor(() => expect(select.mock.calls.length).toBeGreaterThanOrEqual(2));
  });
});
