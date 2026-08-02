import baseConfig from '@code-to-escape/config/eslint/base.js';

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
];
