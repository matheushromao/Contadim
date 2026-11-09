import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

import { loadRootEnv } from './src/config/load-env.js';

loadRootEnv();

const testDatabaseUrl =
  process.env.DATABASE_URL_TEST ?? 'postgresql://contadim:contadim@localhost:5432/contadim_test';

export default defineConfig({
  // SWC emite os metadados de decorators que a injeção de dependências do Nest precisa.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    include: ['src/**/*.spec.ts', 'test/**/*.e2e-spec.ts'],
    globalSetup: ['test/global-setup.ts'],
    // Os testes de integração compartilham o mesmo banco: rodam um arquivo por vez.
    fileParallelism: false,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      LOG_LEVEL: 'silent',
      SWAGGER_ENABLED: 'false',
    },
  },
});
