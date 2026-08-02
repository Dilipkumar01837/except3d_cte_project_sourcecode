import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app/create-app.js';

// Typed shape of our standard API envelope
interface ApiBody<T = Record<string, unknown>> {
  success: boolean;
  data: T;
  error?: { code: string; message: string };
}

function body<T = Record<string, unknown>>(res: { body: unknown }): ApiBody<T> {
  return res.body as ApiBody<T>;
}

const app = createApp();

// ─── Health ──────────────────────────────────────────────────────

describe('GET /api/v1/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });
});

// ─── Auth ─────────────────────────────────────────────────────────

const testEmail = `test_${String(Date.now())}@example.com`;
const testUsername = `testuser_${String(Date.now()).slice(-6)}`;
const testPassword = 'Test123456!';

let accessToken: string;
let refreshCookie: string;

describe('POST /api/v1/auth/register', () => {
  it('creates a new user and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: testEmail, username: testUsername, password: testPassword });

    expect(res.status).toBe(201);

    const b = body<{ accessToken: string; user: { email: string; username: string } }>(res);
    expect(b.data).toHaveProperty('accessToken');
    expect(b.data.user).toMatchObject({ email: testEmail, username: testUsername });

    accessToken = b.data.accessToken;
    refreshCookie = (res.headers as unknown as Record<string, string[]>)['set-cookie']?.[0] ?? '';
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        username: `alt_${testUsername.slice(-10)}`,
        password: testPassword,
      });
    expect(res.status).toBe(409);
  });

  it('rejects weak password with 422', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: `new_${testEmail}`, username: `new_${testUsername}`, password: 'weak' });
    expect(res.status).toBe(422);
    expect(body(res).success).toBe(false);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);

    const b = body<{ accessToken: string }>(res);
    expect(b.data).toHaveProperty('accessToken');
    accessToken = b.data.accessToken;
    refreshCookie = (res.headers as unknown as Record<string, string[]>)['set-cookie']?.[0] ?? '';
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'WrongPass999!' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: testPassword });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(body<{ user: { email: string } }>(res).data.user.email).toBe(testEmail);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('issues new access token from refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', refreshCookie);
    expect(res.status).toBe(200);
    expect(body<{ accessToken: string }>(res).data).toHaveProperty('accessToken');
  });

  it('rejects refresh without cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });
});

// ─── RBAC ─────────────────────────────────────────────────────────

describe('RBAC — admin routes require ADMIN role', () => {
  it('PLAYER gets 403 on /api/v1/admin/overview', async () => {
    // accessToken belongs to a PLAYER (just registered)
    const res = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it('unauthenticated request gets 401 on admin route', async () => {
    const res = await request(app).get('/api/v1/admin/overview');
    expect(res.status).toBe(401);
  });
});

// ─── Player routes ────────────────────────────────────────────────

describe('GET /api/v1/player/dashboard', () => {
  it('returns player data for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/player/dashboard')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    const b = body<{ user: unknown; summary: unknown }>(res);
    expect(b.data).toHaveProperty('user');
    expect(b.data).toHaveProperty('summary');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/player/dashboard');
    expect(res.status).toBe(401);
  });
});

// ─── Challenges ───────────────────────────────────────────────────

describe('GET /api/v1/challenges', () => {
  it('returns published challenges list (may be empty)', async () => {
    const res = await request(app).get('/api/v1/challenges');
    expect(res.status).toBe(200);
    expect(Array.isArray(body<{ challenges: unknown[] }>(res).data.challenges)).toBe(true);
  });
});

// ─── Daily Reward ──────────────────────────────────────────────────

describe('GET /api/v1/player/daily-reward', () => {
  it('returns reward status for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/player/daily-reward')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    const b = body<{ canClaim: boolean; streak: number }>(res);
    expect(b.data).toHaveProperty('canClaim');
    expect(b.data).toHaveProperty('streak');
  });
});

describe('POST /api/v1/player/daily-reward/claim', () => {
  it('allows first claim of the day', async () => {
    const statusRes = await request(app)
      .get('/api/v1/player/daily-reward')
      .set('Authorization', `Bearer ${accessToken}`);
    const canClaim = body<{ canClaim: boolean }>(statusRes).data.canClaim;

    if (!canClaim) {
      // Already claimed today — skip
      return;
    }

    const res = await request(app)
      .post('/api/v1/player/daily-reward/claim')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(201);
    expect(body<{ streak: number }>(res).data).toHaveProperty('streak');
  });

  it('prevents double-claim on same day', async () => {
    // After first claim, second claim should 409
    const firstStatus = await request(app)
      .get('/api/v1/player/daily-reward')
      .set('Authorization', `Bearer ${accessToken}`);

    if (body<{ canClaim: boolean }>(firstStatus).data.canClaim) {
      // Do the first claim
      await request(app)
        .post('/api/v1/player/daily-reward/claim')
        .set('Authorization', `Bearer ${accessToken}`);
    }

    // Now try again
    const res = await request(app)
      .post('/api/v1/player/daily-reward/claim')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(409);
  });
});

