import type { Request, Response } from 'express';
import type { HealthStatus } from '@code-to-escape/types';

export function getHealth(_req: Request, res: Response): void {
  const data: HealthStatus = { status: 'ok' };
  res.status(200).json(data);
}
