import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../../config/index.js';

export interface AccessTokenPayload {
  sub: string; // userId
  username: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  family: string;
  tokenId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    issuer: 'code-to-escape',
    audience: 'cte-client',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtSecret, {
    issuer: 'code-to-escape',
    audience: 'cte-client',
  }) as AccessTokenPayload;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.refreshTokenSecret, {
    expiresIn: env.refreshTokenExpiresIn as jwt.SignOptions['expiresIn'],
    issuer: 'code-to-escape',
    audience: 'cte-refresh',
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.refreshTokenSecret, {
    issuer: 'code-to-escape',
    audience: 'cte-refresh',
  }) as RefreshTokenPayload;
}
