import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExecutionRequest, ExecutionStatus } from './contracts.js';

const MAX_OUTPUT_BYTES = 64_000;
const SANDBOX_IMAGE = process.env['CODE_RUNNER_IMAGE'] ?? 'code-to-escape/sandbox:latest';

// The outer container watchdog is a pure safety net against a hung `docker`
// process. The authoritative programming limits live inside the container
// (`execute.py`): a 20s compile budget and a `timeLimitMs` run timeout. This
// outer timer only exists to reclaim a container that never exits, so it must
// be generous enough to cover cold container startup (Windows Docker Desktop
// cold starts take ~5-10s) plus a full compile plus the program's own limit.
const MIN_CONTAINER_WATCHDOG_MS = 30_000;
const CONTAINER_STARTUP_ALLOWANCE_MS = 10_000;
const CONTAINER_COMPILE_ALLOWANCE_MS = 20_000;
const MAX_CONTAINER_WATCHDOG_MS = 120_000;

export function containerWatchdogMs(timeLimitMs: number): number {
  const budget = timeLimitMs + CONTAINER_STARTUP_ALLOWANCE_MS + CONTAINER_COMPILE_ALLOWANCE_MS;
  return Math.min(MAX_CONTAINER_WATCHDOG_MS, Math.max(MIN_CONTAINER_WATCHDOG_MS, budget));
}

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
      }, containerWatchdogMs(request.timeLimitMs));
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
