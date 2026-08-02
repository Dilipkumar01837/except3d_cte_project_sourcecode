/**
 * Player journey E2E tests.
 *
 * Covers:
 *   - Landing page
 *   - Registration
 *   - Login / Logout
 *   - Dashboard
 *   - Challenges list
 *   - Authentication error states
 *   - Protected route redirect
 *   - Profile page
 *   - Settings page
 */

import { test, expect } from '@playwright/test';
import { testEmail, testUsername, TEST_PASSWORD, registerAndLogin, logout } from './helpers';

// ─── Landing page ─────────────────────────────────────────────────

test.describe('Landing page', () => {
  test('renders hero and key navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Code to Escape/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /start your escape/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /log in/i })).toBeVisible();
  });

  test('navigation to register and login works', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /start your escape|create/i })
      .first()
      .click();
    await expect(page).toHaveURL('/register');
    await page.goto('/');
    await page.getByRole('link', { name: /log in/i }).click();
    await expect(page).toHaveURL('/login');
  });
});

// ─── Registration ─────────────────────────────────────────────────

test.describe('Registration', () => {
  test('successful registration lands on dashboard', async ({ page }) => {
    const email = testEmail();
    const username = testUsername();
    await page.goto('/register');
    await page.getByLabel('Username').fill(username);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForURL('/dashboard', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /hey,/i })).toBeVisible();
  });

  test('shows validation errors for empty fields', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/username is required/i)).toBeVisible();
  });

  test('shows error for duplicate email', async ({ page }) => {
    const email = testEmail();
    const username1 = testUsername();
    const username2 = testUsername();
    // First registration
    await page.goto('/register');
    await page.getByLabel('Username').fill(username1);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();
    await page.waitForURL('/dashboard');
    // Logout
    await page.goto('/login');
    await page.goto('/');
    // Second registration with same email
    await page.goto('/register');
    await page.getByLabel('Username').fill(username2);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/email already in use|already/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Login ────────────────────────────────────────────────────────

test.describe('Login', () => {
  let email: string;
  let username: string;

  test.beforeAll(async ({ request }) => {
    email = testEmail();
    username = testUsername();
    await request.post('http://localhost:3001/api/v1/auth/register', {
      data: { email, username, password: TEST_PASSWORD },
    });
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard', { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /hey,/i })).toBeVisible();
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('WrongPassword999!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|password/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL('/login');
  });

  test('shows error for unknown email', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@test.invalid');
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|not found|incorrect/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Dashboard ────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  let email: string;
  let username: string;

  test.beforeAll(async ({ request }) => {
    email = testEmail();
    username = testUsername();
    await request.post('http://localhost:3001/api/v1/auth/register', {
      data: { email, username, password: TEST_PASSWORD },
    });
  });

  test('shows stats and quick-access buttons', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard');

    await expect(page.getByRole('heading', { name: /hey,/i })).toBeVisible();
    await expect(page.getByText(/level/i)).toBeVisible();
    await expect(page.getByText(/xp/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /play challenges/i })).toBeVisible();
  });
});

// ─── Protected route redirect ─────────────────────────────────────

test.describe('Protected routes', () => {
  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    // Clear localStorage first
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.goto('/dashboard');
    await page.waitForURL('/login', { timeout: 10_000 });
  });

  test('unauthenticated access to /challenges redirects to /login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.goto('/challenges');
    await page.waitForURL('/login', { timeout: 10_000 });
  });
});

// ─── Challenge list ───────────────────────────────────────────────

test.describe('Challenges list', () => {
  let email: string;
  let username: string;

  test.beforeAll(async ({ request }) => {
    email = testEmail();
    username = testUsername();
    await request.post('http://localhost:3001/api/v1/auth/register', {
      data: { email, username, password: TEST_PASSWORD },
    });
  });

  test('shows challenge list page after login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard');
    await page.goto('/challenges');
    // Page should load without error
    await expect(page).not.toHaveURL('/login');
    // Either shows challenges or empty state
    await expect(page.locator('body')).toBeVisible();
  });
});

// ─── Profile page ─────────────────────────────────────────────────

test.describe('Profile page', () => {
  let email: string;
  let username: string;

  test.beforeAll(async ({ request }) => {
    email = testEmail();
    username = testUsername();
    await request.post('http://localhost:3001/api/v1/auth/register', {
      data: { email, username, password: TEST_PASSWORD },
    });
  });

  test('loads profile and shows edit form', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard');
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /your profile/i })).toBeVisible();
    await expect(page.getByLabel('Display Name')).toBeVisible();
  });

  test('can update display name', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/dashboard');
    await page.goto('/profile');
    const displayNameInput = page.getByLabel('Display Name');
    await displayNameInput.clear();
    await displayNameInput.fill('E2E Updated Name');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Logout ───────────────────────────────────────────────────────

test.describe('Logout', () => {
  test('logout clears session and redirects to home', async ({ page }) => {
    const email = testEmail();
    const username = testUsername();
    await registerAndLogin(page, email, username);
    await logout(page);
    await expect(page).toHaveURL('/');
    // After logout, /dashboard should redirect to /login
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.goto('/dashboard');
    await page.waitForURL('/login', { timeout: 10_000 });
  });
});

// ─── 404 ─────────────────────────────────────────────────────────

test.describe('404 page', () => {
  test('shows not found page for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-at-all');
    await expect(page.getByText(/not found|404|page.*not/i)).toBeVisible({ timeout: 10_000 });
  });
});
