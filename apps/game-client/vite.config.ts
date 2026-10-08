import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname is not available in ESM. Derive the config directory from
// import.meta.url the same way the admin-dashboard vite config does.
const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(configDir, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
  build: {
    sourcemap: true,
    target: 'es2022',
    // Monaco editor + its workers are intentionally large; suppress the warning.
    chunkSizeWarningLimit: 8_000,
    rollupOptions: {
      output: {
        // Split monaco into its own chunk to avoid bloating the main bundle
        manualChunks: (id) => {
          if (id.includes('monaco-editor')) return 'monaco-editor';
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});
