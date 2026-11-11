import type { MonthlySummary } from '@contadim/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, registerUser, type TestUser } from './utils/auth.js';
import {
  insertGoal,
  insertGoalMovement,
  insertTransaction,
  walletAccount,
} from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestContext } from './utils/test-app.js';

describe('Resumo mensal', () => {
  let ctx: TestContext;
  let user: TestUser;
  const http = () => request(ctx.app.getHttpServer());

  const categoryId = async (userId: string, name: string) =>
    (await ctx.prisma.category.findFirstOrThrow({ where: { userId, name } })).id;

  const summary = async (month: string, who: TestUser = user) => {
    const response = await http()
      .get(`/api/v1/summary/monthly?month=${month}`)
      .set(bearer(who))
      .expect(200);
    return response.body as MonthlySummary;
  };

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    user = await registerUser(ctx.app);
    const userId = user.auth.user.id;
    const accountId = (await walletAccount(ctx.prisma, userId)).id;
    const salario = await categoryId(userId, 'Salário');
    const moradia = await categoryId(userId, 'Moradia');
    const alimentacao = await categoryId(userId, 'Alimentação');
    const base = { userId, accountId };

    await insertTransaction(ctx.prisma, {
      ...base,
      type: 'INCOME',
      categoryId: salario,
      amount: 500000,
      date: '2026-11-05',
    });
    await insertTransaction(ctx.prisma, {
      ...base,
      type: 'EXPENSE',
      categoryId: moradia,
      amount: 150000,
      date: '2026-11-01',
    });
    await insertTransaction(ctx.prisma, {
      ...base,
      type: 'EXPENSE',
      categoryId: alimentacao,
      amount: 30000,
      date: '2026-11-15',
    });
    await insertTransaction(ctx.prisma, {
      ...base,
      type: 'EXPENSE',
      categoryId: alimentacao,
      amount: 20000,
      date: '2026-11-30',
    });
    // Fora do mês: não entram no resumo de novembro.
    await insertTransaction(ctx.prisma, {
      ...base,
      type: 'EXPENSE',
      categoryId: moradia,
      amount: 99999,
      date: '2026-10-31',
    });
    await insertTransaction(ctx.prisma, {
      ...base,
      type: 'INCOME',
      categoryId: salario,
      amount: 99999,
      date: '2026-12-01',
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('calcula totais, saldo e gastos por categoria do mês', async () => {
    const result = await summary('2026-11');
    expect(result).toMatchObject({
      month: '2026-11',
      totalIncome: 500000,
      totalExpense: 200000,
      balance: 300000,
    });
    expect(
      result.expensesByCategory.map(({ category, total, percent }) => [
        category.name,
        total,
        percent,
      ]),
    ).toEqual([
      ['Moradia', 150000, 75],
      ['Alimentação', 50000, 25],
    ]);
    expect(result.expensesByCategory[0]?.category).toMatchObject({
      color: expect.stringMatching(/^#/) as unknown,
      icon: 'house',
    });
    expect(result.incomesByCategory).toHaveLength(1);
  });

  it('permite navegar entre meses', async () => {
    const october = await summary('2026-10');
    expect(october).toMatchObject({ totalIncome: 0, totalExpense: 99999, balance: -99999 });

    const empty = await summary('2025-01');
    expect(empty).toEqual({
      month: '2025-01',
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      expensesByCategory: [],
      incomesByCategory: [],
      savedInMonth: 0,
    });
  });

  it('considera apenas os lançamentos da própria pessoa', async () => {
    const other = await registerUser(ctx.app);
    expect((await summary('2026-11', other)).totalExpense).toBe(0);
  });

  it('mostra quanto foi guardado em metas sem mexer em receitas e despesas', async () => {
    const userId = user.auth.user.id;
    const accountId = (await walletAccount(ctx.prisma, userId)).id;
    const goal = await insertGoal(ctx.prisma, { userId });
    const movement = (type: 'DEPOSIT' | 'WITHDRAWAL', amount: number, date: string) =>
      insertGoalMovement(ctx.prisma, { userId, goalId: goal.id, accountId, type, amount, date });
    await movement('DEPOSIT', 30000, '2026-11-02');
    await movement('WITHDRAWAL', 5000, '2026-11-20');
    await movement('DEPOSIT', 99999, '2026-12-01'); // outro mês

    const november = await summary('2026-11');
    expect(november).toMatchObject({
      savedInMonth: 25000,
      totalIncome: 500000,
      totalExpense: 200000,
      balance: 300000,
    });
    expect((await summary('2025-01')).savedInMonth).toBe(0);
  });

  it('valida o mês', async () => {
    await http().get('/api/v1/summary/monthly').set(bearer(user)).expect(400);
    await http().get('/api/v1/summary/monthly?month=2026-13').set(bearer(user)).expect(400);
  });
});
