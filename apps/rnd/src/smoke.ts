import { initBackend, loadModel, saveModel } from '@repo/ml';
import * as tf from '@tensorflow/tfjs';
import { mkdtemp, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';

const print = (line: string) => process.stdout.write(`${line}\n`);

const Env = z.object({
  DATABASE_URL: z.url().optional(),
});
// Same rule as the API: an empty value means "unset"
const env = Env.parse(Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== '')));

const DEFAULT_PORTS: Record<string, number> = {
  'postgres:': 5432,
  'postgresql:': 5432,
};

function checkTcp(name: string, value: string | undefined): Promise<void> {
  if (!value) {
    print(`${name}: not set, skipped`);
    return Promise.resolve();
  }
  const url = new URL(value);
  const port = Number(url.port) || DEFAULT_PORTS[url.protocol] || 80;
  return new Promise((resolve) => {
    const socket = net.connect({ host: url.hostname, port, timeout: 2000 });
    const done = (result: string) => {
      print(`${name}: ${result}`);
      socket.destroy();
      resolve();
    };
    socket.once('connect', () => done('reachable'));
    socket.once('timeout', () => done('timeout'));
    socket.once('error', (err) => done(`unreachable (${err.message})`));
  });
}

const backend = await initBackend();

const model = tf.sequential({
  layers: [
    tf.layers.dense({ units: 1, inputShape: [2], weights: [tf.ones([2, 1]), tf.zeros([1])] }),
  ],
});
const dir = await mkdtemp(path.join(os.tmpdir(), 'rnd-smoke-'));
try {
  await saveModel(model, dir, {
    name: 'smoke',
    version: '0.0.0',
    format: 'tfjs-layers',
    input: { shape: [2] },
    output: { shape: [1] },
  });
  const loaded = await loadModel(dir);
  const sum = (await loaded.predict([1, 2]))[0]?.[0];
  if (sum !== 3) throw new Error(`Expected 3, got ${sum}`);
  loaded.dispose();

  // Local training fallback: 2 epochs on three constant points
  const trainable = tf.sequential({
    layers: [tf.layers.dense({ units: 1, inputShape: [1] })],
  });
  trainable.compile({ optimizer: 'sgd', loss: 'meanSquaredError' });
  const xs = tf.tensor2d([[1], [1], [1]]);
  const ys = tf.tensor2d([[2], [2], [2]]);
  const history = await trainable.fit(xs, ys, { epochs: 2, verbose: 0 });
  if (history.history.loss?.length !== 2) throw new Error('fit did not run 2 epochs');
  xs.dispose();
  ys.dispose();
} finally {
  await rm(dir, { recursive: true, force: true });
}

print(`backend: ${backend}`);
print('save/load/predict: ok');
print('fit: ok');
await checkTcp('DATABASE_URL', env.DATABASE_URL);
