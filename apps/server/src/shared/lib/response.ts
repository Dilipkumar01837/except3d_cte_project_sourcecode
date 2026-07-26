import type { Response } from 'express';

export function sendSuccess(res: Response, data: unknown, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
    meta: { timestamp: new Date().toISOString() },
  });
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Array<{ field: string; message: string }>,
): void {
  res.status(statusCode).json({
    success: false,
    error: { code, message, details },
    meta: { timestamp: new Date().toISOString() },
  });
}
