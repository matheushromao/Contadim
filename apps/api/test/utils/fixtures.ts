import { randomUUID } from 'node:crypto';

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

/** Cria um cartão direto no banco. */
export function insertCard(
  prisma: PrismaService,
  data: { userId: string; name?: string; limit?: number; closingDay?: number; dueDay?: number },
) {
  return prisma.creditCard.create({
    data: {
      name: 'Nubank',
      limit: 500000,
      closingDay: 3,
      dueDay: 10,
      color: '#8B5CF6',
      ...data,
    },
  });
}

/** Insere uma parcela de compra no cartão direto no banco (fatura `YYYY-MM`). */
export async function insertCardCharge(
  prisma: PrismaService,
  data: {
    userId: string;
    cardId: string;
    categoryId: string;
    amount: number;
    invoiceMonth: string;
    date?: string;
    installmentNumber?: number;
    installmentTotal?: number;
    installmentGroupId?: string;
  },
) {
  const {
    invoiceMonth,
    date = '2026-11-09',
    installmentNumber = 1,
    installmentTotal = 1,
    installmentGroupId = randomUUID(),
    ...rest
  } = data;
  return prisma.transaction.create({
    data: {
      ...rest,
      type: 'EXPENSE',
      date: new Date(`${date}T00:00:00Z`),
      invoiceMonth: new Date(`${invoiceMonth}-01T00:00:00Z`),
      installmentNumber,
      installmentTotal,
      installmentGroupId,
    },
  });
}

/** Registra um pagamento de fatura direto no banco. */
export function insertInvoicePayment(
  prisma: PrismaService,
  data: { userId: string; cardId: string; accountId: string; invoiceMonth: string; amount: number },
) {
  return prisma.invoicePayment.create({
    data: {
      ...data,
      invoiceMonth: new Date(`${data.invoiceMonth}-01T00:00:00Z`),
      date: new Date('2026-11-09T00:00:00Z'),
    },
  });
}
