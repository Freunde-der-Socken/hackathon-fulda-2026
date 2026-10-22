import type { ModelManifest } from './manifest';

/** Runtime-neutral view of a loaded model. Callers never see TensorFlow.js types. */
export interface RuntimeModel {
  readonly manifest: ModelManifest;
  /**
   * Runs the model on one sample (a flat or nested array) or a batch (an array of samples).
   * Returns one array per sample.
   */
  predict(input: number[] | number[][]): Promise<number[][]>;
  dispose(): void;
}
