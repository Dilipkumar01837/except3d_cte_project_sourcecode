import type { NextFunction, Request, Response } from 'express';
import { type ZodSchema } from 'zod';
import { sendError } from '../lib/response.js';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      sendError(res, 422, 'VALIDATION_ERROR', 'Validation failed', details);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    req.body = result.data;
    next();
  };
}
