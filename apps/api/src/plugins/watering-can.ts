import { WateringCanUpdate } from '@repo/contracts';
import type { FastifyBaseLogger } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../env';

export interface WateringCan {
  /**
   * POSTs the update to the can's `/water`. Never rejects: a can that is off, unreachable or slow
   * only logs a warning, so callers can fire and forget.
   */
  send: (update: WateringCanUpdate, log?: FastifyBaseLogger) => Promise<void>;
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Only decorated when WATERING_CAN_URL is set. Check with `app.hasDecorator('wateringCan')`. */
    wateringCan: WateringCan;
  }
}

export interface WateringCanOptions {
  /** Defaults to WATERING_CAN_URL. */
  url?: string;
  timeoutMs?: number;
}

export const wateringCanPlugin = fp<WateringCanOptions>(
  async (app, { url = env.WATERING_CAN_URL, timeoutMs = 2000 }) => {
    if (!url) {
      app.log.info('WATERING_CAN_URL not set, not sending water to the watering can');
      return;
    }
    // Keeps a path in the base URL: http://can/esp + water -> http://can/esp/water
    const endpoint = new URL('water', url.endsWith('/') ? url : `${url}/`);
    app.decorate('wateringCan', {
      async send(update, log = app.log) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(WateringCanUpdate.parse(update)),
            signal: AbortSignal.timeout(timeoutMs),
          });
          // Frees the connection, the can's answer isn't used
          await res.body?.cancel();
          if (!res.ok) log.warn({ status: res.status }, 'Watering can rejected the water update');
        } catch (err) {
          log.warn({ err, endpoint: endpoint.href }, 'Watering can not reachable');
        }
      },
    } satisfies WateringCan);
  },
  { name: 'watering-can' },
);
