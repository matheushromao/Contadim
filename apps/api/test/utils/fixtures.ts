import type { EntryType } from '@contadim/core';

import type { PrismaService } from '../../src/infra/prisma/prisma.service.js';

/** Primeira categoria padrão do tipo informado. */
export async function defaultCategory(prisma: PrismaService, userId: string, type: EntryType) {
  return prisma.category.findFirstOrThrow({
    where: { userId, type, isDefault: true },
    orderBy: { name: 'asc' },
  });
}

/** Conta "Carteira" criada no cadastro. */
export function walletAccount(prisma: PrismaService, userId: string) {
  return prisma.account.findFirstOrThrow({ where: { userId, type: 'WALLET' } });
}

/** Insere um lançamento direto no banco (para testes que não são do módulo de lançamentos). */
export async function insertTransaction(
  prisma: PrismaService,
  data: {
    userId: string;
    amount: number;
    type: EntryType;
    categoryId: string;
    accountId: string;
    date?: string;
    description?: string;
  },
) {
  const { date = '2026-11-09', ...rest } = data;
  return prisma.transaction.create({ data: { ...rest, date: new Date(`${date}T00:00:00Z`) } });
}
