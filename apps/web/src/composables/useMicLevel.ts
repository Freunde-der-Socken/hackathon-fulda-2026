import { onScopeDispose, ref } from 'vue';
import { i18n } from '@/lib/i18n';

/** Floor of the scale: 16-bit audio can't resolve anything quieter. */
export const MIN_DB = -96;

const BLOCK_MS = 100;

/** Linear amplitude (0..1) to dBFS, clamped to MIN_DB..0. */
export const toDb = (amplitude: number) =>
  amplitude > 0 ? Math.min(0, Math.max(MIN_DB, 20 * Math.log10(amplitude))) : MIN_DB;

/**
 * Estimated dBFS to dB SPL offset. Android's CDD recommends that 90 dB SPL at 1 kHz reads as
 * RMS 2500 of 32768 (about -22.4 dBFS). Real phones deviate by up to ~10 dB, iPhones are unknown.
 */
export const SPL_OFFSET = 112;

/** dBFS to estimated dB SPL. Uncalibrated, so only roughly comparable between phones. */
export const toSpl = (dbfs: number) => dbfs + SPL_OFFSET;

// Sums every sample of a block, so no audio between two readings is skipped
const workletSource = `
class LevelProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.blockSize = options.processorOptions.blockSize;
    this.sum = 0; this.count = 0; this.peak = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        const s = ch[i];
        this.sum += s * s;
        const a = Math.abs(s);
        if (a > this.peak) this.peak = a;
      }
      this.count += ch.length;
      if (this.count >= this.blockSize) {
        this.port.postMessage({ sum: this.sum, count: this.count, peak: this.peak });
        this.sum = 0; this.count = 0; this.peak = 0;
      }
    }
    return true;
  }
}
registerProcessor('level-processor', LevelProcessor);
`;

interface Block {
  sum: number;
  count: number;
  peak: number;
}

// Without these filters the browser treats the input as speech and hides the real ambient level
const constraints: MediaStreamConstraints = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    channelCount: 1,
  },
};

/** How long `start` waits for a suspended AudioContext to resume before it gives up. */
const RESUME_TIMEOUT_MS = 1000;

function assertMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(i18n.global.t('noise.noMicrophone'));
  }
}

/**
 * Ambient sound level from the device microphone, in dBFS (0 = full scale).
 * Not calibrated to dB SPL: the offset depends on the phone's microphone.
 *
 * Browsers only let audio run after a tap on the page, and may ask for the microphone. Call
 * `prepare` (or `start`) from a tap once: the AudioContext then stays alive until the scope ends,
 * so later `start` calls work without one, for example when a silent phase begins.
 */
export function useMicLevel() {
  const level = ref(MIN_DB);
  const peak = ref(MIN_DB);
  const running = ref(false);

  let stream: MediaStream | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let graph: Promise<{ context: AudioContext; node: AudioWorkletNode }> | undefined;
  let starting: Promise<void> | undefined;
  // Collected since the last takeAverage(), for readings over a longer interval
  let acc: Block = { sum: 0, count: 0, peak: 0 };

  // Creates the AudioContext synchronously on the first call, so it counts as created by the tap
  function audio() {
    if (graph) return graph;
    graph = (async () => {
      const context = new AudioContext();
      const url = URL.createObjectURL(new Blob([workletSource], { type: 'text/javascript' }));
      try {
        await context.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      const node = new AudioWorkletNode(context, 'level-processor', {
        processorOptions: { blockSize: Math.round((context.sampleRate * BLOCK_MS) / 1000) },
      });
      node.port.addEventListener('message', ({ data }: MessageEvent<Block>) => {
        if (!running.value) return;
        level.value = toDb(Math.sqrt(data.sum / data.count));
        peak.value = toDb(data.peak);
        acc.sum += data.sum;
        acc.count += data.count;
        acc.peak = Math.max(acc.peak, data.peak);
      });
      // Needed with addEventListener, onmessage would start the port implicitly
      node.port.start();
      return { context, node };
    })();
    // A failed setup is tried again on the next call
    graph.catch(() => (graph = undefined));
    return graph;
  }

  /** Asks for the microphone and unlocks audio without measuring. Call it from a tap. */
  async function prepare() {
    assertMicrophone();
    const ready = audio();
    const probe = await navigator.mediaDevices.getUserMedia(constraints);
    probe.getTracks().forEach((track) => track.stop());
    const { context } = await ready;
    await context.resume();
  }

  // A tap and an automatic start at the same time share one attempt instead of opening two streams
  function start() {
    starting ??= begin().finally(() => (starting = undefined));
    return starting;
  }

  async function begin() {
    if (running.value) return;
    assertMicrophone();
    const ready = audio();
    const mic = await navigator.mediaDevices.getUserMedia(constraints);
    try {
      const { context, node } = await ready;
      // Without a tap so far, resume() stays pending instead of failing
      if (context.state !== 'running') {
        await Promise.race([
          context.resume(),
          new Promise((resolve) => setTimeout(resolve, RESUME_TIMEOUT_MS)),
        ]);
      }
      if (context.state !== 'running') throw new Error(i18n.global.t('noise.audioLocked'));
      stream = mic;
      source = context.createMediaStreamSource(mic);
      source.connect(node);
      running.value = true;
    } catch (error) {
      mic.getTracks().forEach((track) => track.stop());
      throw error;
    }
  }

  /** Releases the microphone. The AudioContext stays, so `start` works again without a tap. */
  function stop() {
    source?.disconnect();
    stream?.getTracks().forEach((track) => track.stop());
    source = undefined;
    stream = undefined;
    acc = { sum: 0, count: 0, peak: 0 };
    running.value = false;
    level.value = MIN_DB;
    peak.value = MIN_DB;
  }

  /** Energy average and peak since the previous call, or null if no audio arrived. */
  function takeAverage() {
    if (acc.count === 0) return null;
    const result = { level: toDb(Math.sqrt(acc.sum / acc.count)), peak: toDb(acc.peak) };
    acc = { sum: 0, count: 0, peak: 0 };
    return result;
  }

  onScopeDispose(() => {
    stop();
    void graph?.then(({ context }) => context.close());
    graph = undefined;
  });

  return { level, peak, running, prepare, start, stop, takeAverage };
}
