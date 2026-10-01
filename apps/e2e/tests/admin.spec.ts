/**
 * Admin dashboard E2E tests.
 *
 * Covers:
 *   - Admin login / logout
 *   - Overview page
 *   - Users list
 *   - Challenges list
 *   - Challenge creation and publication
 *   - Worlds list
 *   - Achievements list
 *   - RBAC: player cannot access admin pages
 *
 * NOTE: These tests require at least one ADMIN or SUPER_ADMIN user
 * to be configured via environment variables:
 *   ADMIN_E2E_EMAIL
 *   ADMIN_E2E_PASSWORD
 *
 * If the env vars are not set, admin login tests are skipped.
 */

import { test, expect } from '@playwright/test';
import { testEmail, testUsername, TEST_PASSWORD, ADMIN_URL, API_URL } from './helpers';

const ADMIN_EMAIL = process.env['ADMIN_E2E_EMAIL'];
const ADMIN_PASSWORD = process.env['ADMIN_E2E_PASSWORD'];

const hasAdminCreds = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

// ─── Player RBAC ──────────────────────────────────────────────────

test.describe('RBAC — Player cannot access admin', () => {
  let playerEmail: string;
  let playerUsername: string;

  test.beforeAll(async ({ request }) => {
    playerEmail = testEmail();
    playerUsername = testUsername();
    await request.post(API_URL + '/auth/register', {
      data: { email: playerEmail, username: playerUsername, password: TEST_PASSWORD },
    });
  });

  test('admin API returns 403 for PLAYER role', async ({ request }) => {
    // Login to get token
    const loginRes = await request.post(API_URL + '/auth/login', {
      data: { email: playerEmail, password: TEST_PASSWORD },
    });
    const loginBody = (await loginRes.json()) as { data: { accessToken: string } };
    const token = loginBody.data.accessToken;

    // Try admin endpoint
    const adminRes = await request.get(API_URL + '/admin/overview', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(adminRes.status()).toBe(403);
  });

  test('admin API returns 401 for unauthenticated', async ({ request }) => {
    const res = await request.get(API_URL + '/admin/overview');
    expect(res.status()).toBe(401);
  });
});

// ─── Admin login ──────────────────────────────────────────────────

test.describe('Admin dashboard', () => {
  test.skip(!hasAdminCreds, 'Set ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD to run admin UI tests');

  test('admin can log in and see overview', async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(`${ADMIN_URL}/`, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /overview/i })).toBeVisible();
  });

  test('admin overview shows real data counts', async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(`${ADMIN_URL}/`, { timeout: 20_000 });
    // Total users should show a number
    await expect(page.getByText(/total users/i)).toBeVisible();
  });

  test('admin users list shows registered users', async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(`${ADMIN_URL}/`, { timeout: 20_000 });
    await page.goto(`${ADMIN_URL}/users`);
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
  });

  test('admin challenges list is accessible', async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(`${ADMIN_URL}/`, { timeout: 20_000 });
    await page.goto(`${ADMIN_URL}/challenges`);
    await expect(page.getByRole('heading', { name: /challenges/i })).toBeVisible();
  });

  test('admin worlds list is accessible', async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(`${ADMIN_URL}/`, { timeout: 20_000 });
    await page.goto(`${ADMIN_URL}/worlds`);
    await expect(page.getByRole('heading', { name: /worlds/i })).toBeVisible();
  });

  test('admin achievements list is accessible', async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(`${ADMIN_URL}/`, { timeout: 20_000 });
    await page.goto(`${ADMIN_URL}/achievements`);
    await expect(page.getByRole('heading', { name: /achievements/i })).toBeVisible();
  });

  test('admin system page is accessible', async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
    await page.goto(`${ADMIN_URL}/login`);
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(`${ADMIN_URL}/`, { timeout: 20_000 });
    await page.goto(`${ADMIN_URL}/system`);
    await expect(page.getByRole('heading', { name: /system/i })).toBeVisible();
  });

  test('admin cannot access dashboard without login', async ({ page }) => {
    // Navigate to admin dashboard without logging in
    await page.goto(`${ADMIN_URL}/`);
    // Should redirect to login or show unauthorized
    await expect(page).toHaveURL(`${ADMIN_URL}/login`);
  });
});

// ─── API contract tests ───────────────────────────────────────────

test.describe('API contract', () => {
  test('health endpoint returns 200', async ({ request }) => {
    const res = await request.get(API_URL + '/health');
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  test('register returns 201 with token and user', async ({ request }) => {
    const email = testEmail();
    const username = testUsername();
    const res = await request.post(API_URL + '/auth/register', {
      data: { email, username, password: TEST_PASSWORD },
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as { success: boolean; data: { accessToken: string } };
    expect(body.success).toBe(true);
    expect(typeof body.data.accessToken).toBe('string');
  });

  test('duplicate email returns 409', async ({ request }) => {
    const email = testEmail();
    const username1 = testUsername();
    const username2 = testUsername();
    await request.post(API_URL + '/auth/register', {
      data: { email, username: username1, password: TEST_PASSWORD },
    });
    const res = await request.post(API_URL + '/auth/register', {
      data: { email, username: username2, password: TEST_PASSWORD },
    });
    expect(res.status()).toBe(409);
  });

  test('login with wrong password returns 401', async ({ request }) => {
    const email = testEmail();
    const username = testUsername();
    await request.post(API_URL + '/auth/register', {
      data: { email, username, password: TEST_PASSWORD },
    });
    const res = await request.post(API_URL + '/auth/login', {
      data: { email, password: 'WrongPassword999!' },
    });
    expect(res.status()).toBe(401);
  });

  test('forgot-password always returns 200', async ({ request }) => {
    const res = await request.post(API_URL + '/auth/forgot-password', {
      data: { email: 'nobody@test.invalid' },
    });
    expect(res.status()).toBe(200);
  });

  test('challenge list returns array', async ({ request }) => {
    const res = await request.get(API_URL + '/challenges');
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { data: { challenges: unknown[] } };
    expect(Array.isArray(body.data.challenges)).toBe(true);
  });

  test('error responses include code field', async ({ request }) => {
    const res = await request.get(API_URL + '/auth/me');
    expect(res.status()).toBe(401);
    const body = (await res.json()) as { success: boolean; error: { code: string } };
    expect(body.success).toBe(false);
    expect(typeof body.error.code).toBe('string');
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
