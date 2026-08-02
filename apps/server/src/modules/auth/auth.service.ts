import { prisma } from '../../shared/lib/prisma.js';
import type { UserRole } from '@prisma/client';
import { hashPassword, verifyPassword, hashToken, generateToken } from '../../shared/lib/crypto.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/lib/jwt.js';
import { env } from '../../config/index.js';
import type { RegisterInput, LoginInput } from './auth.schema.js';
import { evaluateAchievements } from '../challenges/achievement.service.js';

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function parseDuration(dur: string): number {
  const units: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  const match = /^(\d+)([smhd])$/.exec(dur);
  if (!match) return 7 * 86400; // default 7d
  return Number(match[1]) * (units[match[2] as string] ?? 86400);
}

function refreshTokenExpiryDate(): Date {
  const seconds = parseDuration(env.refreshTokenExpiresIn);
  return new Date(Date.now() + seconds * 1000);
}

function sessionExpiryDate(): Date {
  const seconds = parseDuration(env.refreshTokenExpiresIn);
  return new Date(Date.now() + seconds * 1000);
}

async function issueTokenPair(
  userId: string,
  username: string,
  email: string,
  role: UserRole,
  family: string,
) {
  const rawRefreshToken = generateToken(40);
  const tokenHash = hashToken(rawRefreshToken);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      family,
      expiresAt: refreshTokenExpiryDate(),
    },
  });

  const accessToken = signAccessToken({ sub: userId, username, email, role });
  const refreshToken = signRefreshToken({ sub: userId, family, tokenId: rawRefreshToken });

  return { accessToken, refreshToken };
}

// ─────────────────────────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────────────────────────

export async function registerUser(input: RegisterInput, ipAddress?: string, userAgent?: string) {
  const [existingEmail, existingUsername] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.user.findUnique({ where: { username: input.username } }),
  ]);

  if (existingEmail) {
    throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
  }
  if (existingUsername) {
    throw Object.assign(new Error('Username already taken'), { statusCode: 409 });
  }

  const passwordHash = await hashPassword(input.password);
  const emailVerifyToken = generateToken();

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      emailVerifyToken,
      authProvider: 'EMAIL',
      profile: {
        create: {
          displayName: input.displayName ?? input.username,
          level: 1,
          xp: 0,
          coins: 100,
          rank: 'BEGINNER',
          currentWorld: 'PYTHON_FOREST',
          codingStreak: 0,
        },
      },
    },
    include: { profile: true },
  });

  // Create session
  const family = generateToken(16);
  const { accessToken, refreshToken } = await issueTokenPair(
    user.id,
    user.username,
    user.email,
    user.role,
    family,
  );

  await prisma.session.create({
    data: {
      userId: user.id,
      ipAddress,
      userAgent,
      expiresAt: sessionExpiryDate(),
    },
  });

  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      ipAddress,
      userAgent,
      provider: 'EMAIL',
      success: true,
    },
  });

  // Evaluate first-login achievement (non-blocking)
  void evaluateAchievements({ userId: user.id, trigger: 'FIRST_LOGIN' });

  return { user, accessToken, refreshToken };
}

// ─────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────

export async function loginUser(input: LoginInput, ipAddress?: string, userAgent?: string) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { profile: true },
  });

  const logFailure = async (reason: string) => {
    if (user) {
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress,
          userAgent,
          provider: 'EMAIL',
          success: false,
          failReason: reason,
        },
      });
    }
  };

  if (!user || !user.isActive) {
    await logFailure('USER_NOT_FOUND');
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  if (!user.passwordHash) {
    await logFailure('OAUTH_ONLY_ACCOUNT');
    throw Object.assign(new Error('This account uses social login'), { statusCode: 401 });
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    await logFailure('WRONG_PASSWORD');
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const family = generateToken(16);
  const { accessToken, refreshToken } = await issueTokenPair(
    user.id,
    user.username,
    user.email,
    user.role,
    family,
  );

  await prisma.session.create({
    data: {
      userId: user.id,
      ipAddress,
      userAgent,
      expiresAt: sessionExpiryDate(),
    },
  });

  await prisma.loginHistory.create({
    data: {
      userId: user.id,
      ipAddress,
      userAgent,
      provider: 'EMAIL',
      success: true,
    },
  });

  return { user, accessToken, refreshToken };
}

// ─────────────────────────────────────────────────────────────────
// Refresh
// ─────────────────────────────────────────────────────────────────

export async function refreshTokens(rawRefreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
  }

  const tokenHash = hashToken(payload.tokenId);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
    // Possible token reuse — revoke entire family
    if (stored?.family) {
      await prisma.refreshToken.updateMany({
        where: { family: stored.family },
        data: { isRevoked: true },
      });
    }
    throw Object.assign(new Error('Refresh token is invalid or expired'), { statusCode: 401 });
  }

  // Rotate — revoke used token
  await prisma.refreshToken.update({ where: { tokenHash }, data: { isRevoked: true } });

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw Object.assign(new Error('User not found'), { statusCode: 401 });
  }

  const { accessToken, refreshToken: newRefreshToken } = await issueTokenPair(
    user.id,
    user.username,
    user.email,
    user.role,
    stored.family,
  );

  return { accessToken, refreshToken: newRefreshToken };
}

