import type { Category, ErrorResponse, Paginated } from '@contadim/contracts';
import { DEFAULT_CATEGORIES } from '@contadim/core';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, registerUser, type TestUser } from './utils/auth.js';
import { defaultCategory, insertTransaction, walletAccount } from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestContext } from './utils/test-app.js';

describe('Categorias', () => {
  let ctx: TestContext;
  let user: TestUser;
  const http = () => request(ctx.app.getHttpServer());
  const newCategory = { name: 'Pets', type: 'EXPENSE', color: '#AA5500', icon: 'dog' };

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

  it('lista as categorias padrão, com filtro por tipo', async () => {
    const all = await http().get('/api/v1/categories?pageSize=100').set(bearer(user)).expect(200);
    expect((all.body as Paginated<Category>).meta.total).toBe(DEFAULT_CATEGORIES.length);

    const incomes = await http()
      .get('/api/v1/categories?type=INCOME&pageSize=100')
      .set(bearer(user))
      .expect(200);
    const data = (incomes.body as Paginated<Category>).data;
    expect(data.length).toBe(DEFAULT_CATEGORIES.filter((c) => c.type === 'INCOME').length);
    expect(data.every((category) => category.type === 'INCOME' && category.isDefault)).toBe(true);
  });

  it('cria, atualiza e exclui uma categoria', async () => {
    const created = await http()
      .post('/api/v1/categories')
      .set(bearer(user))
      .send(newCategory)
      .expect(201);
    const category = created.body as Category;
    expect(category).toMatchObject({ ...newCategory, isDefault: false });

    const updated = await http()
      .patch(`/api/v1/categories/${category.id}`)
      .set(bearer(user))
      .send({ name: 'Bichinhos', color: '#112233', type: 'INCOME' })
      .expect(200);
    expect(updated.body as Category).toMatchObject({
      name: 'Bichinhos',
      color: '#112233',
      type: 'EXPENSE',
    });

    await http().delete(`/api/v1/categories/${category.id}`).set(bearer(user)).expect(204);
    await http().get(`/api/v1/categories/${category.id}`).set(bearer(user)).expect(404);
  });

  it('não permite nomes repetidos no mesmo tipo (ignorando maiúsculas)', async () => {
    const response = await http()
      .post('/api/v1/categories')
      .set(bearer(user))
      .send({ ...newCategory, name: 'alimentação' })
      .expect(409);
    expect((response.body as ErrorResponse).error.message).toMatch(/já tem uma categoria/);

    // O mesmo nome em outro tipo é permitido.
    await http()
      .post('/api/v1/categories')
      .set(bearer(user))
      .send({ ...newCategory, name: 'Alimentação', type: 'INCOME' })
      .expect(201);
  });

  it('não permite renomear para um nome já usado', async () => {
    const created = await http()
      .post('/api/v1/categories')
      .set(bearer(user))
      .send(newCategory)
      .expect(201);
    await http()
      .patch(`/api/v1/categories/${(created.body as Category).id}`)
      .set(bearer(user))
      .send({ name: 'Moradia' })
      .expect(409);
  });

  it('não exclui categoria em uso', async () => {
    const expense = await defaultCategory(ctx.prisma, user.auth.user.id, 'EXPENSE');
    const wallet = await walletAccount(ctx.prisma, user.auth.user.id);
    await insertTransaction(ctx.prisma, {
      userId: user.auth.user.id,
      accountId: wallet.id,
      categoryId: expense.id,
      amount: 100,
      type: 'EXPENSE',
    });
    await http().delete(`/api/v1/categories/${expense.id}`).set(bearer(user)).expect(409);
  });

  it('valida cor e campos obrigatórios', async () => {
    await http()
      .post('/api/v1/categories')
      .set(bearer(user))
      .send({ ...newCategory, color: 'azul' })
      .expect(400);
    await http().post('/api/v1/categories').set(bearer(user)).send({}).expect(400);
  });

  it('isola as categorias de cada pessoa', async () => {
    const other = await registerUser(ctx.app);
    const expense = await defaultCategory(ctx.prisma, user.auth.user.id, 'EXPENSE');

    await http().get(`/api/v1/categories/${expense.id}`).set(bearer(other)).expect(404);
    await http()
      .patch(`/api/v1/categories/${expense.id}`)
      .set(bearer(other))
      .send({ name: 'Invadida' })
      .expect(404);
    await http().delete(`/api/v1/categories/${expense.id}`).set(bearer(other)).expect(404);
  });
});
