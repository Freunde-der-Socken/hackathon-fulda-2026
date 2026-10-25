// The shadcn-vue CLI writes `from "cn"` (an unrelated npm package) instead of `@/lib/utils`.
// Rewrites those imports in src/components/ui. Works in any shell, unlike grep | xargs sed.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src', import.meta.url));

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(vue|ts)$/.test(entry.name)) yield path;
  }
}

let changed = 0;
for (const file of walk(root)) {
  const source = readFileSync(file, 'utf8');
  const fixed = source.replaceAll(/from (["'])cn\1/g, 'from "@/lib/utils"');
  if (fixed !== source) {
    writeFileSync(file, fixed);
    changed++;
  }
}
process.stdout.write(`Fixed the cn import in ${changed} file(s).\n`);
