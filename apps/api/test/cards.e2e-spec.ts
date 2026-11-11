import type { CreditCard, ErrorResponse, Paginated } from '@contadim/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, registerUser, type TestUser } from './utils/auth.js';
import {
  defaultCategory,
  insertCard,
  insertCardCharge,
  insertInvoicePayment,
  walletAccount,
} from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestContext } from './utils/test-app.js';

/** Hoje fixo nos testes: 9 de novembro de 2026. */
const TODAY = '2026-11-09';

describe('Cartões', () => {
  let ctx: TestContext;
  let user: TestUser;
  const http = () => request(ctx.app.getHttpServer());
  const newCard = { name: 'Nubank', limit: 500000, closingDay: 3, dueDay: 10, color: '#8B5CF6' };

  beforeAll(async () => {
    ctx = await createTestApp({ today: TODAY });
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    user = await registerUser(ctx.app);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('cria um cartão com limite cheio e a fatura atual aberta', async () => {
    const response = await http().post('/api/v1/cards').set(bearer(user)).send(newCard).expect(201);
    const card = response.body as CreditCard;

    expect(card).toMatchObject({ ...newCard, availableLimit: 500000 });
    // Hoje (09/11) já passou do fechamento do dia 3: a fatura atual é a que vence em dezembro.
    expect(card.currentInvoice).toEqual({
      cardId: card.id,
      month: '2026-12',
      periodStart: '2026-11-03',
      periodEnd: '2026-12-02',
      closingDate: '2026-12-03',
      dueDate: '2026-12-10',
      total: 0,
      paid: 0,
      remaining: 0,
      status: 'OPEN',
    });
  });

  it('calcula o limite disponível com parcelas futuras e pagamentos', async () => {
    const userId = user.auth.user.id;
    const card = await insertCard(ctx.prisma, { userId, limit: 500000 });
    const categoryId = (await defaultCategory(ctx.prisma, userId, 'EXPENSE')).id;
    const accountId = (await walletAccount(ctx.prisma, userId)).id;
    const charge = (amount: number, invoiceMonth: string) =>
      insertCardCharge(ctx.prisma, { userId, cardId: card.id, categoryId, amount, invoiceMonth });

    await charge(30000, '2026-11'); // fatura de novembro (já fechada)
    await charge(20000, '2026-12'); // fatura atual
    await charge(10000, '2027-01'); // parcela futura
    await insertInvoicePayment(ctx.prisma, {
      userId,
      cardId: card.id,
      accountId,
      invoiceMonth: '2026-11',
      amount: 30000,
    });

    const response = await http().get(`/api/v1/cards/${card.id}`).set(bearer(user)).expect(200);
    const body = response.body as CreditCard;
    expect(body.availableLimit).toBe(500000 - 20000 - 10000);
    expect(body.currentInvoice).toMatchObject({ month: '2026-12', total: 20000, status: 'OPEN' });
  });

  it('lista, atualiza e exclui', async () => {
    const created = (await http().post('/api/v1/cards').set(bearer(user)).send(newCard).expect(201))
      .body as CreditCard;

    const list = await http().get('/api/v1/cards').set(bearer(user)).expect(200);
    expect((list.body as Paginated<CreditCard>).data.map((card) => card.id)).toEqual([created.id]);

    const updated = await http()
      .patch(`/api/v1/cards/${created.id}`)
      .set(bearer(user))
      .send({ name: 'Roxinho', closingDay: 25, dueDay: 5 })
      .expect(200);
    expect(updated.body as CreditCard).toMatchObject({
      name: 'Roxinho',
      closingDay: 25,
      dueDay: 5,
      // Fecha dia 25 e vence dia 5: em 09/11 a fatura atual vence em dezembro.
      currentInvoice: { month: '2026-12', closingDate: '2026-11-25', dueDate: '2026-12-05' },
    });

    await http().delete(`/api/v1/cards/${created.id}`).set(bearer(user)).expect(204);
    await http().get(`/api/v1/cards/${created.id}`).set(bearer(user)).expect(404);
  });

  it('não exclui cartão com compras', async () => {
    const userId = user.auth.user.id;
    const card = await insertCard(ctx.prisma, { userId });
    const categoryId = (await defaultCategory(ctx.prisma, userId, 'EXPENSE')).id;
    await insertCardCharge(ctx.prisma, {
      userId,
      cardId: card.id,
      categoryId,
      amount: 100,
      invoiceMonth: '2026-12',
    });

    const response = await http().delete(`/api/v1/cards/${card.id}`).set(bearer(user)).expect(409);
    expect((response.body as ErrorResponse).error.code).toBe('CONFLICT');
  });

  it.each([
    ['dia de fechamento inválido', { closingDay: 0 }],
    ['dia de vencimento inválido', { dueDay: 32 }],
    ['limite negativo', { limit: -1 }],
    ['sem nome', { name: '' }],
  ])('rejeita %s', async (_label, overrides) => {
    await http()
      .post('/api/v1/cards')
      .set(bearer(user))
      .send({ ...newCard, ...overrides })
      .expect(400);
  });

  it('isola os cartões de cada pessoa', async () => {
    const card = await insertCard(ctx.prisma, { userId: user.auth.user.id });
    const other = await registerUser(ctx.app);

    await http().get(`/api/v1/cards/${card.id}`).set(bearer(other)).expect(404);
    await http()
      .patch(`/api/v1/cards/${card.id}`)
      .set(bearer(other))
      .send({ name: 'Invadido' })
      .expect(404);
    await http().delete(`/api/v1/cards/${card.id}`).set(bearer(other)).expect(404);
    const list = await http().get('/api/v1/cards').set(bearer(other)).expect(200);
    expect((list.body as Paginated<CreditCard>).meta.total).toBe(0);
  });
});
