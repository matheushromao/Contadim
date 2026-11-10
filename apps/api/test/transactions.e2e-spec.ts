import type { ErrorResponse, Paginated, Transaction } from '@contadim/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, registerUser, type TestUser } from './utils/auth.js';
import { defaultCategory, walletAccount } from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestContext } from './utils/test-app.js';

describe('Lançamentos', () => {
  let ctx: TestContext;
  let user: TestUser;
  let expenseCategoryId: string;
  let incomeCategoryId: string;
  let accountId: string;
  const http = () => request(ctx.app.getHttpServer());

  const quick = (overrides: Record<string, unknown> = {}) => ({
    amount: 1250,
    type: 'EXPENSE',
    date: '2026-11-09',
    categoryId: expenseCategoryId,
    accountId,
    ...overrides,
  });

  const create = async (overrides: Record<string, unknown> = {}) => {
    const response = await http()
      .post('/api/v1/transactions')
      .set(bearer(user))
      .send(quick(overrides))
      .expect(201);
    return response.body as Transaction;
  };

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    user = await registerUser(ctx.app);
    const userId = user.auth.user.id;
    expenseCategoryId = (await defaultCategory(ctx.prisma, userId, 'EXPENSE')).id;
    incomeCategoryId = (await defaultCategory(ctx.prisma, userId, 'INCOME')).id;
    accountId = (await walletAccount(ctx.prisma, userId)).id;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('cria um lançamento rápido (sem descrição)', async () => {
    const transaction = await create();
    expect(transaction).toMatchObject({
      amount: 1250,
      type: 'EXPENSE',
      date: '2026-11-09',
      description: null,
      categoryId: expenseCategoryId,
      accountId,
      cardId: null,
      invoiceMonth: null,
      installmentGroupId: null,
      installmentNumber: null,
      installmentTotal: null,
    });
  });

  it('guarda a data sem deslocar o dia', async () => {
    const transaction = await create({ date: '2026-12-31' });
    const fetched = await http()
      .get(`/api/v1/transactions/${transaction.id}`)
      .set(bearer(user))
      .expect(200);
    expect((fetched.body as Transaction).date).toBe('2026-12-31');
  });

  it('exige que o tipo bata com o da categoria', async () => {
    const response = await http()
      .post('/api/v1/transactions')
      .set(bearer(user))
      .send(quick({ type: 'INCOME' }))
      .expect(422);
    const { error } = response.body as ErrorResponse;
    expect(error.code).toBe('UNPROCESSABLE');
    expect(error.message).toMatch(/categoria de receita/);
  });

  it.each([
    ['valor zero', { amount: 0 }],
    ['valor negativo', { amount: -10 }],
    ['valor com centavos quebrados', { amount: 12.5 }],
    ['data inválida', { date: '2026-02-30' }],
    ['sem categoria', { categoryId: undefined }],
  ])('rejeita %s', async (_label, overrides) => {
    await http().post('/api/v1/transactions').set(bearer(user)).send(quick(overrides)).expect(400);
  });

  it('atualiza parcialmente e revalida a consistência', async () => {
    const transaction = await create({ description: 'Mercado' });

    const updated = await http()
      .patch(`/api/v1/transactions/${transaction.id}`)
      .set(bearer(user))
      .send({ amount: 3000 })
      .expect(200);
    expect(updated.body as Transaction).toMatchObject({ amount: 3000, description: 'Mercado' });

    // Trocar só o tipo sem trocar a categoria fica inconsistente.
    await http()
      .patch(`/api/v1/transactions/${transaction.id}`)
      .set(bearer(user))
      .send({ type: 'INCOME' })
      .expect(422);

    const switched = await http()
      .patch(`/api/v1/transactions/${transaction.id}`)
      .set(bearer(user))
      .send({ type: 'INCOME', categoryId: incomeCategoryId, description: '' })
      .expect(200);
    expect(switched.body as Transaction).toMatchObject({ type: 'INCOME', description: null });
  });

  it('exclui um lançamento', async () => {
    const transaction = await create();
    await http().delete(`/api/v1/transactions/${transaction.id}`).set(bearer(user)).expect(204);
    await http().get(`/api/v1/transactions/${transaction.id}`).set(bearer(user)).expect(404);
  });

  describe('listagem', () => {
    beforeEach(async () => {
      await create({ date: '2026-10-31', amount: 100 });
      await create({ date: '2026-11-01', amount: 200 });
      await create({ date: '2026-11-15', amount: 300 });
      await create({
        date: '2026-11-30',
        amount: 400,
        type: 'INCOME',
        categoryId: incomeCategoryId,
      });
      await create({ date: '2026-12-01', amount: 500 });
    });

    const list = async (query: string) => {
      const response = await http()
        .get(`/api/v1/transactions${query}`)
        .set(bearer(user))
        .expect(200);
      return response.body as Paginated<Transaction>;
    };

    it('filtra por mês, do primeiro ao último dia', async () => {
      const result = await list('?month=2026-11');
      expect(result.data.map((t) => t.amount)).toEqual([400, 300, 200]);
      expect(result.meta.total).toBe(3);
    });

    it('filtra por intervalo e por tipo', async () => {
      expect((await list('?from=2026-11-15&to=2026-12-01')).meta.total).toBe(3);
      expect((await list('?month=2026-11&type=INCOME')).data.map((t) => t.amount)).toEqual([400]);
    });

    it('filtra por categoria e conta', async () => {
      expect((await list(`?categoryId=${incomeCategoryId}`)).meta.total).toBe(1);
      expect((await list(`?accountId=${accountId}`)).meta.total).toBe(5);
    });

    it('ordena do mais recente para o mais antigo e pagina', async () => {
      const page = await list('?pageSize=2&page=2');
      expect(page.data.map((t) => t.date)).toEqual(['2026-11-15', '2026-11-01']);
      expect(page.meta).toMatchObject({ total: 5, totalPages: 3 });
    });

    it('rejeita filtros conflitantes', async () => {
      await http()
        .get('/api/v1/transactions?month=2026-11&from=2026-11-01')
        .set(bearer(user))
        .expect(400);
    });
  });

  describe('isolamento entre pessoas', () => {
    it('não deixa usar conta ou categoria de outra pessoa', async () => {
      const other = await registerUser(ctx.app);
      const otherAccount = await walletAccount(ctx.prisma, other.auth.user.id);
      const otherCategory = await defaultCategory(ctx.prisma, other.auth.user.id, 'EXPENSE');

      await http()
        .post('/api/v1/transactions')
        .set(bearer(user))
        .send(quick({ accountId: otherAccount.id }))
        .expect(404);
      await http()
        .post('/api/v1/transactions')
        .set(bearer(user))
        .send(quick({ categoryId: otherCategory.id }))
        .expect(404);
    });

    it('não deixa ver, editar ou excluir lançamentos de outra pessoa', async () => {
      const transaction = await create();
      const other = await registerUser(ctx.app);

      await http().get(`/api/v1/transactions/${transaction.id}`).set(bearer(other)).expect(404);
      await http()
        .patch(`/api/v1/transactions/${transaction.id}`)
        .set(bearer(other))
        .send({ amount: 1 })
        .expect(404);
      await http().delete(`/api/v1/transactions/${transaction.id}`).set(bearer(other)).expect(404);

      const list = await http().get('/api/v1/transactions').set(bearer(other)).expect(200);
      expect((list.body as Paginated<Transaction>).meta.total).toBe(0);
    });
  });
});
