import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import * as contracts from '../src/index';

const outDir = new URL('../schemas/', import.meta.url);

function write(path: string, schema: z.ZodType, extra: Record<string, unknown> = {}) {
  const json = z.toJSONSchema(schema, { target: 'draft-2020-12', unrepresentable: 'any' });
  writeFileSync(new URL(path, outDir), `${JSON.stringify({ ...json, ...extra }, null, 2)}\n`);
}

// Start clean so schemas of removed topics or exports don't linger.
mkdirSync(outDir, { recursive: true });
for (const file of readdirSync(outDir)) rmSync(new URL(file, outDir));

// One file per MQTT topic key, naming the topic pattern.
for (const [key, topic] of Object.entries(contracts.topics)) {
  write(`mqtt.${key}.schema.json`, topic.schema, {
    title: `${key}: ${topic.pattern}`,
    description: `Payload published on the MQTT topic "${topic.pattern}" (+ matches one level).`,
  });
}

// Every other exported schema (HTTP params, query, bodies, responses).
const payloads = new Set<unknown>(Object.values(contracts.topics).map((topic) => topic.schema));
for (const [name, value] of Object.entries(contracts)) {
  if (value instanceof z.ZodType && !payloads.has(value))
    write(`http.${name}.schema.json`, value, { title: name });
}
