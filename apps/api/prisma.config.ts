import { defineConfig } from 'prisma/config';

import { loadRootEnv } from './src/config/load-env.js';

loadRootEnv();

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
