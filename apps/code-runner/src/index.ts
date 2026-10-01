import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { executeInSandbox } from './sandbox.js';
import type { ExecutionResult } from './contracts.js';
import { outputsMatch } from './output-compare.js';
import { validateExecutionRequest } from './validation.js';
import { Semaphore } from './concurrency.js';

const port = Number.parseInt(process.env['PORT'] ?? '3002', 10);
const runnerToken = process.env['CODE_RUNNER_TOKEN'] ?? '';
const bindHost = process.env['CODE_RUNNER_BIND_HOST'] ?? '127.0.0.1';
const MAX_BODY_BYTES = 256_000;
// Bounds container spawning. Each in-flight request runs one container at a time,
// so these are also container counts.
const executions = new Semaphore({
  max: Number.parseInt(process.env['CODE_RUNNER_MAX_CONCURRENCY'] ?? '4', 10),
  maxQueue: Number.parseInt(process.env['CODE_RUNNER_MAX_QUEUE'] ?? '16', 10),
});

function authorized(header: string | undefined): boolean {
  const supplied = header?.startsWith('Bearer ') ? header.slice(7) : '';
  if (!runnerToken || supplied.length !== runnerToken.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(runnerToken));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    return null;
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  void (async () => {
    if (req.method === 'GET' && req.url === '/health') {
      // Exposes load so an operator can see the runner saturating before callers
      // start receiving 503s.
      send(res, 200, {
        status: 'ok',
        inFlight: executions.inFlight,
        queued: executions.queued,
      });
      return;
    }
    if (req.method !== 'POST' || req.url !== '/execute') {
      send(res, 404, { error: 'Not found' });
      return;
    }
    if (!authorized(req.headers.authorization)) {
      send(res, 401, { error: 'Unauthorized' });
      return;
    }
    const execution = validateExecutionRequest(await readJson(req));
    if (!execution) {
      send(res, 400, { error: 'Invalid execution request' });
      return;
    }

    // Hold a slot for the whole request: its test cases run sequentially, one
    // container at a time, so one slot bounds one container.
    const release = await executions.acquire();
    if (!release) {
      // Shed load rather than queue without bound. 503 with Retry-After tells the
      // caller this is transient and worth retrying.
      res.writeHead(503, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'retry-after': '2',
      });
      res.end(JSON.stringify({ error: 'Runner at capacity, retry shortly' }));
      return;
    }

    try {
      const results: ExecutionResult['results'] = [];
      let totalTime = 0;
      let peakMemory = 0;
      for (const testCase of execution.testCases) {
        const outcome = await executeInSandbox(execution, testCase.input);
        totalTime += outcome.executionTimeMs ?? 0;
        peakMemory = Math.max(peakMemory, outcome.memoryUsedKb ?? 0);
        results.push({
          testCaseId: testCase.id,
          passed:
            outcome.status === 'EXECUTED' &&
            outputsMatch(outcome.runtimeOutput, testCase.expectedOutput),
          executionTimeMs: outcome.executionTimeMs,
          memoryUsedKb: outcome.memoryUsedKb,
          output:
            outcome.status === 'EXECUTED'
              ? outcome.runtimeOutput
              : (outcome.runtimeOutput ?? outcome.compilerOutput ?? ''),
        });
        if (outcome.status !== 'EXECUTED') {
          send(res, 200, {
            status: outcome.status,
            executionTimeMs: totalTime || undefined,
            memoryUsedKb: peakMemory || undefined,
            compilerOutput: outcome.compilerOutput,
            runtimeOutput: outcome.runtimeOutput,
            results,
          });
          return;
        }
      }
      const accepted = results.every((result) => result.passed);
      send(res, 200, {
        status: accepted ? 'ACCEPTED' : 'WRONG_ANSWER',
        executionTimeMs: totalTime,
        memoryUsedKb: peakMemory || undefined,
        results,
      } satisfies ExecutionResult);
    } finally {
      release();
    }
  })();
});

server.requestTimeout = 30_000;
server.on('error', (err: { code?: string }) => {
  if (err.code === 'EADDRINUSE') {
    console.log(
      `[code-runner] Port ${String(port)} is already in use (e.g., Docker container active). Host runner standby.`,
    );
  } else {
    console.error('[code-runner] Server error:', err);
  }
});
server.listen(port, bindHost, () => {
  console.log(`Code runner listening on http://${bindHost}:${String(port)}`);
});