// ─── Forgot password (anti-enumeration) ────────────────────────────

describe('POST /api/v1/auth/forgot-password', () => {
  it('always returns 200 regardless of email existence', async () => {
    const res1 = await request(app).post('/api/v1/auth/forgot-password').send({ email: testEmail });
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@nowhere.invalid' });
    expect(res2.status).toBe(200);
  });
});

// ─── Logout ──────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('logs out and clears refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout').set('Cookie', refreshCookie);
    expect(res.status).toBe(200);
  });
});

// ─── Additional regression tests ────────────────────────────────────────────

// BUG-010 regression: error handler should include specific error code
describe('Error envelope structure', () => {
  it('returns success:false with code on auth 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    const b = body(res);
    expect(b.success).toBe(false);
    expect(b.error).toBeDefined();
    expect(typeof b.error?.code).toBe('string');
    expect(b.error?.code).toBe('UNAUTHORIZED');
  });

  it('returns success:false with VALIDATION_ERROR code on invalid schema', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', username: 'x', password: 'weak' });
    expect(res.status).toBe(422);
    const b = body(res);
    expect(b.success).toBe(false);
    expect(b.error?.code).toBe('VALIDATION_ERROR');
  });
});

// BUG-009 regression: secrets must be validated at startup in production
// (Unit test — just confirm dev defaults are accepted in test environment)
describe('Environment secret validation', () => {
  it('server starts in test env with dev defaults', async () => {
    // If env.ts threw on missing secrets, the app would not be created at all
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
  });
});

// Input fuzz tests (BUG regression: Phase 22)
describe('Input fuzz — auth/register', () => {
  it('rejects empty email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: '', username: 'valid_user', password: 'Test123456!' });
    expect(res.status).toBe(422);
  });

  it('rejects username with spaces', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', username: 'invalid user', password: 'Test123456!' });
    expect(res.status).toBe(422);
  });

  it('rejects username too short', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', username: 'ab', password: 'Test123456!' });
    expect(res.status).toBe(422);
  });

  it('rejects oversized displayName', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        username: 'valid_user123',
        password: 'Test123456!',
        displayName: 'A'.repeat(51),
      });
    expect(res.status).toBe(422);
  });

  it('rejects password without uppercase', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', username: 'valid_user123', password: 'alllowercase1' });
    expect(res.status).toBe(422);
  });

  it('rejects password without number', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', username: 'valid_user123', password: 'AllUpperNoNumber' });
    expect(res.status).toBe(422);
  });
});

// RBAC fuzz — Player cannot access any admin endpoint
describe('RBAC fuzz — PLAYER blocked from all admin endpoints', () => {
  let playerToken: string;
  const playerEmail = `rbac_${String(Date.now())}@example.com`;
  const playerUsername = `rbac_${String(Date.now()).slice(-5)}`;

  it('creates a player account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: playerEmail, username: playerUsername, password: 'Test123456!' });
    expect(res.status).toBe(201);
    playerToken = body<{ accessToken: string }>(res).data.accessToken;
  });

  it('PLAYER gets 403 on admin users list', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${playerToken}`);
    expect(res.status).toBe(403);
  });

  it('PLAYER gets 403 on admin challenges list', async () => {
    const res = await request(app)
      .get('/api/v1/admin/challenges')
      .set('Authorization', `Bearer ${playerToken}`);
    expect(res.status).toBe(403);
  });

  it('PLAYER gets 403 on admin worlds list', async () => {
    const res = await request(app)
      .get('/api/v1/admin/worlds')
      .set('Authorization', `Bearer ${playerToken}`);
    expect(res.status).toBe(403);
  });

  it('PLAYER gets 403 on admin achievements list', async () => {
    const res = await request(app)
      .get('/api/v1/admin/achievements')
      .set('Authorization', `Bearer ${playerToken}`);
    expect(res.status).toBe(403);
  });
});

// Player routes additional coverage
describe('Player routes', () => {
  let playerToken: string;
  const pEmail = `player2_${String(Date.now())}@example.com`;
  const pUsername = `player2_${String(Date.now()).slice(-5)}`;

  it('registers a player', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: pEmail, username: pUsername, password: 'Test123456!' });
    expect(res.status).toBe(201);
    playerToken = body<{ accessToken: string }>(res).data.accessToken;
  });

  it('GET /api/v1/player/worlds returns worlds array', async () => {
    const res = await request(app)
      .get('/api/v1/player/worlds')
      .set('Authorization', `Bearer ${playerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(body<{ worlds: unknown[] }>(res).data.worlds)).toBe(true);
  });

  it('GET /api/v1/player/achievements returns achievements array', async () => {
    const res = await request(app)
      .get('/api/v1/player/achievements')
      .set('Authorization', `Bearer ${playerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(body<{ achievements: unknown[] }>(res).data.achievements)).toBe(true);
  });

  it('GET /api/v1/player/notifications returns notifications array', async () => {
    const res = await request(app)
      .get('/api/v1/player/notifications')
      .set('Authorization', `Bearer ${playerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(body<{ notifications: unknown[] }>(res).data.notifications)).toBe(true);
  });

  it('GET /api/v1/player/leaderboard returns leaderboard data', async () => {
    const res = await request(app)
      .get('/api/v1/player/leaderboard')
      .set('Authorization', `Bearer ${playerToken}`);
    expect(res.status).toBe(200);
    const b = body<{ leaderboard: unknown[]; type: string }>(res);
    expect(Array.isArray(b.data.leaderboard)).toBe(true);
    expect(typeof b.data.type).toBe('string');
  });

  it('GET /api/v1/player/worlds/:worldId/levels with invalid ID returns 404', async () => {
    const res = await request(app)
      .get('/api/v1/player/worlds/00000000-0000-0000-0000-000000000000/levels')
      .set('Authorization', `Bearer ${playerToken}`);
    expect(res.status).toBe(404);
  });

  it('unauthenticated GET /api/v1/player/achievements returns 401', async () => {
    const res = await request(app).get('/api/v1/player/achievements');
    expect(res.status).toBe(401);
  });
});

