import type { NextFunction, Request, Response, RequestHandler } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/** Wraps an async route handler so that thrown errors are forwarded to Express error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(
  error: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = error.statusCode ?? 500;
  const code = statusCode === 500 ? 'INTERNAL_ERROR' : (error.code ?? 'REQUEST_ERROR');
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: statusCode === 500 ? 'An unexpected error occurred' : error.message,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}