// ─────────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────────

export async function logoutUser(rawRefreshToken?: string): Promise<void> {
  if (!rawRefreshToken) return;

  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    return; // already invalid — nothing to do
  }

  const tokenHash = hashToken(payload.tokenId);

  // Revoke this token and all in its family
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (stored) {
    await prisma.refreshToken.updateMany({
      where: { family: stored.family },
      data: { isRevoked: true },
    });
  }

  // Deactivate sessions for user
  await prisma.session.updateMany({
    where: { userId: payload.sub, isActive: true },
    data: { isActive: false },
  });
}

// ─────────────────────────────────────────────────────────────────
// Forgot Password
// ─────────────────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.authProvider !== 'EMAIL') return null;

  const token = generateToken();
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetPasswordToken: hashToken(token), resetPasswordExpiry: expiry },
  });

  return token; // Caller is responsible for emailing this
}

// ─────────────────────────────────────────────────────────────────
// Reset Password
// ─────────────────────────────────────────────────────────────────

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(rawToken);

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: tokenHash,
      resetPasswordExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw Object.assign(new Error('Reset token is invalid or expired'), { statusCode: 400 });
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpiry: null,
    },
  });

  // Revoke all refresh tokens for security
  await prisma.refreshToken.updateMany({
    where: { userId: user.id },
    data: { isRevoked: true },
  });
}

// ─────────────────────────────────────────────────────────────────
// OAuth (Google / GitHub)
// ─────────────────────────────────────────────────────────────────

export async function oauthLogin(
  provider: 'GOOGLE' | 'GITHUB',
  oauthId: string,
  email: string,
  displayName: string,
  avatarUrl?: string,
  ipAddress?: string,
  userAgent?: string,
) {
  let user = await prisma.user.findFirst({
    where: { oauthId, authProvider: provider },
    include: { profile: true },
  });

  if (!user) {
    // Try to link by email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { oauthId, authProvider: provider, avatarUrl: avatarUrl ?? existing.avatarUrl },
        include: { profile: true },
      });
    } else {
      // Create new user
      const base = email.split('@')[0] ?? 'player';
      const uniqueSuffix = Math.floor(Math.random() * 9000 + 1000);
      const username = `${base.replace(/[^a-zA-Z0-9_]/g, '_')}_${String(uniqueSuffix)}`;

      user = await prisma.user.create({
        data: {
          email,
          username,
          oauthId,
          authProvider: provider,
          emailVerified: true,
          avatarUrl,
          profile: {
            create: {
              displayName,
              level: 1,
              xp: 0,
              coins: 100,
              rank: 'BEGINNER',
              currentWorld: 'PYTHON_FOREST',
              codingStreak: 0,
            },
          },
        },
        include: { profile: true },
      });
    }
  }

  const family = generateToken(16);
  const { accessToken, refreshToken } = await issueTokenPair(
    user.id,
    user.username,
    user.email,
    user.role,
    family,
  );

  await prisma.session.create({
    data: { userId: user.id, ipAddress, userAgent, expiresAt: sessionExpiryDate() },
  });

  await prisma.loginHistory.create({
    data: { userId: user.id, ipAddress, userAgent, provider, success: true },
  });

  return { user, accessToken, refreshToken };
}
