import { DEMO_CLASS_ID } from '@repo/contracts';
import Fastify from 'fastify';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { wateringCanPlugin, type WateringCanOptions } from './watering-can';

const update = { classId: DEMO_CLASS_ID, total: 12 };

// A stand-in for the watering can's HTTP server on a free port
async function fakeCan(handler: (req: IncomingMessage, res: ServerResponse) => void) {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
}

async function build(options: WateringCanOptions) {
  const app = Fastify({ logger: false });
  await app.register(wateringCanPlugin, options);
  await app.ready();
  return app;
}

describe('watering can', () => {
  const cleanup: (() => unknown)[] = [];
  afterEach(async () => {
    await Promise.all(cleanup.splice(0).map((fn) => fn()));
  });

  it('is not decorated without a URL', async () => {
    const app = await build({ url: undefined });
    cleanup.push(() => app.close());
    expect(app.hasDecorator('wateringCan')).toBe(false);
  });

  it('POSTs the update to /water', async () => {
    let received: { method?: string; url?: string; body: string } | undefined;
    const can = await fakeCan((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk));
      req.on('end', () => {
        received = { method: req.method, url: req.url, body };
        res.end();
      });
    });
    cleanup.push(can.close);
    const app = await build({ url: can.url });
    cleanup.push(() => app.close());

    await app.wateringCan.send(update);
    expect(received).toEqual({ method: 'POST', url: '/water', body: JSON.stringify(update) });
  });

  it('does not throw when the can is unreachable', async () => {
    // Port 1 is privileged and closed, so the connection is refused
    const app = await build({ url: 'http://127.0.0.1:1' });
    cleanup.push(() => app.close());
    await expect(app.wateringCan.send(update)).resolves.toBeUndefined();
  });

  it('does not throw when the can answers with an error', async () => {
    const can = await fakeCan((_req, res) => {
      res.statusCode = 500;
      res.end();
    });
    cleanup.push(can.close);
    const app = await build({ url: can.url });
    cleanup.push(() => app.close());
    await expect(app.wateringCan.send(update)).resolves.toBeUndefined();
  });

  it('gives up after the timeout when the can hangs', async () => {
    // Never answers
    const can = await fakeCan(() => {});
    cleanup.push(can.close);
    const app = await build({ url: can.url, timeoutMs: 100 });
    cleanup.push(() => app.close());

    const started = Date.now();
    await expect(app.wateringCan.send(update)).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
