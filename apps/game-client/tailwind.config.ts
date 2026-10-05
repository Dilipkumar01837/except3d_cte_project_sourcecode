import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          base: '#0A0A0B',
          surface: '#111113',
          elevated: '#18181B',
          border: '#26262A',
          strong: '#3A3A40',
        },
        brand: {
          50: '#fffbeb',
          500: '#F59E0B',
          900: '#78350F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
