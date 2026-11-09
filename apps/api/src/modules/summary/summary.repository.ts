import type { CategoryTotalRow, IsoDate } from '@contadim/core';
import { Injectable } from '@nestjs/common';

import { toDbDate } from '../../infra/prisma/calendar-date.js';
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

  /** Totais por tipo e categoria no período, agregados no banco (índice userId + categoryId + date). */
  async totalsByCategory(
    userId: string,
    range: { from: IsoDate; to: IsoDate },
  ): Promise<CategoryTotalRow[]> {
    const rows = await this.prisma.transaction.groupBy({
      by: ['type', 'categoryId'],
      where: { userId, date: { gte: toDbDate(range.from), lte: toDbDate(range.to) } },
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
}
