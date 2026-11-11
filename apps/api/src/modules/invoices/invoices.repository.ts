import type { YearMonth } from '@contadim/core';
import { Injectable } from '@nestjs/common';

import type { InvoicePayment, Transaction } from '../../generated/prisma/client.js';
import { toDbDate } from '../../infra/prisma/calendar-date.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

const monthDate = (month: YearMonth) => toDbDate(`${month}-01`);

export interface NewInvoicePayment {
  userId: string;
  cardId: string;
  invoiceMonth: YearMonth;
  accountId: string;
  amount: number;
  date: string;
}

/** Acesso a dados de faturas. Toda consulta é filtrada pelo `userId`. */
@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Parcelas cobradas na fatura, das compras mais recentes para as mais antigas. */
  charges(userId: string, cardId: string, month: YearMonth): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: { userId, cardId, invoiceMonth: monthDate(month) },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  payments(userId: string, cardId: string, month: YearMonth): Promise<InvoicePayment[]> {
    return this.prisma.invoicePayment.findMany({
      where: { userId, cardId, invoiceMonth: monthDate(month) },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createPayment(data: NewInvoicePayment): Promise<InvoicePayment> {
    return this.prisma.invoicePayment.create({
      data: { ...data, invoiceMonth: monthDate(data.invoiceMonth), date: toDbDate(data.date) },
    });
  }

  findPayment(
    userId: string,
    cardId: string,
    month: YearMonth,
    id: string,
  ): Promise<InvoicePayment | null> {
    return this.prisma.invoicePayment.findFirst({
      where: { id, userId, cardId, invoiceMonth: monthDate(month) },
    });
  }

  async deletePayment(id: string): Promise<void> {
    await this.prisma.invoicePayment.delete({ where: { id } });
  }
}
