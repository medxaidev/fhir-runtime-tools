import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: '/fhir-runtime-tools/',
  publicDir: 'public',
  resolve: {
    alias: {
      '@prismui/react': path.resolve(__dirname, 'node_modules/@prismui/react/dist/esm/index.mjs'),
      '@prismui/core': path.resolve(__dirname, 'node_modules/@prismui/core/dist/esm/index.mjs'),
    },
    conditions: ['browser', 'default'],
  },
  optimizeDeps: {
    include: ['@prismui/core', '@prismui/react', 'fhir-runtime'],
  },
  build: {
    rollupOptions: {
      external: ['node:fs', 'node:fs/promises', 'node:path', 'node:url'],
      output: {
        globals: {
          'node:fs': '{}',
          'node:fs/promises': '{}',
          'node:path': '{}',
          'node:url': '{}',
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});