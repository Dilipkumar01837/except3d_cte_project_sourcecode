/**
 * Escape-room journey E2E tests.
 *
 * These exercise the room layer end to end through the browser: a locked room
 * is a sealed door (not a playable editor even when its URL is typed directly),
 * clearing a room shows the mission-complete / key-found reward, and clearing
 * every room in a world reaches ESCAPE COMPLETE. They need the full judging path
 * (server + worker + code-runner).
 */

import { test, expect } from '@playwright/test';
import { testEmail, testUsername, registerAndLogin, setEditorCode } from './helpers';

const SUM = '/challenges/python-sum-two-numbers';
const EVEN_ODD = '/challenges/python-even-or-odd';
const LARGEST = '/challenges/python-largest-of-three';

const SUM_SOLUTION = 'print(sum(map(int,input().split())))';
const EVEN_ODD_SOLUTION = 'print("Even" if int(input()) % 2 == 0 else "Odd")';
const LARGEST_SOLUTION = 'print(max(map(int,input().split())))';

async function solve(page: import('@playwright/test').Page, code: string): Promise<void> {
  await setEditorCode(page, code);
  await page.getByRole('button', { name: /^submit$/i }).click();
  await expect(page.getByText('ACCEPTED').first()).toBeVisible({ timeout: 45_000 });
}

test.describe('Escape-room journey', () => {
  test('a locked room is a sealed door, not an editor', async ({ page }) => {
    await registerAndLogin(page, testEmail(), testUsername());

    await page.goto(LARGEST);

    await expect(page.getByRole('heading', { name: /room sealed/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/you need the trail key/i)).toBeVisible();
    // The editor must not be reachable: the server marks the room LOCKED.
    await expect(page.locator('.monaco-editor')).toHaveCount(0);
  });

  test('clearing every room reaches ESCAPE COMPLETE', async ({ page }) => {
    await registerAndLogin(page, testEmail(), testUsername());

    await page.goto(SUM);
    await expect(page.getByRole('heading', { name: /sum of two numbers/i })).toBeVisible({
      timeout: 20_000,
    });
    await solve(page, SUM_SOLUTION);
    await expect(page.getByText('MISSION COMPLETE')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/key found: trail key/i)).toBeVisible();

    await page.goto(EVEN_ODD);
    await expect(page.getByRole('heading', { name: /even or odd/i })).toBeVisible({
      timeout: 20_000,
    });
    await solve(page, EVEN_ODD_SOLUTION);
    await expect(page.getByText('MISSION COMPLETE')).toBeVisible({ timeout: 20_000 });

    await page.goto(LARGEST);
    await expect(page.getByRole('heading', { name: /largest of three/i })).toBeVisible({
      timeout: 20_000,
    });
    await solve(page, LARGEST_SOLUTION);
    await expect(page.getByText(/ESCAPE COMPLETE/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
