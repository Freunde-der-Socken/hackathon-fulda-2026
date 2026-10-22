// PostToolUse hook: formats the file the agent just edited with oxfmt, so AI-written code passes `pnpm fmt:check`.
// Never fails the tool call: files oxfmt doesn't handle are skipped.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input?.file_path;

if (file) {
  spawnSync('pnpm', ['exec', 'oxfmt', file], {
    cwd: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
}
