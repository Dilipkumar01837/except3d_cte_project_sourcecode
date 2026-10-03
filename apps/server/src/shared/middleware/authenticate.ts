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

/**
 * Resolves the live user behind a bearer token. The access token is stateless,
 * so its role and active flag go stale the moment an admin demotes or suspends
 * the account. Trusting the claim would leave a demoted SUPER_ADMIN (or a
 * suspended account) with full privileges until the 15m token expired, so the
 * live row is always re-read.
 *
 * Returns null when there is no usable token or the account is gone/inactive.
 * Throws only on a database failure, which the caller decides how to treat.
 */
async function resolveTokenUser(req: Request): Promise<AccessTokenPayload | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  let payload: AccessTokenPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { isActive: true, role: true },
  });
  if (!user || !user.isActive) return null;
  return { ...payload, role: user.role };
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 401, 'UNAUTHORIZED', 'No access token provided');
    return;
  }

  let user: AccessTokenPayload | null;
  try {
    user = await resolveTokenUser(req);
  } catch (error) {
    // Express 4 does not forward rejections from async handlers, so an
    // unhandled database failure here would hang the request instead of
    // returning an error.
    next(error);
    return;
  }

  if (!user) {
    sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired access token');
    return;
  }

  req.user = user;
  next();
}

/**
 * Populates `req.user` when a valid bearer token is present, but never rejects.
 * Used by routes that are public yet enrich their response for signed-in
 * players (for example, the escape-room context on a challenge).
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await resolveTokenUser(req);
    if (user) req.user = user;
  } catch {
    // A public route stays public even if the database hiccups; the handler
    // either fails later or simply omits the per-player enrichment.
  }
  next();
}
