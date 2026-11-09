import type { CreateAccountInput, UpdateAccountInput } from '@contadim/contracts';
import { Injectable } from '@nestjs/common';

import type { Account } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface AccountTotals {
  totalIncome: number;
  totalExpense: number;
}

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

  async hasTransactions(id: string): Promise<boolean> {
    return (await this.prisma.transaction.count({ where: { accountId: id }, take: 1 })) > 0;
  }

  /** Soma receitas e despesas de cada conta, agregando no banco. */
  async totalsByAccount(userId: string, accountIds: string[]): Promise<Map<string, AccountTotals>> {
    const totals = new Map<string, AccountTotals>(
      accountIds.map((id) => [id, { totalIncome: 0, totalExpense: 0 }]),
    );
    if (accountIds.length === 0) return totals;

    const rows = await this.prisma.transaction.groupBy({
      by: ['accountId', 'type'],
      where: { userId, accountId: { in: accountIds } },
      _sum: { amount: true },
    });
    for (const row of rows) {
      const entry = row.accountId ? totals.get(row.accountId) : undefined;
      if (!entry) continue;
      const sum = row._sum.amount ?? 0;
      if (row.type === 'INCOME') entry.totalIncome += sum;
      else entry.totalExpense += sum;
    }
    return totals;
  }
}
