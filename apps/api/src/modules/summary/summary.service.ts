import type { MonthlySummary, SummaryCategoryItem } from '@contadim/contracts';
import { buildMonthlySummary, type CategoryBreakdownItem, type YearMonth } from '@contadim/core';
import { Injectable } from '@nestjs/common';

import { type CategoryInfo, SummaryRepository } from './summary.repository.js';

@Injectable()
export class SummaryService {
  constructor(private readonly summary: SummaryRepository) {}

  /** Resumo do mês: o banco agrega, o core calcula e aqui só juntamos os dados das categorias. */
  async monthly(userId: string, month: YearMonth): Promise<MonthlySummary> {
    const rows = await this.summary.totalsByCategory(userId, month);
    const result = buildMonthlySummary(rows);

    const categories = await this.summary.findCategories(userId, [
      ...new Set(rows.map((row) => row.categoryId)),
    ]);
    const byId = new Map(categories.map((category) => [category.id, category]));
    const withCategory = (items: CategoryBreakdownItem[]): SummaryCategoryItem[] =>
      items.flatMap((item) => {
        const category: CategoryInfo | undefined = byId.get(item.categoryId);
        return category ? [{ category, total: item.total, percent: item.percent }] : [];
      });

    return {
      month,
      totalIncome: result.totalIncome,
      totalExpense: result.totalExpense,
      balance: result.balance,
      expensesByCategory: withCategory(result.expensesByCategory),
      incomesByCategory: withCategory(result.incomesByCategory),
    };
  }
}
