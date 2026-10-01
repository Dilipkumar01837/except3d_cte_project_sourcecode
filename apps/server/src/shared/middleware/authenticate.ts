import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt.js';
import { sendError } from '../lib/response.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 401, 'UNAUTHORIZED', 'No access token provided');
    return;
  }

  const token = authHeader.slice(7);

  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired access token');
    return;
  }

  // The access token is stateless, so its role and active flag go stale the
  // moment an admin demotes or suspends the account. Trusting the claim would
  // leave a demoted SUPER_ADMIN (or a suspended account) with full privileges
  // until the 15m token expired. Re-read the live row and reject anything that
  // is no longer valid.
  let user: { isActive: boolean; role: AccessTokenPayload['role'] } | null;
  try {
    user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isActive: true, role: true },
    });
  } catch (error) {
    // Express 4 does not forward rejections from async handlers, so an
    // unhandled database failure here would hang the request instead of
    // returning an error.
    next(error);
    return;
  }

  if (!user || !user.isActive) {
    sendError(res, 401, 'UNAUTHORIZED', 'Account is suspended or no longer exists');
    return;
  }

  req.user = { ...payload, role: user.role };
  next();
}
