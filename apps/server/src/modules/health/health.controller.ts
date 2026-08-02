import type { Request, Response } from 'express';
import type { HealthStatus } from '@code-to-escape/types';
import { prisma } from '../../shared/lib/prisma.js';
import { redis } from '../../shared/lib/redis.js';
import { env } from '../../config/index.js';

export function getHealth(_req: Request, res: Response): void {
  const data: HealthStatus = { status: 'ok' };
  res.status(200).json(data);
}

export async function getReadiness(_req: Request, res: Response): Promise<void> {
  const checks: Record<string, { status: 'ok' | 'degraded'; message?: string }> = {};

  // PostgreSQL
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks['database'] = { status: 'ok' };
  } catch {
    checks['database'] = { status: 'degraded', message: 'PostgreSQL unreachable' };
  }

  // Redis
  try {
    await redis.ping();
    checks['redis'] = { status: 'ok' };
  } catch {
    checks['redis'] = { status: 'degraded', message: 'Redis unreachable' };
  }

  // Code runner (lightweight TCP check via fetch)
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      ctrl.abort();
    }, 2_000);
    const runnerRes = await fetch(`${env.codeRunnerUrl}/health`, {
      headers: { Authorization: `Bearer ${env.codeRunnerToken}` },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    checks['codeRunner'] = runnerRes.ok
      ? { status: 'ok' }
      : { status: 'degraded', message: `Runner returned ${String(runnerRes.status)}` };
  } catch {
    checks['codeRunner'] = { status: 'degraded', message: 'Code runner unreachable' };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'degraded',
    checks,
    meta: { timestamp: new Date().toISOString(), env: env.nodeEnv },
  });
}
