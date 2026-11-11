import { monthRange, type YearMonth } from '@contadim/core';

import type { Prisma } from '../../generated/prisma/client.js';
import { toDbDate } from './calendar-date.js';

/**
 * "Mês efetivo" de um lançamento:
 * - lançamento de conta → o mês da data do lançamento;
 * - compra no cartão → o mês da fatura em que a parcela é cobrada.
 *
 * É assim que uma compra parcelada aparece uma parcela por mês no resumo e na lista.
 */
export function effectiveMonthWhere(month: YearMonth): Prisma.TransactionWhereInput {
  const { from, to } = monthRange(month);
  return {
    OR: [
      { accountId: { not: null }, date: { gte: toDbDate(from), lte: toDbDate(to) } },
      { cardId: { not: null }, invoiceMonth: toDbDate(from) },
    ],
  };
}
