import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Room logic is deliberately pure, so the frontend suite runs in a plain Node
// environment without jsdom or a browser. Visual behaviour is covered by the
// Playwright end-to-end room spec instead.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
