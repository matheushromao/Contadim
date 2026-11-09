import { describe, expect, it } from 'vitest';

import { InvalidMoneyError } from '../money/money';
import {
  buildMonthlySummary,
  computeAccountBalance,
  distributePercentages,
} from './monthly-summary';

describe('distributePercentages', () => {
  it('soma exatamente 100 mesmo com dízimas', () => {
    const result = distributePercentages([1, 1, 1]);
    expect(result).toEqual([33.4, 33.3, 33.3]);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it('distribui proporcionalmente', () => {
    expect(distributePercentages([7500, 2500])).toEqual([75, 25]);
  });

  it('retorna zeros quando o total é zero', () => {
    expect(distributePercentages([0, 0])).toEqual([0, 0]);
    expect(distributePercentages([])).toEqual([]);
  });
});

describe('buildMonthlySummary', () => {
  it('calcula totais, saldo e gastos por categoria', () => {
    const summary = buildMonthlySummary([
      { type: 'INCOME', categoryId: 'salario', total: 500000 },
      { type: 'EXPENSE', categoryId: 'moradia', total: 150000 },
      { type: 'EXPENSE', categoryId: 'alimentacao', total: 50000 },
      { type: 'EXPENSE', categoryId: 'lazer', total: 0 },
    ]);

    expect(summary.totalIncome).toBe(500000);
    expect(summary.totalExpense).toBe(200000);
    expect(summary.balance).toBe(300000);
    expect(summary.expensesByCategory).toEqual([
      { categoryId: 'moradia', total: 150000, percent: 75 },
      { categoryId: 'alimentacao', total: 50000, percent: 25 },
    ]);
    expect(summary.incomesByCategory).toEqual([
      { categoryId: 'salario', total: 500000, percent: 100 },
    ]);
  });

  it('agrupa linhas repetidas da mesma categoria', () => {
    const summary = buildMonthlySummary([
      { type: 'EXPENSE', categoryId: 'a', total: 100 },
      { type: 'EXPENSE', categoryId: 'a', total: 200 },
    ]);
    expect(summary.expensesByCategory).toEqual([{ categoryId: 'a', total: 300, percent: 100 }]);
  });

  it('permite saldo negativo', () => {
    const summary = buildMonthlySummary([{ type: 'EXPENSE', categoryId: 'a', total: 1000 }]);
    expect(summary.balance).toBe(-1000);
  });

  it('retorna resumo vazio quando não há lançamentos', () => {
    expect(buildMonthlySummary([])).toEqual({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      expensesByCategory: [],
      incomesByCategory: [],
    });
  });

  it('rejeita totais inválidos', () => {
    expect(() => buildMonthlySummary([{ type: 'EXPENSE', categoryId: 'a', total: 1.5 }])).toThrow(
      InvalidMoneyError,
    );
    expect(() => buildMonthlySummary([{ type: 'EXPENSE', categoryId: 'a', total: -1 }])).toThrow(
      RangeError,
    );
  });
});

describe('computeAccountBalance', () => {
  it('soma saldo inicial e receitas e subtrai despesas', () => {
    expect(
      computeAccountBalance({ initialBalance: 10000, totalIncome: 5000, totalExpense: 20000 }),
    ).toBe(-5000);
  });
});
