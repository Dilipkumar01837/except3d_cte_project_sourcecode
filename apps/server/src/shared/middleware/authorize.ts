import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { sendError } from '../lib/response.js';

/** Restricts an authenticated route to one of the supplied application roles. */
export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, 403, 'FORBIDDEN', 'You do not have permission to perform this action');
      return;
    }
    next();
  };
}
