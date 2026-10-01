/**
 * E2E test helpers — shared utilities for game-client and admin tests.
 *
 * Never hard-code real user IDs or credentials in committed code.
 * Test users are created dynamically with unique timestamps.
 */

import type { Page } from '@playwright/test';

// ─── Unique test data generators ─────────────────────────────────

const ts = () => Date.now().toString(36);

export function testEmail(): string {
  return `e2e_${ts()}@test.invalid`;
}

export function testUsername(): string {
  // max 20 chars, only letters/numbers/underscores
  return `e2e_${ts().slice(-8)}`;
}

export const TEST_PASSWORD = 'E2eTest123!';
export const GAME_CLIENT_URL = process.env['E2E_CLIENT_URL'] ?? 'http://localhost:5173';
export const ADMIN_URL = process.env['E2E_ADMIN_URL'] ?? 'http://localhost:5174';
// Derived from the API port rather than hard-coded, so the suite follows the
// server instead of silently probing a port nothing is listening on.
const API_BASE = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:3000';
export const API_URL = `${API_BASE}/api/v1`;

// ─── Game-client helpers ──────────────────────────────────────────

/** Register a new player account through the UI and land on /dashboard. */
export async function registerAndLogin(
  page: Page,
  email: string,
  username: string,
  password = TEST_PASSWORD,
): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await page.waitForURL('/dashboard', { timeout: 15_000 });
}

/** Login an existing player through the UI. */
export async function loginPlayer(
  page: Page,
  email: string,
  password = TEST_PASSWORD,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/dashboard', { timeout: 15_000 });
}

/** Logout via the navigation profile dropdown. */
export async function logout(page: Page): Promise<void> {
  // Open profile dropdown and click Log out
  const profileButton = page.locator('header button').filter({ hasText: /[A-Z]/ }).first();
  await profileButton.click();
  await page.getByRole('button', { name: 'Log out' }).click();
  // Confirm the logout dialog
  await page.getByRole('button', { name: 'Log out' }).last().click();
  await page.waitForURL('/', { timeout: 10_000 });
}

// ─── Admin helpers ────────────────────────────────────────────────

/** Login to the admin dashboard directly via the admin API. */
export async function adminLogin(
  page: Page,
  adminEmail: string,
  adminPassword: string,
): Promise<void> {
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill(adminPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(`${ADMIN_URL}/`, { timeout: 15_000 });
}

// ─── API helpers (direct calls, bypass UI) ───────────────────────

export interface ApiPlayer {
  accessToken: string;
  userId: string;
  username: string;
}

/** Create a player directly via API (faster than UI for setup/teardown). */
export async function createPlayerViaApi(
  request: {
    post: (url: string, opts: { data: unknown }) => Promise<{ json: () => Promise<unknown> }>;
  },
  email: string,
  username: string,
  password = TEST_PASSWORD,
): Promise<ApiPlayer> {
  const res = await request.post(`${API_URL}/auth/register`, {
    data: { email, username, password },
  });
  const body = (await res.json()) as {
    data: { accessToken: string; user: { id: string; username: string } };
  };
  return {
    accessToken: body.data.accessToken,
    userId: body.data.user.id,
    username: body.data.user.username,
  };
}