// Challenge public endpoints
describe('Challenge public endpoints', () => {
  it('GET /api/v1/challenges/:slug with unknown slug returns 404', async () => {
    const res = await request(app).get('/api/v1/challenges/this-does-not-exist-xyz');
    expect(res.status).toBe(404);
    const b = body(res);
    expect(b.success).toBe(false);
  });
});

// Update profile
describe('PATCH /api/v1/auth/profile', () => {
  let profileToken: string;
  const profEmail = `profile_${String(Date.now())}@example.com`;
  const profUsername = `prof_${String(Date.now()).slice(-5)}`;

  it('registers user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: profEmail, username: profUsername, password: 'Test123456!' });
    expect(res.status).toBe(201);
    profileToken = body<{ accessToken: string }>(res).data.accessToken;
  });

  it('updates display name', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${profileToken}`)
      .send({ displayName: 'New Name' });
    expect(res.status).toBe(200);
  });

  it('rejects invalid avatarUrl (non-URL string)', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${profileToken}`)
      .send({ avatarUrl: 'not-a-url' });
    expect(res.status).toBe(422);
  });

  it('accepts null avatarUrl to clear avatar', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${profileToken}`)
      .send({ avatarUrl: null });
    expect(res.status).toBe(200);
  });

  it('rejects bio over 300 chars', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${profileToken}`)
      .send({ bio: 'x'.repeat(301) });
    expect(res.status).toBe(422);
  });
});

// Submission edge cases
describe('POST /api/v1/challenges/:slug/submissions edge cases', () => {
  let submissionToken: string;
  const subEmail = `sub_${String(Date.now())}@example.com`;
  const subUsername = `sub_${String(Date.now()).slice(-5)}`;

  it('registers user for submission tests', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: subEmail, username: subUsername, password: 'Test123456!' });
    expect(res.status).toBe(201);
    submissionToken = body<{ accessToken: string }>(res).data.accessToken;
  });

  it('returns 404 for unknown challenge slug', async () => {
    const res = await request(app)
      .post('/api/v1/challenges/unknown-xyz-challenge/submissions')
      .set('Authorization', `Bearer ${submissionToken}`)
      .send({ language: 'PYTHON', sourceCode: 'print("hi")' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for unsupported language', async () => {
    const res = await request(app)
      .post('/api/v1/challenges/any-challenge/submissions')
      .set('Authorization', `Bearer ${submissionToken}`)
      .send({ language: 'BRAINFUCK', sourceCode: '+++' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty source code', async () => {
    const res = await request(app)
      .post('/api/v1/challenges/any-challenge/submissions')
      .set('Authorization', `Bearer ${submissionToken}`)
      .send({ language: 'PYTHON', sourceCode: '' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for unauthenticated submission', async () => {
    const res = await request(app)
      .post('/api/v1/challenges/any-challenge/submissions')
      .send({ language: 'PYTHON', sourceCode: 'print("hi")' });
    expect(res.status).toBe(401);
  });
});

// Password reset flow
describe('Password reset — full flow', () => {
  const resetEmail = `reset_${String(Date.now())}@example.com`;
  const resetUsername = `reset_${String(Date.now()).slice(-5)}`;

  it('registers user to test reset flow', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: resetEmail, username: resetUsername, password: 'Test123456!' });
    expect(res.status).toBe(201);
  });

  it('rejects reset with invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'invalid-token-xyz', password: 'NewPass123!' });
    expect(res.status).toBe(400);
  });

  it('rejects reset with weak new password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'any-token', password: 'weak' });
    expect(res.status).toBe(422);
  });
});
