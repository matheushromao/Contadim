import type { ScheduledInstallment } from '@contadim/core';
import { Injectable } from '@nestjs/common';

import type { Transaction } from '../../generated/prisma/client.js';
import { toDbDate } from '../../infra/prisma/calendar-date.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface NewPurchase {
  userId: string;
  cardId: string;
  groupId: string;
  categoryId: string;
  description: string | null;
  date: string;
  schedule: ScheduledInstallment[];
}

@Injectable()
export class CardPurchasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Cria todas as parcelas de uma vez (tudo ou nada). */
  create(purchase: NewPurchase): Promise<Transaction[]> {
    const total = purchase.schedule.length;
    return this.prisma.transaction.createManyAndReturn({
      data: purchase.schedule.map((installment) => ({
        userId: purchase.userId,
        cardId: purchase.cardId,
        categoryId: purchase.categoryId,
        description: purchase.description,
        type: 'EXPENSE' as const,
        amount: installment.amount,
        date: toDbDate(purchase.date),
        invoiceMonth: toDbDate(`${installment.invoiceMonth}-01`),
        installmentGroupId: purchase.groupId,
        installmentNumber: installment.number,
        installmentTotal: total,
      })),
    });
  }

  /** Parcelas de uma compra, em ordem. Vazio se não existir ou não for da pessoa/cartão. */
  findGroup(userId: string, cardId: string, groupId: string): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { userId, cardId, installmentGroupId: groupId },
      orderBy: { installmentNumber: 'asc' },
    });
  }

  async updateGroup(
    groupId: string,
    data: { categoryId?: string; description?: string | null },
  ): Promise<void> {
    await this.prisma.transaction.updateMany({ where: { installmentGroupId: groupId }, data });
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.prisma.transaction.deleteMany({ where: { installmentGroupId: groupId } });
  }
}
