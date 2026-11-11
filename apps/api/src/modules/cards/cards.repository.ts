import type { CreateCreditCardInput, UpdateCreditCardInput } from '@contadim/contracts';
import type { YearMonth } from '@contadim/core';
import { Injectable } from '@nestjs/common';

import type { CreditCard } from '../../generated/prisma/client.js';
import { fromDbDate } from '../../infra/prisma/calendar-date.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

/** Total cobrado e total pago de uma fatura. */
export interface InvoiceTotals {
  total: number;
  paid: number;
}

/** cardId → (mês da fatura → totais). */
export type InvoiceTotalsByCard = Map<string, Map<YearMonth, InvoiceTotals>>;

const toMonth = (date: Date): YearMonth => fromDbDate(date).slice(0, 7);

/** Acesso a dados de cartões. Toda consulta é filtrada pelo `userId`. */
@Injectable()
export class CardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page: { skip: number; take: number }) {
    const where = { userId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.creditCard.findMany({ where, orderBy: { createdAt: 'asc' }, ...page }),
      this.prisma.creditCard.count({ where }),
    ]);
    return { items, total };
  }

  findById(userId: string, id: string): Promise<CreditCard | null> {
    return this.prisma.creditCard.findFirst({ where: { id, userId } });
  }

  create(userId: string, data: CreateCreditCardInput): Promise<CreditCard> {
    return this.prisma.creditCard.create({ data: { ...data, userId } });
  }

  update(id: string, data: UpdateCreditCardInput): Promise<CreditCard> {
    return this.prisma.creditCard.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.creditCard.delete({ where: { id } });
  }

  async hasPurchases(id: string): Promise<boolean> {
    return (await this.prisma.transaction.count({ where: { cardId: id }, take: 1 })) > 0;
  }

  /** Totais cobrados e pagos por fatura de cada cartão, agregados no banco. */
  async invoiceTotals(userId: string, cardIds: string[]): Promise<InvoiceTotalsByCard> {
    const result: InvoiceTotalsByCard = new Map(
      cardIds.map((id) => [id, new Map<YearMonth, InvoiceTotals>()]),
    );
    if (cardIds.length === 0) return result;

    const [charges, payments] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['cardId', 'invoiceMonth'],
        where: { userId, cardId: { in: cardIds } },
        _sum: { amount: true },
      }),
      this.prisma.invoicePayment.groupBy({
        by: ['cardId', 'invoiceMonth'],
        where: { userId, cardId: { in: cardIds } },
        _sum: { amount: true },
      }),
    ]);

    const entry = (cardId: string, month: YearMonth): InvoiceTotals => {
      const months = result.get(cardId)!;
      const existing = months.get(month);
      if (existing) return existing;
      const created = { total: 0, paid: 0 };
      months.set(month, created);
      return created;
    };

    for (const row of charges) {
      if (!row.cardId || !row.invoiceMonth) continue;
      entry(row.cardId, toMonth(row.invoiceMonth)).total += row._sum.amount ?? 0;
    }
    for (const row of payments) {
      entry(row.cardId, toMonth(row.invoiceMonth)).paid += row._sum.amount ?? 0;
    }
    return result;
  }
}
