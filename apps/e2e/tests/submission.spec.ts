/**
 * Real submission journey E2E tests.
 *
 * Unlike the other specs, these require the full judging path: the server
 * enqueues the submission, the worker drains the queue, and the code-runner
 * executes it. They fail if any of those processes is missing, which is the
 * point — the synopsis-critical "submit and get judged" journey had no browser
 * coverage before.
 */

import { test, expect } from '@playwright/test';
import { testEmail, testUsername, registerAndLogin, setEditorCode } from './helpers';

const SUM_CHALLENGE = '/challenges/python-sum-two-numbers';
const SINGLE_LINE_SUM = 'print(sum(map(int,input().split())))';

test.describe('Submission judging', () => {
  test('a correct Python solution is judged ACCEPTED', async ({ page }) => {
    await registerAndLogin(page, testEmail(), testUsername());
    await page.goto(SUM_CHALLENGE);

    await expect(page.getByRole('heading', { name: /sum of two numbers/i })).toBeVisible({
      timeout: 20_000,
    });

    await setEditorCode(page, SINGLE_LINE_SUM);
    await page.getByRole('button', { name: /^submit$/i }).click();

    // The status is only rendered once the worker has judged the submission.
    await expect(page.getByText('ACCEPTED').first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('PASSED').first()).toBeVisible({ timeout: 20_000 });
  });

  test('a wrong Python solution is judged WRONG_ANSWER', async ({ page }) => {
    await registerAndLogin(page, testEmail(), testUsername());
    await page.goto(SUM_CHALLENGE);

    await expect(page.getByRole('heading', { name: /sum of two numbers/i })).toBeVisible({
      timeout: 20_000,
    });

    await setEditorCode(page, 'print(0)');
    await page.getByRole('button', { name: /^submit$/i }).click();

    await expect(page.getByText('WRONG_ANSWER').first()).toBeVisible({ timeout: 45_000 });
  });
});
