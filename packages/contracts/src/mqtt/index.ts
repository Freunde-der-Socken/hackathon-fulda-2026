import { z } from 'zod';

/** Example payload: the pattern to copy for real topics. Replace it with the project's own. */
export const SensorReading = z.object({
  deviceId: z.string(),
  value: z.number(),
  unit: z.string(),
  ts: z.iso.datetime(),
});
export type SensorReading = z.infer<typeof SensorReading>;

/**
 * Single place that maps topic patterns to payload schemas.
 * Convention: `<domain>/<id>/<event>`, lowercase, no leading slash. `+` stands for one level.
 */
export const topics = {
  sensorReading: { pattern: 'sensors/+/reading', schema: SensorReading },
} as const;

export type TopicKey = keyof typeof topics;
export type TopicPayload<K extends TopicKey> = z.infer<(typeof topics)[K]['schema']>;

/** Fills the `+` wildcards of a topic pattern in order: `('sensors/+/reading', ['a'])` gives `sensors/a/reading`. */
export function buildTopic(pattern: string, params: readonly string[]): string {
  const levels = pattern.split('/');
  const wildcards = levels.filter((level) => level === '+').length;
  if (pattern.includes('#') || params.length !== wildcards) {
    throw new Error(
      `Topic "${pattern}" needs exactly ${wildcards} parameter(s), got ${params.length}`,
    );
  }
  let next = 0;
  return levels
    .map((level) => {
      if (level !== '+') return level;
      const value = params[next++]!;
      if (value === '' || /[+#/]/.test(value))
        throw new Error(`Invalid topic parameter "${value}"`);
      return value;
    })
    .join('/');
}

/** Returns the values of the `+` wildcards if `topic` matches `pattern`, otherwise `null`. */
export function matchTopic(pattern: string, topic: string): string[] | null {
  const patternLevels = pattern.split('/');
  const topicLevels = topic.split('/');
  if (patternLevels.length !== topicLevels.length) return null;
  const params: string[] = [];
  for (const [i, level] of patternLevels.entries()) {
    if (level === '+') params.push(topicLevels[i]!);
    else if (level !== topicLevels[i]) return null;
  }
  return params;
}

/** What `GET /api/events` sends for every message (as `event: <topicKey>`). */
export const topicEvent = <K extends TopicKey>(key: K) =>
  z.object({ topic: z.string(), params: z.array(z.string()), payload: topics[key].schema });
