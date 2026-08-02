import { request as httpsRequest } from 'node:https';
import type { Request, Response } from 'express';
import { generateToken } from '../../shared/lib/crypto.js';
import { env } from '../../config/index.js';
import { oauthLogin } from './auth.service.js';

const COOKIE_STATE = 'oauth_state';
const STATE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 10 * 60 * 1000, // 10 minutes
  path: '/',
};

const REFRESH_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// ─────────────────────────────────────────────────────────────────
// Generic HTTPS helper — avoids adding external OAuth SDKs
// ─────────────────────────────────────────────────────────────────

function httpsPost(host: string, path: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        host,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'code-to-escape/1.0',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          resolve(data);
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsGet(host: string, path: string, token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        host,
        path,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'code-to-escape/1.0',
          Accept: 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          resolve(data);
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────
// Google OAuth
// ─────────────────────────────────────────────────────────────────

export function startGoogleOAuth(req: Request, res: Response): void {
  const state = generateToken(16);
  res.cookie(COOKIE_STATE, state, STATE_OPTIONS);
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: `${env.appUrl}/api/v1/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export async function googleOAuthCallback(req: Request, res: Response): Promise<void> {
  const { code, state } = req.query as { code?: string; state?: string };
  const storedState = (req.cookies as Record<string, string | undefined>)[COOKIE_STATE];

  res.clearCookie(COOKIE_STATE, { ...STATE_OPTIONS, maxAge: 0 });

  if (!code || !state || state !== storedState) {
    res.redirect(`${env.appUrl}/login?error=oauth_state_mismatch`);
    return;
  }

  try {
    const tokenBody = new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: `${env.appUrl}/api/v1/auth/google/callback`,
      grant_type: 'authorization_code',
    }).toString();

    const tokenRaw = await httpsPost('oauth2.googleapis.com', '/token', tokenBody);
    const tokenData = JSON.parse(tokenRaw) as { access_token?: string; id_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error('No access token from Google');

    const userRaw = await httpsGet('www.googleapis.com', '/oauth2/v2/userinfo', accessToken);
    const userInfo = JSON.parse(userRaw) as {
      id: string;
      email: string;
      name?: string;
      picture?: string;
    };

    const { accessToken: jwtToken, refreshToken } = await oauthLogin(
      'GOOGLE',
      userInfo.id,
      userInfo.email,
      userInfo.name ?? userInfo.email.split('@')[0] ?? 'Player',
      userInfo.picture,
      req.ip,
      req.get('user-agent'),
    );

    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    res.redirect(`${env.appUrl}/dashboard?access_token=${jwtToken}`);
  } catch {
    res.redirect(`${env.appUrl}/login?error=oauth_failed`);
  }
}

// ─────────────────────────────────────────────────────────────────
// GitHub OAuth
// ─────────────────────────────────────────────────────────────────

export function startGithubOAuth(req: Request, res: Response): void {
  const state = generateToken(16);
  res.cookie(COOKIE_STATE, state, STATE_OPTIONS);
  const params = new URLSearchParams({
    client_id: env.githubClientId,
    redirect_uri: `${env.appUrl}/api/v1/auth/github/callback`,
    scope: 'read:user user:email',
    state,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
}

export async function githubOAuthCallback(req: Request, res: Response): Promise<void> {
  const { code, state } = req.query as { code?: string; state?: string };
  const storedState = (req.cookies as Record<string, string | undefined>)[COOKIE_STATE];

  res.clearCookie(COOKIE_STATE, { ...STATE_OPTIONS, maxAge: 0 });

  if (!code || !state || state !== storedState) {
    res.redirect(`${env.appUrl}/login?error=oauth_state_mismatch`);
    return;
  }

  try {
    const tokenBody = new URLSearchParams({
      client_id: env.githubClientId,
      client_secret: env.githubClientSecret,
      code,
      redirect_uri: `${env.appUrl}/api/v1/auth/github/callback`,
    }).toString();

    const tokenRaw = await httpsPost('github.com', '/login/oauth/access_token', tokenBody);
    const tokenParams = new URLSearchParams(tokenRaw);
    const githubToken = tokenParams.get('access_token');
    if (!githubToken) throw new Error('No access token from GitHub');

    const userRaw = await httpsGet('api.github.com', '/user', githubToken);
    const userInfo = JSON.parse(userRaw) as {
      id: number;
      login: string;
      name?: string;
      avatar_url?: string;
      email?: string;
    };

    // GitHub may not return email in /user — fetch from /user/emails if missing
    let email = userInfo.email ?? '';
    if (!email) {
      const emailsRaw = await httpsGet('api.github.com', '/user/emails', githubToken);
      const emails = JSON.parse(emailsRaw) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      email =
        emails.find((e) => e.primary && e.verified)?.email ??
        emails[0]?.email ??
        `${userInfo.login}@github.invalid`;
    }

    const { accessToken: jwtToken, refreshToken } = await oauthLogin(
      'GITHUB',
      String(userInfo.id),
      email,
      userInfo.name ?? userInfo.login,
      userInfo.avatar_url,
      req.ip,
      req.get('user-agent'),
    );

    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    res.redirect(`${env.appUrl}/dashboard?access_token=${jwtToken}`);
  } catch {
    res.redirect(`${env.appUrl}/login?error=oauth_failed`);
  }
}
