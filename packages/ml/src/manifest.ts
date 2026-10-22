import { z } from 'zod';

/** Loader to use for a model folder. A new runtime (e.g. ONNX) is one more value here. */
export const ModelFormat = z.enum(['tfjs-layers', 'tfjs-graph']);
export type ModelFormat = z.infer<typeof ModelFormat>;

const TensorInfo = z.object({
  /** Shape of one sample, without the batch dimension */
  shape: z.array(z.number().int().positive()),
  labels: z.array(z.string()).optional(),
});

/** `manifest.json`, stored next to `model.json` in every model folder */
export const ModelManifest = z.object({
  name: z.string().min(1),
  version: z.string().default('0.0.0'),
  format: ModelFormat,
  input: TensorInfo,
  output: TensorInfo,
});
export type ModelManifest = z.infer<typeof ModelManifest>;
