import { onScopeDispose, ref } from 'vue';

/** Floor of the scale: 16-bit audio can't resolve anything quieter. */
export const MIN_DB = -96;

const BLOCK_MS = 100;

/** Linear amplitude (0..1) to dBFS, clamped to MIN_DB..0. */
export const toDb = (amplitude: number) =>
  amplitude > 0 ? Math.min(0, Math.max(MIN_DB, 20 * Math.log10(amplitude))) : MIN_DB;

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

/**
 * Ambient sound level from the device microphone, in dBFS (0 = full scale).
 * Not calibrated to dB SPL: the offset depends on the phone's microphone.
 */
export function useMicLevel() {
  const level = ref(MIN_DB);
  const peak = ref(MIN_DB);
  const running = ref(false);

  let stream: MediaStream | undefined;
  let context: AudioContext | undefined;
  // Collected since the last takeAverage(), for readings over a longer interval
  let acc: Block = { sum: 0, count: 0, peak: 0 };

  async function start() {
    if (running.value) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('No microphone access: the page must be opened over HTTPS or localhost.');
    }
    // Without these filters the browser treats the input as speech and hides the real ambient level
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
    context = new AudioContext();
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
      level.value = toDb(Math.sqrt(data.sum / data.count));
      peak.value = toDb(data.peak);
      acc.sum += data.sum;
      acc.count += data.count;
      acc.peak = Math.max(acc.peak, data.peak);
    });
    // Needed with addEventListener, onmessage would start the port implicitly
    node.port.start();
    context.createMediaStreamSource(stream).connect(node);
    running.value = true;
  }

  function stop() {
    stream?.getTracks().forEach((track) => track.stop());
    void context?.close();
    stream = undefined;
    context = undefined;
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

  onScopeDispose(stop);

  return { level, peak, running, start, stop, takeAverage };
}
