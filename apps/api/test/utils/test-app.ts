import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module.js';
import { setupApp } from '../../src/app.setup.js';
import { CLOCK, FixedClock } from '../../src/common/clock/clock.js';
import { PrismaService } from '../../src/infra/prisma/prisma.service.js';

export interface TestContext {
  app: NestExpressApplication;
  prisma: PrismaService;
}

/**
 * Sobe a aplicação completa (mesma configuração de produção) para testes de integração.
 * `today` fixa a data de "hoje" (fatura atual, vencimentos) para testes determinísticos.
 */
export async function createTestApp(options: { today?: string } = {}): Promise<TestContext> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (options.today) {
    builder = builder.overrideProvider(CLOCK).useValue(new FixedClock(options.today));
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  setupApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Apaga todos os dados entre os testes, mantendo o schema. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const names = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`);
}
