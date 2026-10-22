import * as tf from '@tensorflow/tfjs';
import { setWasmPaths } from '@tensorflow/tfjs-backend-wasm';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

/**
 * Selects the WASM backend and falls back to the pure-JS CPU backend if it can't start.
 * Returns the name of the backend in use.
 */
export async function initBackend(): Promise<string> {
  // Node can't fetch the .wasm files over HTTP, so point tfjs at the installed package
  const wasmDir = path.dirname(
    createRequire(import.meta.url).resolve('@tensorflow/tfjs-backend-wasm'),
  );
  setWasmPaths(`${pathToFileURL(wasmDir).href}/`);
  try {
    if (await tf.setBackend('wasm')) {
      await tf.ready();
      return tf.getBackend();
    }
  } catch {
    // fall through to the CPU backend
  }
  await tf.setBackend('cpu');
  await tf.ready();
  return tf.getBackend();
}
