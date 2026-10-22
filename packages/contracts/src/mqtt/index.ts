import { z } from 'zod';

export interface TopicDefinition {
  pattern: string;
  schema: z.ZodType;
}

/**
 * Single place that maps topic patterns to payload schemas.
 * Convention: `<domain>/<id>/<event>`, lowercase, no leading slash. `+` stands for one level.
 */
export const topics = {
  // key: { pattern: '<domain>/+/<event>', schema: PayloadSchema },
} as const satisfies Record<string, TopicDefinition>;

type Topics = typeof topics;
type TopicSchema<K extends TopicKey> = Extract<Topics[K], TopicDefinition>['schema'];

/** The definition behind a topic key, widened so generic code needn't index `topics` by `K`. */
export const getTopic = (key: TopicKey): TopicDefinition =>
  (topics as Record<string, TopicDefinition>)[key]!;

export type TopicKey = keyof typeof topics;
export type TopicPayload<K extends TopicKey> = z.infer<TopicSchema<K>>;

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
  z.object({
    topic: z.string(),
    params: z.array(z.string()),
    payload: getTopic(key).schema,
  });
