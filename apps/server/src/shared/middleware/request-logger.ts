import type { NextFunction, Request, Response, RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';

/**
 * Structured request logger.
 *
 * Adds X-Request-ID header, measures request duration, and logs a
 * structured JSON line per request.
 *
 * Fields logged (never sensitive: no JWTs, tokens, passwords):
 *   requestId, method, path, status, durationMs, userId (if authenticated), ip
 *
 * In production, request bodies and query strings are not logged.
 * Development includes a human-readable duration suffix.
 */

export const requestLogger: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const requestId = randomBytes(8).toString('hex');
  // Store on the request object without augmenting the global type
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const userId = req.user?.sub ?? undefined;
    const isProd = process.env['NODE_ENV'] === 'production';

    if (isProd) {
      // Structured JSON for log aggregation
      const entry = JSON.stringify({
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
        ...(userId ? { userId } : {}),
      });
      process.stdout.write(entry + '\n');
    } else {
      // Human-readable for development
      const statusColor =
        res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
      const reset = '\x1b[0m';
      const userPart = userId ? ` uid:${userId.slice(0, 8)}` : '';
      process.stdout.write(
        `[${requestId.slice(0, 8)}] ${req.method} ${req.path} ${statusColor}${String(res.statusCode)}${reset} ${String(durationMs)}ms${userPart}\n`,
      );
    }
  });

  next();
};
