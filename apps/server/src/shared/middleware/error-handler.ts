import type { NextFunction, Request, Response, RequestHandler } from 'express';
import { ZodError } from 'zod';

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
  error: AppError | ZodError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ZodError from a bare .parse() call — turn it into a structured 422 instead of a 500.
  if (error instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      },
      meta: { timestamp: new Date().toISOString() },
    });
    return;
  }
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
