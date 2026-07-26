import type { NextFunction, Request, Response } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  error: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = error.statusCode ?? 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message: error.message,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}
