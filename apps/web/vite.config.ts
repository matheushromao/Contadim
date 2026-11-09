import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Usa o mesmo `.env` da raiz do monorepo (apenas variáveis VITE_* chegam ao navegador).
  envDir: '../..',
  server: {
    port: 5173,
    // Em desenvolvimento, o front e a API ficam na mesma origem: o cookie de refresh
    // funciona sem configurar CORS nem SameSite=None.
    proxy: {
      '/api': { target: process.env.VITE_DEV_API_PROXY ?? 'http://localhost:3000' },
    },
  },
  build: {
    // React + Router + Zod somam ~210 kB gzip; rotas serão carregadas sob demanda.
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
