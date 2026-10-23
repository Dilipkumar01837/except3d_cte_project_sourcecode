import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const logPath = 'C:/Users/dilip/AppData/Local/Temp/cte_test.log';
const child = spawn('pnpm', ['--filter', '@code-to-escape/server', 'test'], {
  cwd: 'C:/Users/dilip/code-to-escape',
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (d) => { output += d.toString(); });
child.stderr.on('data', (d) => { output += d.toString(); });

child.on('close', (code) => {
  output += `\nEXIT_CODE=${code}\n`;
  writeFileSync(logPath, output, 'utf8');
  process.exit(0);
});
