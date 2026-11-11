import { type CategoryTotalRow, monthRange, type YearMonth } from '@contadim/core';
import { Injectable } from '@nestjs/common';

import { toDbDate } from '../../infra/prisma/calendar-date.js';
import { effectiveMonthWhere } from '../../infra/prisma/effective-month.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface CategoryInfo {
  id: string;
  name: string;
  color: string;
  icon: string;
}

@Injectable()
export class SummaryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Totais por tipo e categoria no mês efetivo, agregados no banco: lançamentos de conta
   * pela data, compras no cartão pelo mês da fatura. Pagamentos de fatura não entram.
   */
  async totalsByCategory(userId: string, month: YearMonth): Promise<CategoryTotalRow[]> {
    const rows = await this.prisma.transaction.groupBy({
      by: ['type', 'categoryId'],
      where: { userId, ...effectiveMonthWhere(month) },
      _sum: { amount: true },
    });
    return rows.map((row) => ({
      type: row.type,
      categoryId: row.categoryId,
      total: row._sum.amount ?? 0,
    }));
  }

  findCategories(userId: string, ids: string[]): Promise<CategoryInfo[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.category.findMany({
      where: { userId, id: { in: ids } },
      select: { id: true, name: true, color: true, icon: true },
    });
  }

  /** Depósitos − resgates em metas no mês (pela data da movimentação). */
  async savedInMonth(userId: string, month: YearMonth): Promise<number> {
    const { from, to } = monthRange(month);
    const rows = await this.prisma.goalMovement.groupBy({
      by: ['type'],
      where: { userId, date: { gte: toDbDate(from), lte: toDbDate(to) } },
      _sum: { amount: true },
    });
    return rows.reduce(
      (total, row) => total + (row.type === 'DEPOSIT' ? 1 : -1) * (row._sum.amount ?? 0),
      0,
    );
  }
}
