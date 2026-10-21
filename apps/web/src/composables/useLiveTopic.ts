import { topicEvent, type TopicKey, type TopicPayload } from '@repo/contracts';
import { onScopeDispose, ref, shallowRef } from 'vue';
import { API_BASE } from '@/lib/api';

interface LiveTopicOptions {
  /** How many messages to keep in `messages` (newest first). */
  max?: number;
}

/**
 * Live, typed messages of one MQTT topic, streamed by the API (`GET /api/events`).
 * Payloads are validated with the contract schema, and invalid ones are dropped.
 *
 *   const { latest, messages, connected } = useLiveTopic('sensorReading');
 */
export function useLiveTopic<K extends TopicKey>(key: K, options: LiveTopicOptions = {}) {
  const { max = 50 } = options;
  const schema = topicEvent(key);

  const latest = shallowRef<TopicPayload<K>>();
  const messages = shallowRef<TopicPayload<K>[]>([]);
  const connected = ref(false);
  /** Number of messages dropped because they didn't match the contract */
  const dropped = ref(0);

  // EventSource reconnects on its own after a dropped connection
  const source = new EventSource(`${API_BASE}/events`);
  source.addEventListener('open', () => (connected.value = true));
  source.addEventListener('error', () => (connected.value = false));
  source.addEventListener(key, (event) => {
    const parsed = schema.safeParse(JSON.parse((event as MessageEvent<string>).data));
    if (!parsed.success) {
      dropped.value++;
      return;
    }
    const payload = parsed.data.payload as TopicPayload<K>;
    latest.value = payload;
    messages.value = [payload, ...messages.value].slice(0, max);
  });

  onScopeDispose(() => source.close());

  return { latest, messages, connected, dropped };
}
