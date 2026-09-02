import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExecutionRequest, ExecutionStatus } from './contracts.js';

const MAX_OUTPUT_BYTES = 64_000;
const SANDBOX_IMAGE = process.env['CODE_RUNNER_IMAGE'] ?? 'code-to-escape/sandbox:latest';

export interface SandboxResponse {
  status: Exclude<ExecutionStatus, 'ACCEPTED' | 'WRONG_ANSWER'> | 'EXECUTED';
  executionTimeMs?: number;
  memoryUsedKb?: number;
  compilerOutput?: string;
  runtimeOutput?: string;
}

export async function executeInSandbox(
  request: Pick<ExecutionRequest, 'language' | 'sourceCode' | 'timeLimitMs' | 'memoryLimitMb'>,
  input: string,
): Promise<SandboxResponse> {
  const controlDir = await mkdtemp(join(tmpdir(), 'cte-runner-'));
  const cidFile = join(controlDir, 'container-id');
  const payload = JSON.stringify({ ...request, input });
  const args = [
    'run',
    '-i',
    '--rm',
    '--network',
    'none',
    '--read-only',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--pids-limit',
    '64',
    '--memory',
    `${String(request.memoryLimitMb)}m`,
    '--memory-swap',
    `${String(request.memoryLimitMb)}m`,
    '--cpus',
    '0.5',
    '--user',
    '65534:65534',
    '--tmpfs',
    '/work:rw,exec,mode=1777,size=64m',
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,nodev,mode=1777,size=16m',
    '--cidfile',
    cidFile,
    SANDBOX_IMAGE,
  ];
  try {
    return await new Promise<SandboxResponse>((resolve) => {
      const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
      let stdout = Buffer.alloc(0);
      let stderr = Buffer.alloc(0);
      let timedOut = false;
      const append = (current: Buffer, chunk: Buffer) =>
        Buffer.concat([current, chunk]).subarray(0, MAX_OUTPUT_BYTES);
      child.stdout.on('data', (chunk: Buffer) => {
        stdout = append(stdout, chunk);
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr = append(stderr, chunk);
      });
      child.on('error', () => {
        resolve({ status: 'INTERNAL_ERROR', compilerOutput: 'Sandbox runtime is unavailable.' });
      });
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, request.timeLimitMs + 2_000);
      child.on('close', () => {
        void (async () => {
          clearTimeout(timer);
          if (timedOut) {
            try {
              const id = (await readFile(cidFile, 'utf8')).trim();
              spawn('docker', ['kill', id], { windowsHide: true });
            } catch {
              /* container was already removed */
            }
            resolve({ status: 'TIME_LIMIT_EXCEEDED' });
            return;
          }
          try {
            const response = JSON.parse(stdout.toString('utf8')) as SandboxResponse;
            resolve(response);
          } catch {
            resolve({
              status: 'INTERNAL_ERROR',
              compilerOutput:
                stderr.toString('utf8').slice(0, MAX_OUTPUT_BYTES) ||
                'Sandbox returned an invalid response.',
            });
          }
        })();
      });
      child.stdin.end(payload);
    });
  } finally {
    await rm(controlDir, { recursive: true, force: true });
  }
}
