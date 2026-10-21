// Publishes fake sensor readings every second, so the frontend can be built without hardware.
// Run: pnpm mqtt:simulate (needs the broker: pnpm mqtt:up)
import { buildTopic, topics, type SensorReading } from '@repo/contracts';
import mqtt from 'mqtt';
import { env } from '../src/env';

if (!env.MQTT_URL) {
  process.stderr.write('MQTT_URL is not set (see apps/api/.env.example).\n');
  process.exit(1);
}

const devices = ['sensor-1', 'sensor-2', 'sensor-3'];
const client = await mqtt.connectAsync(env.MQTT_URL);
process.stdout.write(`Publishing to ${topics.sensorReading.pattern} on ${env.MQTT_URL}\n`);

const timer = setInterval(() => {
  for (const deviceId of devices) {
    const reading: SensorReading = {
      deviceId,
      value: Math.round((20 + Math.random() * 5) * 100) / 100,
      unit: '°C',
      ts: new Date().toISOString(),
    };
    // Validate like the API does, so the simulator can't drift from the contract
    const payload = JSON.stringify(topics.sensorReading.schema.parse(reading));
    client
      .publishAsync(buildTopic(topics.sensorReading.pattern, [deviceId]), payload)
      .catch((err: unknown) => process.stderr.write(`Publish failed: ${String(err)}\n`));
  }
}, 1000);

const stop = () => {
  clearInterval(timer);
  void client.endAsync().then(() => process.exit(0));
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
