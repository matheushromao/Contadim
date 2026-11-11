import type { CreateAccountInput, UpdateAccountInput } from '@contadim/contracts';
import { Injectable } from '@nestjs/common';

import type { Account } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface AccountTotals {
  totalIncome: number;
  totalExpense: number;
  /** Pagamentos de fatura que saíram desta conta (reduzem o saldo, mas não são despesa). */
  totalInvoicePayments: number;
  /** Dinheiro guardado em metas a partir desta conta (reduz o saldo, mas não é despesa). */
  totalGoalDeposits: number;
  /** Dinheiro resgatado de metas para esta conta (aumenta o saldo, mas não é receita). */
  totalGoalWithdrawals: number;
}

export const EMPTY_ACCOUNT_TOTALS: AccountTotals = {
  totalIncome: 0,
  totalExpense: 0,
  totalInvoicePayments: 0,
  totalGoalDeposits: 0,
  totalGoalWithdrawals: 0,
};

/** Acesso a dados de contas. Toda consulta é filtrada pelo `userId`. */
@Injectable()
export class AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page: { skip: number; take: number }) {
    const where = { userId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.account.findMany({ where, orderBy: { createdAt: 'asc' }, ...page }),
      this.prisma.account.count({ where }),
    ]);
    return { items, total };
  }

  findById(userId: string, id: string): Promise<Account | null> {
    return this.prisma.account.findFirst({ where: { id, userId } });
  }

  create(userId: string, data: CreateAccountInput): Promise<Account> {
    return this.prisma.account.create({ data: { ...data, userId } });
  }

  update(id: string, data: UpdateAccountInput): Promise<Account> {
    return this.prisma.account.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.account.delete({ where: { id } });
  }

  /** Conta usada em lançamentos, pagamentos de fatura ou movimentações de metas. */
  async isInUse(id: string): Promise<boolean> {
    const counts = await Promise.all([
      this.prisma.transaction.count({ where: { accountId: id }, take: 1 }),
      this.prisma.invoicePayment.count({ where: { accountId: id }, take: 1 }),
      this.prisma.goalMovement.count({ where: { accountId: id }, take: 1 }),
    ]);
    return counts.some((count) => count > 0);
  }

  /** Soma receitas e despesas de cada conta, agregando no banco. */
  async totalsByAccount(userId: string, accountIds: string[]): Promise<Map<string, AccountTotals>> {
    const totals = new Map<string, AccountTotals>(
      accountIds.map((id) => [id, { ...EMPTY_ACCOUNT_TOTALS }]),
    );
    if (accountIds.length === 0) return totals;

    const [rows, payments, goalMovements] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['accountId', 'type'],
        where: { userId, accountId: { in: accountIds } },
        _sum: { amount: true },
      }),
      this.prisma.invoicePayment.groupBy({
        by: ['accountId'],
        where: { userId, accountId: { in: accountIds } },
        _sum: { amount: true },
      }),
      this.prisma.goalMovement.groupBy({
        by: ['accountId', 'type'],
        where: { userId, accountId: { in: accountIds } },
        _sum: { amount: true },
      }),
    ]);
    for (const row of rows) {
      const entry = row.accountId ? totals.get(row.accountId) : undefined;
      if (!entry) continue;
      const sum = row._sum.amount ?? 0;
      if (row.type === 'INCOME') entry.totalIncome += sum;
      else entry.totalExpense += sum;
    }
    for (const payment of payments) {
      const entry = totals.get(payment.accountId);
      if (entry) entry.totalInvoicePayments += payment._sum.amount ?? 0;
    }
    for (const movement of goalMovements) {
      const entry = totals.get(movement.accountId);
      if (!entry) continue;
      const sum = movement._sum.amount ?? 0;
      if (movement.type === 'DEPOSIT') entry.totalGoalDeposits += sum;
      else entry.totalGoalWithdrawals += sum;
    }
    return totals;
  }
}
