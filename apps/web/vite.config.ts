import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Usa o mesmo `.env` da raiz do monorepo (apenas variáveis VITE_* chegam ao navegador).
const ENV_DIR = '../..';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ENV_DIR, 'VITE_');

  return {
    plugins: [react(), tailwindcss()],
    envDir: ENV_DIR,
    server: {
      port: 5173,
      // Em desenvolvimento, o front e a API ficam na mesma origem: o cookie de refresh
      // funciona sem configurar CORS nem SameSite=None.
      proxy: {
        '/api': { target: env.VITE_DEV_API_PROXY ?? 'http://localhost:3000' },
      },
    },
    build: {
      // React + Router + Zod somam ~210 kB gzip no chunk principal; as telas são lazy.
      chunkSizeWarningLimit: 800,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
