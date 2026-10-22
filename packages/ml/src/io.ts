import * as tf from '@tensorflow/tfjs';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ModelManifest } from './manifest';
import type { RuntimeModel } from './model';

type Savable = tf.LayersModel | tf.GraphModel;

const MODEL_FILE = 'model.json';
const WEIGHTS_FILE = 'weights.bin';
const MANIFEST_FILE = 'manifest.json';

/**
 * Writes `model.json`, `weights.bin` and `manifest.json` into `dir`.
 * Replaces `file://` saving, which only exists in tfjs-node.
 */
export async function saveModel(
  model: Savable,
  dir: string,
  manifest: ModelManifest,
): Promise<void> {
  const checked = ModelManifest.parse(manifest);
  await mkdir(dir, { recursive: true });
  await model.save(
    tf.io.withSaveHandler(async (artifacts) => {
      const { weightData, weightSpecs, ...rest } = artifacts;
      const modelJson = {
        ...rest,
        weightsManifest: [{ paths: [WEIGHTS_FILE], weights: weightSpecs ?? [] }],
      };
      await writeFile(path.join(dir, MODEL_FILE), JSON.stringify(modelJson));
      if (weightData) {
        const bytes = Array.isArray(weightData)
          ? Buffer.concat(weightData.map((part) => Buffer.from(part)))
          : Buffer.from(weightData);
        await writeFile(path.join(dir, WEIGHTS_FILE), bytes);
      }
      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON' as const,
        },
      };
    }),
  );
  await writeFile(path.join(dir, MANIFEST_FILE), `${JSON.stringify(checked, null, 2)}\n`);
}

type ModelJson = tf.io.ModelJSON;

async function readModelJson(dir: string): Promise<ModelJson> {
  return JSON.parse(await readFile(path.join(dir, MODEL_FILE), 'utf8')) as ModelJson;
}

/** Reads the model from a folder written by `saveModel` (or downloaded by `loadModel`) */
async function loadFromDisk(dir: string): Promise<RuntimeModel> {
  const manifest = ModelManifest.parse(
    JSON.parse(await readFile(path.join(dir, MANIFEST_FILE), 'utf8')),
  );
  const { weightsManifest, ...json } = await readModelJson(dir);
  const groups = weightsManifest ?? [];
  const weightSpecs = groups.flatMap((group) => group.weights);
  const buffers = await Promise.all(
    groups.flatMap((group) => group.paths).map((p) => readFile(path.join(dir, p))),
  );
  const joined = Buffer.concat(buffers);
  const weightData = joined.buffer.slice(
    joined.byteOffset,
    joined.byteOffset + joined.byteLength,
  ) as ArrayBuffer;
  const handler = tf.io.fromMemory({
    modelTopology: json.modelTopology,
    trainingConfig: json.trainingConfig,
    format: json.format,
    generatedBy: json.generatedBy,
    convertedBy: json.convertedBy,
    signature: json.signature,
    userDefinedMetadata: json.userDefinedMetadata,
    modelInitializer: json.modelInitializer,
    initializerSignature: json.initializerSignature,
    weightSpecs,
    weightData,
  });
  const model =
    manifest.format === 'tfjs-layers'
      ? await tf.loadLayersModel(handler)
      : await tf.loadGraphModel(handler);
  return wrap(model, manifest);
}

function wrap(model: tf.LayersModel | tf.GraphModel, manifest: ModelManifest): RuntimeModel {
  return {
    manifest,
    async predict(input) {
      const batch = Array.isArray(input[0]) ? (input as number[][]) : [input as number[]];
      const values = batch.flat(Infinity) as number[];
      const x = tf.tensor(values, [batch.length, ...manifest.input.shape]);
      try {
        const out = model.predict(x);
        const first = Array.isArray(out) ? out[0] : out;
        if (!(first instanceof tf.Tensor)) throw new Error('Model returned no tensor');
        try {
          const flat = (await first.data()) as Float32Array;
          const size = flat.length / batch.length;
          return batch.map((_, i) => Array.from(flat.subarray(i * size, (i + 1) * size)));
        } finally {
          if (Array.isArray(out)) out.forEach((t) => t.dispose());
          else first.dispose();
        }
      } finally {
        x.dispose();
      }
    },
    dispose() {
      model.dispose();
    },
  };
}

async function download(url: string, destination: string): Promise<void> {
  const get = async (name: string) => {
    const response = await fetch(new URL(name, url));
    if (!response.ok) throw new Error(`GET ${new URL(name, url)} failed: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  };
  const manifest = await get(MANIFEST_FILE);
  const modelJson = await get(MODEL_FILE);
  const parsed = JSON.parse(modelJson.toString('utf8')) as ModelJson;
  const weightFiles = (parsed.weightsManifest ?? []).flatMap((group) => group.paths);
  const weights = await Promise.all(weightFiles.map(get));
  // Write only after everything arrived, so an interrupted download never replaces a good cache
  await mkdir(destination, { recursive: true });
  await Promise.all([
    writeFile(path.join(destination, MODEL_FILE), modelJson),
    ...weightFiles.map((name, i) => writeFile(path.join(destination, name), weights[i]!)),
  ]);
  await writeFile(path.join(destination, MANIFEST_FILE), manifest);
}

export interface LoadModelOptions {
  /** Where URL downloads are kept and reused when offline. Defaults to `.model-cache`. */
  cacheDir?: string;
}

/**
 * Loads a model from a folder or an `http(s)` URL of a folder containing `manifest.json`.
 * A URL is downloaded into the cache first, and the cached copy is used if the download fails.
 */
export async function loadModel(
  source: string,
  options: LoadModelOptions = {},
): Promise<RuntimeModel> {
  if (!/^https?:\/\//.test(source)) return loadFromDisk(source);

  const base = source.endsWith('/') ? source : `${source}/`;
  const key = createHash('sha256').update(base).digest('hex').slice(0, 16);
  const cached = path.join(options.cacheDir ?? '.model-cache', key);
  try {
    await download(base, cached);
  } catch (err) {
    try {
      await readFile(path.join(cached, MANIFEST_FILE));
    } catch {
      throw new Error(`Could not download ${base} and no cached copy exists`, { cause: err });
    }
  }
  return loadFromDisk(cached);
}
