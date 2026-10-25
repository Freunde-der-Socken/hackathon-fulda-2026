import fp from 'fastify-plugin';
import { estimateCo2 } from '../co2';
import { plantClasses, sensorReadings } from '../db/schema';
import { env } from '../env';

/** Where the CO2 value of a class comes from, in ppm. Replace it to calculate it differently. */
export type Co2Source = (classId: string, at: Date) => number | Promise<number>;

/** sensorId of the stored estimates, so a real CO2 sensor's readings stay apart in the charts. */
export const CO2_ESTIMATE_SENSOR_ID = 'co2-estimate';

export interface Co2EstimateOptions {
  /** Defaults to CO2_SOURCE. `off` when a real sensor POSTs its readings to /api/sensor-data. */
  mode?: 'estimate' | 'off';
  /** Defaults to the demo room (`estimateCo2`). */
  source?: Co2Source;
  intervalMs?: number;
}

// Stores the CO2 value of every class with a plant as an ordinary sensor reading, so it shows up
// in GET /api/sensor-data and the charts like the plant's own sensors. Needs the db plugin first.
export const co2EstimatePlugin = fp<Co2EstimateOptions>(
  async (
    app,
    { mode = env.CO2_SOURCE, source = (_classId, at) => estimateCo2(at), intervalMs = 60_000 },
  ) => {
    if (mode === 'off') {
      app.log.info('CO2_SOURCE is off, not storing a CO2 estimate');
      return;
    }
    if (!app.hasDecorator('db')) return;

    async function record() {
      const at = new Date();
      const mappings = await app.db.select().from(plantClasses);
      if (!mappings.length) return;
      const rows = await Promise.all(
        mappings.map(async ({ plantId, classId }) => ({
          sensorId: CO2_ESTIMATE_SENSOR_ID,
          plantId,
          classId,
          value: Math.round(await source(classId, at)),
          unit: 'ppm',
          recordedAt: at,
          receivedAt: at,
        })),
      );
      await app.db.insert(sensorReadings).values(rows);
      app.log.debug({ classes: rows.length }, 'CO2 estimate stored');
    }
    const tick = () =>
      record().catch((err: unknown) => app.log.warn({ err }, 'Could not store the CO2 estimate'));

    let timer: NodeJS.Timeout | undefined;
    app.addHook('onReady', async () => {
      void tick();
      timer = setInterval(tick, intervalMs);
    });
    app.addHook('onClose', async () => clearInterval(timer));
  },
  { name: 'co2-estimate' },
);
