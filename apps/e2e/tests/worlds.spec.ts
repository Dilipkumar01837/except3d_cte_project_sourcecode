/**
 * World unlock journey E2E test.
 *
 * Solves the first level of the seeded Python Forest world through the UI and
 * asserts the escape-room reward: the level's key is granted and the key-locked
 * level becomes reachable. Requires the full judging path (server + worker +
 * code-runner).
 */

import { test, expect } from '@playwright/test';
import { testEmail, testUsername, registerAndLogin, setEditorCode } from './helpers';

const SINGLE_LINE_SUM = 'print(sum(map(int,input().split())))';

test.describe('World unlock after a real solve', () => {
  test('solving the first level grants its key and opens the locked level', async ({ page }) => {
    await registerAndLogin(page, testEmail(), testUsername());

    await page.goto('/worlds');
    await expect(page.getByRole('heading', { name: /choose your next world/i })).toBeVisible({
      timeout: 20_000,
    });

    await page
      .getByRole('link', { name: /view levels/i })
      .first()
      .click();
    await expect(page.getByRole('heading', { name: /level progression/i })).toBeVisible({
      timeout: 20_000,
    });
    const worldUrl = page.url();

    // Before solving: the key is missing and the guarded level is locked.
    await expect(page.getByText(/trail key · missing/i)).toBeVisible();
    const lockedRidgeGate = page.getByRole('article').filter({ hasText: /ridge gate/i });
    // Match the exact status badge: the level description also contains
    // "padlocked", so a loose /locked/i would pass even while locked.
    await expect(lockedRidgeGate.getByText('Locked', { exact: true })).toBeVisible();
    await expect(lockedRidgeGate.getByRole('link', { name: /play level/i })).toHaveCount(0);

    // Open the first level and solve it.
    await page
      .getByRole('article')
      .filter({ hasText: /first clearing/i })
      .getByRole('link', { name: /play level/i })
      .click();
    await expect(page.getByRole('heading', { name: /sum of two numbers/i })).toBeVisible({
      timeout: 20_000,
    });
    await setEditorCode(page, SINGLE_LINE_SUM);
    await page.getByRole('button', { name: /^submit$/i }).click();
    await expect(page.getByText('ACCEPTED').first()).toBeVisible({ timeout: 45_000 });

    // Back on the world map the key is held and the guarded level is playable.
    await page.goto(worldUrl);
    await expect(page.getByRole('heading', { name: /level progression/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/trail key · held/i)).toBeVisible({ timeout: 20_000 });

    const openRidgeGate = page.getByRole('article').filter({ hasText: /ridge gate/i });
    await expect(openRidgeGate.getByText('Locked', { exact: true })).toHaveCount(0);
    await expect(openRidgeGate.getByText('Open', { exact: true })).toBeVisible();
    await expect(openRidgeGate.getByRole('link', { name: /play level/i })).toBeVisible();
  });
});
