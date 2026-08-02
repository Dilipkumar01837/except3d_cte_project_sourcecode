import type { Request, Response } from 'express';
import { prisma } from '../../shared/lib/prisma.js';
import { sendSuccess, sendError } from '../../shared/lib/response.js';
import { emailService, buildPasswordResetEmail } from '../../shared/lib/email.js';
import { env } from '../../config/index.js';
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshTokens,
  forgotPassword,
  resetPassword,
} from './auth.service.js';
import type {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.schema.js';

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
};

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, COOKIE_OPTIONS);
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTIONS, maxAge: 0 });
}

interface FormattableUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  authProvider: string;
  role: string;
  createdAt: Date;
  profile: {
    displayName: string;
    level: number;
    xp: number;
    coins: number;
    rank: string;
    currentWorld: string;
    codingStreak: number;
    bio: string | null;
  } | null;
}

function formatUser(user: FormattableUser) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    authProvider: user.authProvider,
    role: user.role,
    createdAt: user.createdAt,
    profile: user.profile,
  };
}

// POST /auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterInput;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  const { user, accessToken, refreshToken } = await registerUser(input, ipAddress, userAgent);
  setRefreshCookie(res, refreshToken);

  sendSuccess(res, { accessToken, user: formatUser(user) }, 201);
}

// POST /auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const input = req.body as LoginInput;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  const { user, accessToken, refreshToken } = await loginUser(input, ipAddress, userAgent);
  setRefreshCookie(res, refreshToken);

  sendSuccess(res, { accessToken, user: formatUser(user) });
}

// POST /auth/logout
export async function logout(req: Request, res: Response): Promise<void> {
  const rawRefreshToken = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
  await logoutUser(rawRefreshToken);
  clearRefreshCookie(res);
  sendSuccess(res, { message: 'Logged out successfully' });
}

// POST /auth/refresh
export async function refresh(req: Request, res: Response): Promise<void> {
  const rawRefreshToken = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];

  if (!rawRefreshToken) {
    sendError(res, 401, 'UNAUTHORIZED', 'No refresh token provided');
    return;
  }

  const { accessToken, refreshToken: newRefreshToken } = await refreshTokens(rawRefreshToken);
  setRefreshCookie(res, newRefreshToken);
  sendSuccess(res, { accessToken });
}

// POST /auth/forgot-password
export async function forgotPasswordHandler(req: Request, res: Response): Promise<void> {
  const { email } = req.body as ForgotPasswordInput;
  const token = await forgotPassword(email);

  // Always return 200 to prevent email enumeration
  // Send email if a token was generated (user exists and uses email auth)
  if (token) {
    const resetUrl = `${env.appUrl}/reset-password?token=${token}`;
    await emailService.send({
      to: email,
      ...buildPasswordResetEmail(resetUrl),
    });
  }

  sendSuccess(res, {
    message: 'If an account with that email exists, you will receive a password reset email.',
  });
}

// POST /auth/reset-password
export async function resetPasswordHandler(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as ResetPasswordInput;
  await resetPassword(token, password);
  sendSuccess(res, { message: 'Password has been reset successfully. Please log in.' });
}

// GET /me
export async function getMe(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    sendError(res, 404, 'NOT_FOUND', 'User not found');
    return;
  }

  sendSuccess(res, { user: formatUser(user) });
}

// PATCH /profile
export async function updateProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
    return;
  }

  const { displayName, bio, avatarUrl } = req.body as {
    displayName?: string;
    bio?: string;
    avatarUrl?: string | null;
  };

  // Profile and User share some fields — update each model's own columns only
  const profile = await prisma.profile.update({
    where: { userId },
    data: {
      ...(displayName !== undefined && { displayName }),
      ...(bio !== undefined && { bio }),
    },
  });

  if (avatarUrl !== undefined) {
    await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
  }

  sendSuccess(res, { profile });
}

// DELETE /account
export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;
  if (!userId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
    return;
  }

  await prisma.user.delete({ where: { id: userId } });
  clearRefreshCookie(res);
  sendSuccess(res, { message: 'Account deleted successfully' });
}
