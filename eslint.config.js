import baseConfig from '@code-to-escape/config/eslint/base.js';
import reactConfig from '@code-to-escape/config/eslint/react.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '**/dist/**',
      '**/dist-node/**',
      '**/*.config.js',
      '**/*.config.ts',
      'packages/config/eslint/**',
    ],
  },
  ...baseConfig,
  // React-specific rules for the game client (react-hooks, react-refresh)
  ...reactConfig
    .filter((c) => c.plugins || c.rules)
    .map((c) => ({ ...c, files: ['apps/game-client/src/**/*.{ts,tsx}'] })),
];
