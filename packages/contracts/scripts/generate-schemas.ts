import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import * as contracts from '../src/index';

const outDir = new URL('../schemas/', import.meta.url);

function write(path: string, schema: z.ZodType, extra: Record<string, unknown> = {}) {
  const json = z.toJSONSchema(schema, { target: 'draft-2020-12', unrepresentable: 'any' });
  writeFileSync(new URL(path, outDir), `${JSON.stringify({ ...json, ...extra }, null, 2)}\n`);
}

// Start clean so schemas of removed exports don't linger.
mkdirSync(outDir, { recursive: true });
for (const file of readdirSync(outDir)) rmSync(new URL(file, outDir));

// Every exported schema (HTTP params, query, bodies, responses).
for (const [name, value] of Object.entries(contracts)) {
  if (value instanceof z.ZodType) write(`http.${name}.schema.json`, value, { title: name });
}
