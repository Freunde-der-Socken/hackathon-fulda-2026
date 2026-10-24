# @repo/rnd

Workspace for the R&D team. It is a scaffold: dependencies, a smoke test and no models, data or domain code. Models are trained in the cloud (#40), so locally this mostly runs inference. Local training is a fallback.

```bash
pnpm --filter @repo/rnd smoke
```

The smoke test selects the WASM backend, builds a tiny model in memory, saves it with `saveModel`, loads it back with `loadModel`, predicts, runs a 2-epoch `fit`, and prints the backend. It also checks that `DATABASE_URL` (read from `.env` like the API) accepts a TCP connection, and skips it when unset.

## Backend: WASM, not tfjs-node

`@tensorflow/tfjs` with `@tensorflow/tfjs-backend-wasm`, CPU as the fallback. `@tensorflow/tfjs-node` is not used: its install needs build scripts, it crashes on Node 24 (`util.isNullOrUndefined` was removed), and on arm64 (Raspberry Pi, Apple Silicon devcontainer) it downloads an x86-64 binary. The WASM stack is pure npm packages and runs the same on x64, arm64, in the API, on a Pi and in the browser. Full table in #38.

Both packages are pinned to one exact version in the `pnpm-workspace.yaml` catalog. Update them together.

## Model folders and helpers

A model is a folder with `model.json`, `weights.bin` and a `manifest.json`:

```json
{
  "name": "example",
  "version": "1.0.0",
  "format": "tfjs-layers",
  "input": { "shape": [2] },
  "output": { "shape": [1], "labels": ["a"] }
}
```

`format` is `tfjs-layers` or `tfjs-graph`. Shapes exclude the batch dimension. The helpers live in [`packages/ml`](../../packages/ml/src):

```ts
import { initBackend, loadModel, saveModel } from '@repo/ml';

await initBackend(); // 'wasm', or 'cpu' if WASM can't start
await saveModel(model, './models/example', manifest); // replaces tfjs-node's file:// saving
const m = await loadModel('./models/example'); // or 'https://host/models/example/'
const y = (await m.predict([1, 2]))[0]?.[0]; // one sample or a batch of plain arrays
```

`loadModel` returns a runtime-neutral `RuntimeModel` (`manifest`, `predict`, `dispose`), so callers don't depend on TensorFlow.js. Another runtime (ONNX) is one more `format` case in `packages/ml/src/io.ts`.

Loading from a URL downloads `manifest.json`, `model.json` and the weights into `.model-cache/` (override with `cacheDir`) and loads that copy. If the download fails, e.g. offline at the event, the cached copy is used. `.model-cache/` is git-ignored.
