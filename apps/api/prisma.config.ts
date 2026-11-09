import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { defineConfig } from 'prisma/config';

// Carrega o `.env` da raiz do monorepo em desenvolvimento. Autocontido de propósito:
// a imagem Docker leva este arquivo, mas não o código-fonte de `src/`.
const rootEnv = new URL('../../.env', import.meta.url);
if (existsSync(rootEnv)) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync(rootEnv, 'utf8')))) {
    process.env[key] ??= value;
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `prisma generate` não precisa de banco; os demais comandos exigem DATABASE_URL.
    url: process.env.DATABASE_URL ?? 'postgresql://unset:unset@localhost:5432/unset',
  },
});
