import type { EntryType, IsoDate } from '@contadim/core';
import { Injectable } from '@nestjs/common';

import type { Prisma, Transaction } from '../../generated/prisma/client.js';
import { toDbDate } from '../../infra/prisma/calendar-date.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface TransactionFilter {
  from?: IsoDate;
  to?: IsoDate;
  type?: EntryType;
  categoryId?: string;
  accountId?: string;
}

export interface TransactionData {
  amount: number;
  type: EntryType;
  date: IsoDate;
  categoryId: string;
  accountId: string;
  description: string | null;
}

/** Acesso a dados de lançamentos. Toda consulta é filtrada pelo `userId`. */
@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, filter: TransactionFilter, page: { skip: number; take: number }) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(filter.type && { type: filter.type }),
      ...(filter.categoryId && { categoryId: filter.categoryId }),
      ...(filter.accountId && { accountId: filter.accountId }),
      ...((filter.from || filter.to) && {
        date: {
          ...(filter.from && { gte: toDbDate(filter.from) }),
          ...(filter.to && { lte: toDbDate(filter.to) }),
        },
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        // Mais recentes primeiro; no mesmo dia, o último lançado aparece no topo.
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        ...page,
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { items, total };
  }

  findById(userId: string, id: string): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({ where: { id, userId } });
  }

  create(userId: string, data: TransactionData): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: { ...data, date: toDbDate(data.date), userId },
    });
  }

  update(id: string, data: TransactionData): Promise<Transaction> {
    return this.prisma.transaction.update({
      where: { id },
      data: { ...data, date: toDbDate(data.date) },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.transaction.delete({ where: { id } });
  }
}
