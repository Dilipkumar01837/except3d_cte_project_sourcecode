import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const logPath = '/tmp/cte_test.log';
const child = spawn('pnpm', ['--filter', '@code-to-escape/server', 'test'], {
  cwd: '/app',
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    HOME: '/root',
  },
});

let output = '';
child.stdout.on('data', (d) => { output += d.toString(); });
child.stderr.on('data', (d) => { output += d.toString(); });

child.on('close', (code) => {
  output += `\nEXIT_CODE=${String(code)}\n`;
  writeFileSync(logPath, output, 'utf8');
  process.exit(0);
});
