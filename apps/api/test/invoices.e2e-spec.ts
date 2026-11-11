import type {
  Account,
  ErrorResponse,
  InvoiceDetail,
  InvoiceSummary,
  MonthlySummary,
} from '@contadim/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, registerUser, type TestUser } from './utils/auth.js';
import { defaultCategory, insertCard, insertCardCharge, walletAccount } from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestContext } from './utils/test-app.js';

/** Hoje fixo: 09/11/2026. Cartão fecha dia 3 e vence dia 10. */
const TODAY = '2026-11-09';

describe('Faturas', () => {
  let ctx: TestContext;
  let user: TestUser;
  let cardId: string;
  let accountId: string;
  const http = () => request(ctx.app.getHttpServer());
  const base = () => `/api/v1/cards/${cardId}/invoices`;

  const invoice = async (month: string, who: TestUser = user) =>
    (await http().get(`${base()}/${month}`).set(bearer(who)).expect(200)).body as InvoiceDetail;

  const pay = (month: string, amount: number, who: TestUser = user, account = accountId) =>
    http()
      .post(`${base()}/${month}/payments`)
      .set(bearer(who))
      .send({ accountId: account, amount, date: TODAY });

  beforeAll(async () => {
    ctx = await createTestApp({ today: TODAY });
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    user = await registerUser(ctx.app);
    const userId = user.auth.user.id;
    cardId = (await insertCard(ctx.prisma, { userId })).id;
    accountId = (await walletAccount(ctx.prisma, userId)).id;
    await ctx.prisma.account.update({ where: { id: accountId }, data: { initialBalance: 100000 } });
    const categoryId = (await defaultCategory(ctx.prisma, userId, 'EXPENSE')).id;
    const charge = (amount: number, invoiceMonth: string) =>
      insertCardCharge(ctx.prisma, { userId, cardId, categoryId, amount, invoiceMonth });

    await charge(7000, '2026-10'); // venceu em 10/10 e não foi paga
    await charge(30000, '2026-11'); // fechou em 03/11, vence amanhã (10/11)
    await charge(12000, '2026-12'); // fatura aberta
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('lista as faturas em volta da atual, com status calculado', async () => {
    const response = await http().get(base()).set(bearer(user)).expect(200);
    const { data } = response.body as { data: InvoiceSummary[] };

    // Fatura atual: 2026-12. Padrão: 3 meses antes e 12 depois.
    expect(data[0]?.month).toBe('2026-09');
    expect(data.at(-1)?.month).toBe('2027-12');
    expect(data).toHaveLength(16);

    const byMonth = Object.fromEntries(data.map((item) => [item.month, item]));
    expect(byMonth['2026-09']).toMatchObject({ total: 0, status: 'PAID' });
    expect(byMonth['2026-10']).toMatchObject({ total: 7000, remaining: 7000, status: 'OVERDUE' });
    expect(byMonth['2026-11']).toMatchObject({
      total: 30000,
      status: 'CLOSED',
      closingDate: '2026-11-03',
      dueDate: '2026-11-10',
    });
    expect(byMonth['2026-12']).toMatchObject({ total: 12000, status: 'OPEN' });
  });

  it('aceita um intervalo personalizado', async () => {
    const response = await http()
      .get(`${base()}?from=2026-11&to=2027-01`)
      .set(bearer(user))
      .expect(200);
    expect((response.body as { data: InvoiceSummary[] }).data.map((item) => item.month)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
    ]);
  });

  it('pagamento parcial reduz o saldo da conta e não entra no resumo', async () => {
    const summaryBefore = (
      await http().get('/api/v1/summary/monthly?month=2026-11').set(bearer(user)).expect(200)
    ).body as MonthlySummary;

    const response = await pay('2026-11', 10000).expect(201);
    expect(response.body as InvoiceDetail).toMatchObject({
      total: 30000,
      paid: 10000,
      remaining: 20000,
      status: 'PARTIALLY_PAID',
      payments: [{ amount: 10000, accountId, date: TODAY }],
    });

    const account = (
      await http().get(`/api/v1/accounts/${accountId}`).set(bearer(user)).expect(200)
    ).body as Account;
    expect(account.currentBalance).toBe(100000 - 10000);

    const summaryAfter = (
      await http().get('/api/v1/summary/monthly?month=2026-11').set(bearer(user)).expect(200)
    ).body as MonthlySummary;
    expect(summaryAfter.totalExpense).toBe(summaryBefore.totalExpense);
  });

  it('quita a fatura e recusa pagar além do que falta', async () => {
    const over = await pay('2026-11', 30001).expect(422);
    expect((over.body as ErrorResponse).error.message).toMatch(/passa do que falta pagar/);

    await pay('2026-11', 30000).expect(201);
    expect((await invoice('2026-11')).status).toBe('PAID');

    const again = await pay('2026-11', 1).expect(422);
    expect((again.body as ErrorResponse).error.message).toMatch(/não tem valor em aberto/);
  });

  it('libera o limite ao pagar e desfaz o pagamento', async () => {
    const limitOf = async () =>
      (
        (await http().get(`/api/v1/cards/${cardId}`).set(bearer(user)).expect(200)).body as {
          availableLimit: number;
        }
      ).availableLimit;

    expect(await limitOf()).toBe(500000 - 7000 - 30000 - 12000);
    const paid = (await pay('2026-10', 7000).expect(201)).body as InvoiceDetail;
    expect(await limitOf()).toBe(500000 - 30000 - 12000);

    await http()
      .delete(`${base()}/2026-10/payments/${paid.payments[0]!.id}`)
      .set(bearer(user))
      .expect(204);
    expect((await invoice('2026-10')).status).toBe('OVERDUE');
    expect(await limitOf()).toBe(500000 - 7000 - 30000 - 12000);
  });

  it('mostra as parcelas cobradas no detalhe', async () => {
    const detail = await invoice('2026-12');
    expect(detail.transactions).toMatchObject([{ amount: 12000, invoiceMonth: '2026-12', cardId }]);
    expect(detail.payments).toEqual([]);
  });

  it('não exclui conta usada em pagamento de fatura', async () => {
    const account = (
      await http()
        .post('/api/v1/accounts')
        .set(bearer(user))
        .send({ name: 'Banco', type: 'CHECKING' })
        .expect(201)
    ).body as Account;
    await pay('2026-11', 100, user, account.id).expect(201);

    await http().delete(`/api/v1/accounts/${account.id}`).set(bearer(user)).expect(409);
  });

  it('valida o mês e o valor', async () => {
    await http().get(`${base()}/2026-13`).set(bearer(user)).expect(400);
    await pay('2026-11', 0).expect(400);
    await http().get(`${base()}?from=2027-01&to=2026-01`).set(bearer(user)).expect(400);
  });

  it('isola as faturas de cada pessoa', async () => {
    const other = await registerUser(ctx.app);
    const otherAccount = await walletAccount(ctx.prisma, other.auth.user.id);

    await http().get(base()).set(bearer(other)).expect(404);
    await http().get(`${base()}/2026-11`).set(bearer(other)).expect(404);
    await pay('2026-11', 100, other, otherAccount.id).expect(404);
    // Nem dá para pagar a própria fatura com a conta de outra pessoa.
    await pay('2026-11', 100, user, otherAccount.id).expect(404);

    const paid = (await pay('2026-11', 100).expect(201)).body as InvoiceDetail;
    await http()
      .delete(`${base()}/2026-11/payments/${paid.payments[0]!.id}`)
      .set(bearer(other))
      .expect(404);
  });
});
