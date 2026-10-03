/**
 * Engagement E2E tests.
 *
 * Covers the flows shipped alongside consent-gated telemetry:
 *   - Settings → Privacy telemetry consent round-trip
 *   - Worlds list + navigation into a world
 *   - Escape-room gating (key-locked level)
 *   - Duel lobby smoke
 *
 * None of these submit code, so they run without the sandbox code-runner.
 * The world/level tests depend on seeded content (`pnpm db:seed`).
 */

import { test, expect } from '@playwright/test';
import { testEmail, testUsername, registerAndLogin } from './helpers';

// ─── Telemetry consent ────────────────────────────────────────────

test.describe('Telemetry consent', () => {
  test('opt-in and opt-out persist across reload', async ({ page }) => {
    await registerAndLogin(page, testEmail(), testUsername());
    await page.goto('/settings');

    // Off by default (server default is opt-out).
    await expect(page.getByText(/currently off/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /turn on telemetry/i }).click();
    await expect(page.getByText(/currently on/i)).toBeVisible({ timeout: 15_000 });

    // Reload proves the consent was persisted server-side, not just in local state.
    await page.reload();
    await expect(page.getByText(/currently on/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /turn off telemetry/i }).click();
    await expect(page.getByText(/currently off/i)).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Worlds + escape-room gating ──────────────────────────────────

test.describe('Worlds and escape-room gating', () => {
  test('lists a world and opens its level map', async ({ page }) => {
    await registerAndLogin(page, testEmail(), testUsername());
    await page.goto('/worlds');

    await expect(page.getByRole('heading', { name: /choose your next world/i })).toBeVisible({
      timeout: 15_000,
    });

    const viewLevels = page.getByRole('link', { name: /view levels/i }).first();
    await expect(viewLevels).toBeVisible();
    await viewLevels.click();

    await expect(page.getByRole('heading', { name: /level progression/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('a key-locked level shows its requirement and cannot be played', async ({ page }) => {
    await registerAndLogin(page, testEmail(), testUsername());
    await page.goto('/worlds');
    await page
      .getByRole('link', { name: /view levels/i })
      .first()
      .click();

    await expect(page.getByRole('heading', { name: /level progression/i })).toBeVisible({
      timeout: 15_000,
    });

    // Seeded content: Python Forest locks level 3 ("Ridge Gate") behind the
    // Trail Key, which a fresh player has not earned yet.
    await expect(page.getByText(/trail key/i).first()).toBeVisible({ timeout: 15_000 });

    const lockedLevel = page.getByRole('article').filter({ hasText: /ridge gate/i });
    await expect(lockedLevel).toBeVisible();
    await expect(lockedLevel).toContainText(/locked/i);
    await expect(lockedLevel).toContainText(/trail key/i);
    await expect(lockedLevel.getByRole('link', { name: /play level/i })).toHaveCount(0);
  });
});

// ─── Duel lobby ───────────────────────────────────────────────────

test.describe('Duel lobby', () => {
  test('loads with create controls', async ({ page }) => {
    await registerAndLogin(page, testEmail(), testUsername());
    await page.goto('/duels');

    await expect(page.getByRole('heading', { name: /challenge another runner/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: /create a duel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /open match/i })).toBeVisible();
  });
});
