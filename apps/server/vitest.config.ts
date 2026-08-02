import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
    include: ['src/tests/**/*.test.ts'],
    // Tests run sequentially to avoid DB race conditions
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    // 30s timeout per test (some DB ops + auth may take time)
    testTimeout: 30_000,
  },
});
