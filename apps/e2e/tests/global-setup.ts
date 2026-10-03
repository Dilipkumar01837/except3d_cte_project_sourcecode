/**
 * Playwright global setup: fail fast when the stack is not running.
 *
 * Without this, every test spent its own timeout probing a dead port, which
 * looked like a flaky suite instead of a missing prerequisite. This probes the
 * API and game client once and aborts with an actionable message.
 *
 * The admin dashboard is intentionally not probed: it is optional for the
 * committed suite (admin UI tests self-skip without credentials).
 */

import { request } from '@playwright/test';
import { API_URL, GAME_CLIENT_URL } from './helpers';

export default async function globalSetup(): Promise<void> {
  const context = await request.newContext();
  const problems: string[] = [];

  const probe = async (name: string, url: string): Promise<void> => {
    try {
      const response = await context.get(url, { timeout: 5_000 });
      if (!response.ok()) problems.push(`${name} at ${url} responded ${String(response.status())}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      problems.push(`${name} at ${url} is unreachable (${detail})`);
    }
  };

  await probe('API', `${API_URL}/health`);
  await probe('Game client', GAME_CLIENT_URL);

  await context.dispose();

  if (problems.length > 0) {
    throw new Error(
      `E2E preflight failed:\n- ${problems.join('\n- ')}\n` +
        'Start Postgres, Redis, the code runner, the server, the worker, and the game client ' +
        'before running the suite (see apps/e2e/playwright.config.ts).',
    );
  }
}
