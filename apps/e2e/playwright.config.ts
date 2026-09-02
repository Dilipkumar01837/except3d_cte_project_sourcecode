import { defineConfig, devices } from '@playwright/test';

/**
 * Code to Escape — Playwright E2E Configuration
 *
 * Prerequisites:
 *   1. pnpm docker:up
 *   2. pnpm --filter @code-to-escape/server dev  (port 3000)
 *   3. pnpm --filter @code-to-escape/game-client dev  (port 5173)
 *   4. pnpm --filter @code-to-escape/admin-dashboard dev  (port 5174)
 *
 * Run with:
 *   pnpm --filter @code-to-escape/e2e test
 */

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // sequential — avoid DB race conditions
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
