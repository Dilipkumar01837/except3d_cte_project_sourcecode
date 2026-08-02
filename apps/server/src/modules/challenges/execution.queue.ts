import { redis } from '../../shared/lib/redis.js';

export const EXECUTION_QUEUE_KEY = 'cte:execution:queue';

/** The queue stores only submission IDs; source and test cases stay in PostgreSQL. */
export async function enqueueSubmission(submissionId: string): Promise<void> {
  await redis.lpush(EXECUTION_QUEUE_KEY, submissionId);
}

export async function dequeueSubmission(timeoutSeconds = 5): Promise<string | null> {
  const item = await redis.brpop(EXECUTION_QUEUE_KEY, timeoutSeconds);
  return item?.[1] ?? null;
}
