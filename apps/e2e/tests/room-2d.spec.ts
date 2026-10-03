/**
 * Interactive 2D escape-room E2E tests.
 *
 * Proves the browser-level journey that the unit tests cannot: a world room
 * renders as a walkable 2D scene, its clue is readable, and the on-canvas
 * terminal hands off to the existing challenge player without the
 * "Challenge could not be loaded." regression on a first visit.
 */

import { expect, test } from '@playwright/test';
import { registerAndLogin, testEmail, testUsername } from './helpers';

async function enterFirstRoom(page: import('@playwright/test').Page): Promise<string> {
  await registerAndLogin(page, testEmail(), testUsername());
  await page.goto('/worlds');
  await page
    .getByRole('link', { name: /view levels/i })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: /level progression/i })).toBeVisible({
    timeout: 20_000,
  });
  await page
    .getByRole('link', { name: /enter room/i })
    .first()
    .click();
  await page.waitForURL(/\/worlds\/[^/]+\/rooms\/1/, { timeout: 20_000 });
  const match = /\/worlds\/([^/]+)\/rooms\//.exec(page.url());
  return match?.[1] ?? '';
}

test.describe('Interactive 2D escape room', () => {
  test('renders a room, reads the clue, and opens the challenge without a load error', async ({
    page,
  }) => {
    await enterFirstRoom(page);

    await expect(page.getByRole('img', { name: 'Your explorer' })).toBeVisible();
    await expect(page.getByRole('img', { name: /room minimap/i })).toBeVisible();
    await expect(page.getByText(/room 1 · first clearing/i)).toBeVisible();

    // Movement must not crash the scene.
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('img', { name: 'Your explorer' })).toBeVisible();

    // Read the clue: a modal with the room's hint appears.
    await page.getByRole('button', { name: /mossy stone/i }).click();
    const clueDialog = page.getByRole('dialog', { name: 'Clue' });
    await expect(clueDialog).toBeVisible();
    await clueDialog.getByRole('button', { name: /got it/i }).click();

    // The terminal starts the real challenge player.
    await page.getByRole('button', { name: /puzzle terminal/i }).click();
    await page.getByRole('button', { name: /start challenge/i }).click();
    await page.waitForURL(/\/challenges\/python-sum-two-numbers/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /sum of two numbers/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Challenge could not be loaded.')).toHaveCount(0);
  });

  test('shows a sealed terminal in a locked room instead of the editor', async ({ page }) => {
    const worldId = await enterFirstRoom(page);

    await page.goto(`/worlds/${worldId}/rooms/3`);
    await expect(page.getByRole('img', { name: 'Your explorer' })).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /puzzle terminal/i }).click();
    await expect(page.getByText(/room sealed|you need the trail key/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /start challenge/i })).toHaveCount(0);
  });
});
