import type {
  CardPurchase,
  CreditCard,
  ErrorResponse,
  MonthlySummary,
  Paginated,
  Transaction,
} from '@contadim/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, registerUser, type TestUser } from './utils/auth.js';
import { defaultCategory, insertCard, insertTransaction, walletAccount } from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestContext } from './utils/test-app.js';

const TODAY = '2026-11-09';

describe('Compras no cartão', () => {
  let ctx: TestContext;
  let user: TestUser;
  let cardId: string;
  let expenseCategoryId: string;
  let incomeCategoryId: string;
  const http = () => request(ctx.app.getHttpServer());

  const purchase = async (body: Record<string, unknown>, who: TestUser = user) => {
    const response = await http()
      .post(`/api/v1/cards/${cardId}/purchases`)
      .set(bearer(who))
      .send({ categoryId: expenseCategoryId, ...body });
    return response;
  };

  beforeAll(async () => {
    ctx = await createTestApp({ today: TODAY });
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    user = await registerUser(ctx.app);
    const userId = user.auth.user.id;
    // Fecha dia 3, vence dia 10.
    cardId = (await insertCard(ctx.prisma, { userId, limit: 500000 })).id;
    expenseCategoryId = (await defaultCategory(ctx.prisma, userId, 'EXPENSE')).id;
    incomeCategoryId = (await defaultCategory(ctx.prisma, userId, 'INCOME')).id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('parcela 12x no dia do fechamento: começa na fatura seguinte e soma o total', async () => {
    const response = await purchase({
      amount: 120000,
      installments: 12,
      date: '2026-12-03',
      description: 'Geladeira',
    });
    expect(response.status).toBe(201);
    const body = response.body as CardPurchase;

    expect(body).toMatchObject({
      cardId,
      totalAmount: 120000,
      installmentTotal: 12,
      description: 'Geladeira',
      date: '2026-12-03',
    });
    expect(body.installments).toHaveLength(12);
    expect(body.installments.map((t) => t.invoiceMonth)).toEqual([
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
      '2027-06',
      '2027-07',
      '2027-08',
      '2027-09',
      '2027-10',
      '2027-11',
      '2027-12',
    ]);
    expect(body.installments.every((t) => t.amount === 10000 && t.accountId === null)).toBe(true);
    expect(body.installments.map((t) => t.installmentNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(new Set(body.installments.map((t) => t.installmentGroupId))).toEqual(
      new Set([body.groupId]),
    );
  });

  it('coloca os centavos que sobram na primeira parcela', async () => {
    const body = (await purchase({ amount: 1000, installments: 3, date: '2026-11-09' }))
      .body as CardPurchase;
    expect(body.installments.map((t) => t.amount)).toEqual([334, 333, 333]);
    expect(body.installments[0]?.invoiceMonth).toBe('2026-12');
  });

  it('à vista vira uma parcela 1/1', async () => {
    const body = (await purchase({ amount: 4590, date: '2026-11-09' })).body as CardPurchase;
    expect(body.installments).toMatchObject([
      { amount: 4590, installmentNumber: 1, installmentTotal: 1, invoiceMonth: '2026-12' },
    ]);
  });

  it('reduz o limite disponível com as parcelas futuras', async () => {
    await purchase({ amount: 120000, installments: 12, date: '2026-11-09' });
    const card = (await http().get(`/api/v1/cards/${cardId}`).set(bearer(user)).expect(200))
      .body as CreditCard;
    expect(card.availableLimit).toBe(500000 - 120000);
    expect(card.currentInvoice).toMatchObject({ month: '2026-12', total: 10000 });
  });

  it('exige categoria de despesa e valida a entrada', async () => {
    const income = await purchase({
      amount: 1000,
      date: '2026-11-09',
      categoryId: incomeCategoryId,
    });
    expect(income.status).toBe(422);
    expect((income.body as ErrorResponse).error.code).toBe('UNPROCESSABLE');

    expect((await purchase({ amount: 1000, installments: 25, date: '2026-11-09' })).status).toBe(
      400,
    );
    expect((await purchase({ amount: 2, installments: 3, date: '2026-11-09' })).status).toBe(400);
  });

  it('edita e exclui a compra inteira', async () => {
    const created = (await purchase({ amount: 30000, installments: 3, date: '2026-11-09' }))
      .body as CardPurchase;
    const otherCategory = await ctx.prisma.category.findFirstOrThrow({
      where: { userId: user.auth.user.id, type: 'EXPENSE', id: { not: expenseCategoryId } },
    });

    const updated = await http()
      .patch(`/api/v1/cards/${cardId}/purchases/${created.groupId}`)
      .set(bearer(user))
      .send({ categoryId: otherCategory.id, description: 'Notebook', amount: 1 })
      .expect(200);
    const body = updated.body as CardPurchase;
    expect(body).toMatchObject({ categoryId: otherCategory.id, description: 'Notebook' });
    expect(body.totalAmount).toBe(30000);
    expect(body.installments.every((t) => t.description === 'Notebook')).toBe(true);

    await http()
      .delete(`/api/v1/cards/${cardId}/purchases/${created.groupId}`)
      .set(bearer(user))
      .expect(204);
    expect(await ctx.prisma.transaction.count({ where: { cardId } })).toBe(0);
  });

  it('não deixa editar ou excluir parcelas pela rota de lançamentos', async () => {
    const created = (await purchase({ amount: 30000, installments: 3, date: '2026-11-09' }))
      .body as CardPurchase;
    const installmentId = created.installments[1]!.id;

    const patch = await http()
      .patch(`/api/v1/transactions/${installmentId}`)
      .set(bearer(user))
      .send({ amount: 1 })
      .expect(422);
    expect((patch.body as ErrorResponse).error.message).toMatch(/fatura do cartão/);
    await http().delete(`/api/v1/transactions/${installmentId}`).set(bearer(user)).expect(422);
  });

  describe('mês efetivo', () => {
    beforeEach(async () => {
      const userId = user.auth.user.id;
      const accountId = (await walletAccount(ctx.prisma, userId)).id;
      // Compra de R$ 300 em 3x feita em 15/11: faturas de dezembro, janeiro e fevereiro.
      await purchase({ amount: 30000, installments: 3, date: '2026-11-15' });
      // Despesa comum na conta, em dezembro.
      await insertTransaction(ctx.prisma, {
        userId,
        accountId,
        categoryId: expenseCategoryId,
        amount: 5000,
        type: 'EXPENSE',
        date: '2026-12-20',
      });
    });

    const summary = async (month: string) =>
      (await http().get(`/api/v1/summary/monthly?month=${month}`).set(bearer(user)).expect(200))
        .body as MonthlySummary;

    const transactions = async (query: string) =>
      (await http().get(`/api/v1/transactions?${query}`).set(bearer(user)).expect(200))
        .body as Paginated<Transaction>;

    it('o resumo conta cada parcela no mês da sua fatura', async () => {
      expect((await summary('2026-11')).totalExpense).toBe(0);
      expect((await summary('2026-12')).totalExpense).toBe(10000 + 5000);
      expect((await summary('2027-01')).totalExpense).toBe(10000);
      expect((await summary('2027-02')).totalExpense).toBe(10000);
      expect((await summary('2027-03')).totalExpense).toBe(0);
    });

    it('a lista do mês traz as parcelas da fatura do mês', async () => {
      const january = await transactions('month=2027-01');
      expect(january.data).toMatchObject([
        { cardId, installmentNumber: 2, installmentTotal: 3, date: '2026-11-15' },
      ]);
      expect((await transactions('month=2026-12')).meta.total).toBe(2);
    });

    it('filtra pelo cartão', async () => {
      expect((await transactions(`cardId=${cardId}`)).meta.total).toBe(3);
    });
  });

  it('isola as compras de cada pessoa', async () => {
    const created = (await purchase({ amount: 30000, installments: 3, date: '2026-11-09' }))
      .body as CardPurchase;
    const other = await registerUser(ctx.app);
    const otherCategory = await defaultCategory(ctx.prisma, other.auth.user.id, 'EXPENSE');

    // Não dá para lançar no cartão de outra pessoa…
    const foreign = await purchase(
      { amount: 1000, date: '2026-11-09', categoryId: otherCategory.id },
      other,
    );
    expect(foreign.status).toBe(404);
    // …nem usar a categoria de outra pessoa no próprio cartão.
    expect(
      (await purchase({ amount: 1000, date: '2026-11-09', categoryId: otherCategory.id })).status,
    ).toBe(404);

    const path = `/api/v1/cards/${cardId}/purchases/${created.groupId}`;
    await http().get(path).set(bearer(other)).expect(404);
    await http().patch(path).set(bearer(other)).send({ description: 'x' }).expect(404);
    await http().delete(path).set(bearer(other)).expect(404);
  });
});
