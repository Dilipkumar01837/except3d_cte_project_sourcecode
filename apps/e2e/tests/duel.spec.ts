/**
 * Duel journey E2E test.
 *
 * Two browser contexts: one player opens a match on a known challenge, a second
 * joins it, both submit an accepted solution, and the duel resolves to a winner.
 * This is the only browser coverage of the duel lifecycle and it needs the full
 * judging path (server + worker + code-runner).
 */

import { test, expect, type Page } from '@playwright/test';
import { testEmail, testUsername, registerAndLogin, setEditorCode } from './helpers';

const DUEL_CHALLENGE_TITLE = 'Python: Sum of Two Numbers';
const SINGLE_LINE_SUM = 'print(sum(map(int,input().split())))';

async function submitDuelSolution(page: Page): Promise<void> {
  await setEditorCode(page, SINGLE_LINE_SUM);
  await page.getByRole('button', { name: /submit solution/i }).click();
  // The arena renders the submission's initial status once and does not poll
  // it; the winner arrives over the socket when the worker resolves the duel.
  await expect(page.getByText(/submission status:/i)).toBeVisible({ timeout: 20_000 });
}

test.describe('Duel lifecycle', () => {
  test('a duel is created, joined, and resolved by a judged submission', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      const usernameA = testUsername();
      await registerAndLogin(pageA, testEmail(), usernameA);
      await registerAndLogin(pageB, testEmail(), testUsername());

      // Player A opens a match on a challenge with a known solution.
      await pageA.goto('/duels');
      await expect(pageA.getByRole('heading', { name: /create a duel/i })).toBeVisible({
        timeout: 20_000,
      });
      const challengeSelect = pageA.getByLabel('Duel challenge');
      await expect(
        challengeSelect.locator('option', { hasText: DUEL_CHALLENGE_TITLE }),
      ).toHaveCount(1, { timeout: 20_000 });
      await challengeSelect.selectOption({ label: DUEL_CHALLENGE_TITLE });
      await pageA.getByRole('button', { name: /open match/i }).click();
      await pageA.waitForURL(/\/duels\/[0-9a-f-]+/, { timeout: 20_000 });

      // Player B joins the match A opened.
      await pageB.goto('/duels');
      const hostedRow = pageB
        .locator('div.rounded-2xl')
        .filter({ hasText: `Hosted by @${usernameA}` })
        .first();
      await expect(hostedRow).toBeVisible({ timeout: 20_000 });
      await hostedRow.getByRole('button', { name: /join duel/i }).click();
      await pageB.waitForURL(/\/duels\/[0-9a-f-]+/, { timeout: 20_000 });

      // Both arenas become active.
      await expect(pageA.getByText('ACTIVE')).toBeVisible({ timeout: 20_000 });
      await expect(pageB.getByText('ACTIVE')).toBeVisible({ timeout: 20_000 });

      // Player A's editor was created while the duel was still OPEN, so it
      // mounts read-only; reloading remounts it editable now that B has joined.
      await pageA.reload();
      await expect(pageA.getByText('ACTIVE')).toBeVisible({ timeout: 20_000 });
      await expect(pageA.getByRole('heading', { name: DUEL_CHALLENGE_TITLE })).toBeVisible({
        timeout: 20_000,
      });

      // Both players finish; the duel only resolves once both have an accepted
      // submission.
      await submitDuelSolution(pageA);
      await submitDuelSolution(pageB);

      await expect(pageA.getByText(/winner:/i)).toBeVisible({ timeout: 45_000 });
      await expect(pageB.getByText(/winner:/i)).toBeVisible({ timeout: 45_000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
