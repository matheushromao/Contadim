import type { Account, ErrorResponse, Paginated } from '@contadim/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, registerUser, type TestUser } from './utils/auth.js';
import { defaultCategory, insertTransaction, walletAccount } from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestContext } from './utils/test-app.js';

describe('Contas', () => {
  let ctx: TestContext;
  let user: TestUser;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    user = await registerUser(ctx.app);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('lista a carteira criada no cadastro', async () => {
    const response = await http().get('/api/v1/accounts').set(bearer(user)).expect(200);
    const body = response.body as Paginated<Account>;
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
    expect(body.data).toMatchObject([{ name: 'Carteira', type: 'WALLET', currentBalance: 0 }]);
  });

  it('cria, detalha, atualiza e exclui uma conta', async () => {
    const created = await http()
      .post('/api/v1/accounts')
      .set(bearer(user))
      .send({ name: 'Nubank', type: 'CHECKING', initialBalance: 150000 })
      .expect(201);
    const account = created.body as Account;
    expect(account).toMatchObject({
      name: 'Nubank',
      initialBalance: 150000,
      currentBalance: 150000,
    });

    await http().get(`/api/v1/accounts/${account.id}`).set(bearer(user)).expect(200);

    const updated = await http()
      .patch(`/api/v1/accounts/${account.id}`)
      .set(bearer(user))
      .send({ name: 'Nubank PF' })
      .expect(200);
    expect((updated.body as Account).name).toBe('Nubank PF');

    await http().delete(`/api/v1/accounts/${account.id}`).set(bearer(user)).expect(204);
    await http().get(`/api/v1/accounts/${account.id}`).set(bearer(user)).expect(404);
  });

  it('calcula o saldo atual com receitas e despesas', async () => {
    const wallet = await walletAccount(ctx.prisma, user.auth.user.id);
    await ctx.prisma.account.update({ where: { id: wallet.id }, data: { initialBalance: 10000 } });
    const income = await defaultCategory(ctx.prisma, user.auth.user.id, 'INCOME');
    const expense = await defaultCategory(ctx.prisma, user.auth.user.id, 'EXPENSE');
    const base = { userId: user.auth.user.id, accountId: wallet.id };
    await insertTransaction(ctx.prisma, {
      ...base,
      amount: 5000,
      type: 'INCOME',
      categoryId: income.id,
    });
    await insertTransaction(ctx.prisma, {
      ...base,
      amount: 2500,
      type: 'EXPENSE',
      categoryId: expense.id,
    });
    await insertTransaction(ctx.prisma, {
      ...base,
      amount: 1000,
      type: 'EXPENSE',
      categoryId: expense.id,
    });

    const response = await http()
      .get(`/api/v1/accounts/${wallet.id}`)
      .set(bearer(user))
      .expect(200);
    expect((response.body as Account).currentBalance).toBe(11500);
  });

  it('não exclui conta com lançamentos', async () => {
    const wallet = await walletAccount(ctx.prisma, user.auth.user.id);
    const expense = await defaultCategory(ctx.prisma, user.auth.user.id, 'EXPENSE');
    await insertTransaction(ctx.prisma, {
      userId: user.auth.user.id,
      accountId: wallet.id,
      amount: 100,
      type: 'EXPENSE',
      categoryId: expense.id,
    });

    const response = await http()
      .delete(`/api/v1/accounts/${wallet.id}`)
      .set(bearer(user))
      .expect(409);
    expect((response.body as ErrorResponse).error.code).toBe('CONFLICT');
  });

  it('pagina a listagem', async () => {
    for (const name of ['A', 'B', 'C']) {
      await http()
        .post('/api/v1/accounts')
        .set(bearer(user))
        .send({ name, type: 'SAVINGS' })
        .expect(201);
    }
    const response = await http()
      .get('/api/v1/accounts?page=2&pageSize=3')
      .set(bearer(user))
      .expect(200);
    const body = response.body as Paginated<Account>;
    expect(body.meta).toEqual({ page: 2, pageSize: 3, total: 4, totalPages: 2 });
    expect(body.data.map((account) => account.name)).toEqual(['C']);
  });

  it('valida entrada e id', async () => {
    await http()
      .post('/api/v1/accounts')
      .set(bearer(user))
      .send({ name: '', type: 'CRYPTO', initialBalance: 1.5 })
      .expect(400);
    await http().get('/api/v1/accounts/nao-e-uuid').set(bearer(user)).expect(400);
  });

  it('isola as contas de cada pessoa', async () => {
    const other = await registerUser(ctx.app);
    const wallet = await walletAccount(ctx.prisma, user.auth.user.id);

    await http().get(`/api/v1/accounts/${wallet.id}`).set(bearer(other)).expect(404);
    await http()
      .patch(`/api/v1/accounts/${wallet.id}`)
      .set(bearer(other))
      .send({ name: 'Invadida' })
      .expect(404);
    await http().delete(`/api/v1/accounts/${wallet.id}`).set(bearer(other)).expect(404);

    const list = await http().get('/api/v1/accounts').set(bearer(other)).expect(200);
    expect((list.body as Paginated<Account>).data.map((account) => account.id)).not.toContain(
      wallet.id,
    );
  });

  it('exige autenticação', async () => {
    await http().get('/api/v1/accounts').expect(401);
  });
});
