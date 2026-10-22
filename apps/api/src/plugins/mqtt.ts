import {
  buildTopic,
  getTopic,
  matchTopic,
  type TopicKey,
  type TopicPayload,
} from '@repo/contracts';
import fp from 'fastify-plugin';
import mqtt from 'mqtt';
import { env } from '../env';

export interface MqttMessage<K extends TopicKey> {
  topic: string;
  /** Values of the `+` wildcards in the topic pattern, in order */
  params: string[];
  payload: TopicPayload<K>;
}

export interface MqttBus {
  /** True while the client is connected to the broker */
  readonly connected: boolean;
  /**
   * Validates `payload` against the contract and publishes it. Rejects before anything reaches
   * the broker if the payload or the parameters are invalid.
   */
  publish<K extends TopicKey>(key: K, params: string[], payload: TopicPayload<K>): Promise<void>;
  /**
   * Calls `handler` with every valid message. Invalid payloads are logged and dropped.
   * Returns a function that removes the handler again.
   */
  subscribe<K extends TopicKey>(
    key: K,
    handler: (message: MqttMessage<K>) => void | Promise<void>,
  ): Promise<() => void>;
}

declare module 'fastify' {
  interface FastifyInstance {
    /** Only decorated when MQTT_URL is set. Check with `app.hasDecorator('mqtt')`. */
    mqtt: MqttBus;
  }
}

type AnyHandler = (
  message: MqttMessage<TopicKey> | { topic: string; params: string[]; payload: unknown },
) => void | Promise<void>;

export const mqttPlugin = fp(
  async (app) => {
    if (!env.MQTT_URL) {
      app.log.warn('MQTT_URL not set, skipping mqtt plugin');
      return;
    }

    // Not awaited on purpose: mqtt.js keeps reconnecting, so a broker that is down doesn't
    // block startup. Health reports `down` until it connects.
    const client = mqtt.connect(env.MQTT_URL, { reconnectPeriod: 2000 });
    client.on('connect', () => app.log.info('MQTT connected'));
    client.on('close', () => app.log.warn('MQTT connection closed'));
    client.on('error', (err) => app.log.error({ err }, 'MQTT error'));

    const handlers = new Map<TopicKey, Set<AnyHandler>>();

    client.on('message', (topic, raw) => {
      for (const [key, set] of handlers) {
        const { pattern, schema } = getTopic(key);
        const params = matchTopic(pattern, topic);
        if (!params) continue;

        let json: unknown;
        try {
          json = JSON.parse(raw.toString());
        } catch {
          app.log.warn({ topic }, 'Dropped MQTT message: payload is not JSON');
          continue;
        }
        const parsed = schema.safeParse(json);
        if (!parsed.success) {
          app.log.warn({ topic, issues: parsed.error.issues }, 'Dropped invalid MQTT message');
          continue;
        }
        for (const handler of set) {
          // A failing handler must not take the API down or block the others
          Promise.resolve()
            .then(() => handler({ topic, params, payload: parsed.data }))
            .catch((err: unknown) => app.log.error({ err, topic }, 'MQTT handler failed'));
        }
      }
    });

    const bus: MqttBus = {
      get connected() {
        return client.connected;
      },
      async publish(key, params, payload) {
        const { pattern, schema } = getTopic(key);
        const topic = buildTopic(pattern, params);
        await client.publishAsync(topic, JSON.stringify(schema.parse(payload)));
      },
      async subscribe(key, handler) {
        let set = handlers.get(key);
        if (!set) {
          set = new Set();
          handlers.set(key, set);
          // mqtt.js re-subscribes on its own after a reconnect
          await client.subscribeAsync(getTopic(key).pattern);
        }
        // The handler type is narrowed to K by the signature, the registry stores them widened
        set.add(handler as unknown as AnyHandler);
        return () => {
          set.delete(handler as unknown as AnyHandler);
        };
      },
    };
    app.decorate('mqtt', bus);

    app.addHook('onClose', async () => {
      await client.endAsync();
    });
  },
  { name: 'mqtt' },
);
