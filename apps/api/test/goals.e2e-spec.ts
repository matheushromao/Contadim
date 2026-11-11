import type {
  Account,
  ErrorResponse,
  Goal,
  GoalMovement,
  MonthlySummary,
  Paginated,
} from '@contadim/contracts';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, CSRF, registerUser, type TestUser } from './utils/auth.js';
import { insertGoal, insertGoalMovement, walletAccount } from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestContext } from './utils/test-app.js';

/** Hoje fixo: 11/11/2026. */
const TODAY = '2026-11-11';

describe('Metas', () => {
  let ctx: TestContext;
  let user: TestUser;
  let accountId: string;
  const http = () => request(ctx.app.getHttpServer());
  const newGoal = { name: 'Viagem', targetAmount: 200000, color: '#0EA5E9', icon: 'plane' };

  const move = (goalId: string, type: string, amount: number, who = user, account = accountId) =>
    http()
      .post(`/api/v1/goals/${goalId}/movements`)
      .set(bearer(who))
      .send({ type, accountId: account, amount, date: TODAY });

  const balance = async () =>
    (
      (await http().get(`/api/v1/accounts/${accountId}`).set(bearer(user)).expect(200))
        .body as Account
    ).currentBalance;

  beforeAll(async () => {
    ctx = await createTestApp({ today: TODAY });
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    user = await registerUser(ctx.app);
    accountId = (await walletAccount(ctx.prisma, user.auth.user.id)).id;
    await ctx.prisma.account.update({ where: { id: accountId }, data: { initialBalance: 500000 } });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('plano mensal', () => {
    it('com prazo em março e sem depósito em novembro: 5 meses de R$ 240', async () => {
      const goal = await insertGoal(ctx.prisma, {
        userId: user.auth.user.id,
        targetAmount: 200000,
        deadline: '2027-03-31',
      });
      await insertGoalMovement(ctx.prisma, {
        userId: user.auth.user.id,
        goalId: goal.id,
        accountId,
        type: 'DEPOSIT',
        amount: 80000,
        date: '2026-10-05',
      });

      const body = (await http().get(`/api/v1/goals/${goal.id}`).set(bearer(user)).expect(200))
        .body as Goal;
      expect(body).toMatchObject({
        saved: 80000,
        remaining: 120000,
        percent: 40,
        status: 'IN_PROGRESS',
        monthsLeft: 5,
        monthlyAmount: 24000,
        savedThisMonth: 0,
      });
    });

    it('depois de guardar em novembro: 4 meses', async () => {
      const goal = await insertGoal(ctx.prisma, {
        userId: user.auth.user.id,
        targetAmount: 200000,
        deadline: '2027-03-31',
      });
      const body = (await move(goal.id, 'DEPOSIT', 80000).expect(201)).body as Goal;
      expect(body).toMatchObject({
        saved: 80000,
        savedThisMonth: 80000,
        monthsLeft: 4,
        monthlyAmount: 30000,
      });
    });

    it('sem prazo mostra só o progresso; atingida não pede mais nada', async () => {
      const created = (
        await http()
          .post('/api/v1/goals')
          .set(bearer(user))
          .send({ ...newGoal, deadline: '' })
          .expect(201)
      ).body as Goal;
      expect(created).toMatchObject({
        deadline: null,
        status: 'NO_DEADLINE',
        monthsLeft: null,
        monthlyAmount: null,
        saved: 0,
      });

      const achieved = (await move(created.id, 'DEPOSIT', 200000).expect(201)).body as Goal;
      expect(achieved).toMatchObject({ status: 'ACHIEVED', percent: 100, remaining: 0 });
    });

    it('prazo vencido pede tudo o que falta', async () => {
      const goal = await insertGoal(ctx.prisma, {
        userId: user.auth.user.id,
        deadline: '2026-10-31',
      });
      const body = (await http().get(`/api/v1/goals/${goal.id}`).set(bearer(user)).expect(200))
        .body as Goal;
      expect(body).toMatchObject({ status: 'OVERDUE', monthlyAmount: 200000 });
    });
  });

  describe('guardar e resgatar', () => {
    it('depósito reduz o saldo da conta e não entra no resumo', async () => {
      const goal = await insertGoal(ctx.prisma, { userId: user.auth.user.id });
      await move(goal.id, 'DEPOSIT', 30000).expect(201);

      expect(await balance()).toBe(500000 - 30000);
      const summary = (
        await http().get('/api/v1/summary/monthly?month=2026-11').set(bearer(user)).expect(200)
      ).body as MonthlySummary;
      expect(summary).toMatchObject({ totalIncome: 0, totalExpense: 0, balance: 0 });
    });

    it('resgate devolve para a conta e não passa do que está guardado', async () => {
      const goal = await insertGoal(ctx.prisma, { userId: user.auth.user.id });

      const empty = await move(goal.id, 'WITHDRAWAL', 100).expect(422);
      expect((empty.body as ErrorResponse).error.message).toMatch(/não há dinheiro guardado/);

      await move(goal.id, 'DEPOSIT', 30000).expect(201);
      const tooMuch = await move(goal.id, 'WITHDRAWAL', 30001).expect(422);
      expect((tooMuch.body as ErrorResponse).error.message).toMatch(/até R\$\s300,00/);

      const after = (await move(goal.id, 'WITHDRAWAL', 10000).expect(201)).body as Goal;
      expect(after.saved).toBe(20000);
      expect(await balance()).toBe(500000 - 20000);
    });

    it('lista o histórico e desfaz movimentações com segurança', async () => {
      const goal = await insertGoal(ctx.prisma, { userId: user.auth.user.id });
      await move(goal.id, 'DEPOSIT', 30000).expect(201);
      await move(goal.id, 'WITHDRAWAL', 30000).expect(201);

      const history = (
        await http().get(`/api/v1/goals/${goal.id}/movements`).set(bearer(user)).expect(200)
      ).body as Paginated<GoalMovement>;
      expect(history.meta.total).toBe(2);
      const deposit = history.data.find((item) => item.type === 'DEPOSIT')!;
      const withdrawal = history.data.find((item) => item.type === 'WITHDRAWAL')!;

      // Desfazer o depósito deixaria a meta negativa (o dinheiro já foi resgatado).
      const blocked = await http()
        .delete(`/api/v1/goals/${goal.id}/movements/${deposit.id}`)
        .set(bearer(user))
        .expect(422);
      expect((blocked.body as ErrorResponse).error.message).toMatch(/já foi resgatado/);

      await http()
        .delete(`/api/v1/goals/${goal.id}/movements/${withdrawal.id}`)
        .set(bearer(user))
        .expect(204);
      await http()
        .delete(`/api/v1/goals/${goal.id}/movements/${deposit.id}`)
        .set(bearer(user))
        .expect(204);
      expect(await balance()).toBe(500000);
    });
  });

  describe('criar, editar e excluir', () => {
    it('edita valor-alvo e prazo, recalculando o plano', async () => {
      const created = (
        await http().post('/api/v1/goals').set(bearer(user)).send(newGoal).expect(201)
      ).body as Goal;
      const updated = (
        await http()
          .patch(`/api/v1/goals/${created.id}`)
          .set(bearer(user))
          .send({ targetAmount: 120000, deadline: '2027-03-15' })
          .expect(200)
      ).body as Goal;
      expect(updated).toMatchObject({ targetAmount: 120000, monthsLeft: 5, monthlyAmount: 24000 });

      const noDeadline = (
        await http()
          .patch(`/api/v1/goals/${created.id}`)
          .set(bearer(user))
          .send({ deadline: null })
          .expect(200)
      ).body as Goal;
      expect(noDeadline.status).toBe('NO_DEADLINE');
    });

    it('não exclui meta com dinheiro guardado', async () => {
      const goal = await insertGoal(ctx.prisma, { userId: user.auth.user.id });
      await move(goal.id, 'DEPOSIT', 30000).expect(201);

      const blocked = await http().delete(`/api/v1/goals/${goal.id}`).set(bearer(user)).expect(409);
      expect((blocked.body as ErrorResponse).error.message).toMatch(/Resgate o valor/);

      await move(goal.id, 'WITHDRAWAL', 30000).expect(201);
      await http().delete(`/api/v1/goals/${goal.id}`).set(bearer(user)).expect(204);
      expect(await ctx.prisma.goalMovement.count({ where: { goalId: goal.id } })).toBe(0);
    });

    it('não exclui conta usada em metas', async () => {
      const goal = await insertGoal(ctx.prisma, { userId: user.auth.user.id });
      await move(goal.id, 'DEPOSIT', 100).expect(201);
      await http().delete(`/api/v1/accounts/${accountId}`).set(bearer(user)).expect(409);
    });

    it.each([
      ['valor-alvo zero', { targetAmount: 0 }],
      ['prazo inválido', { deadline: '2027-02-30' }],
      ['sem nome', { name: '' }],
    ])('rejeita %s', async (_label, overrides) => {
      await http()
        .post('/api/v1/goals')
        .set(bearer(user))
        .send({ ...newGoal, ...overrides })
        .expect(400);
    });
  });

  it('a exclusão da conta (LGPD) apaga as metas e movimentações', async () => {
    const goal = await insertGoal(ctx.prisma, { userId: user.auth.user.id });
    await move(goal.id, 'DEPOSIT', 5000).expect(201);

    await http()
      .delete('/api/v1/users/me')
      .set(bearer(user))
      .send({ password: user.password })
      .expect(204);
    expect(await ctx.prisma.goal.count({ where: { userId: user.auth.user.id } })).toBe(0);
    expect(await ctx.prisma.goalMovement.count({ where: { userId: user.auth.user.id } })).toBe(0);
    await http()
      .post('/api/v1/auth/refresh')
      .set(CSRF)
      .set('Cookie', user.refreshCookie)
      .expect(401);
  });

  it('isola as metas de cada pessoa', async () => {
    const goal = await insertGoal(ctx.prisma, { userId: user.auth.user.id });
    const other = await registerUser(ctx.app);
    const otherAccount = await walletAccount(ctx.prisma, other.auth.user.id);

    await http().get(`/api/v1/goals/${goal.id}`).set(bearer(other)).expect(404);
    await http()
      .patch(`/api/v1/goals/${goal.id}`)
      .set(bearer(other))
      .send({ name: 'x' })
      .expect(404);
    await http().delete(`/api/v1/goals/${goal.id}`).set(bearer(other)).expect(404);
    await http().get(`/api/v1/goals/${goal.id}/movements`).set(bearer(other)).expect(404);
    await move(goal.id, 'DEPOSIT', 100, other, otherAccount.id).expect(404);
    // Nem dá para guardar na própria meta com a conta de outra pessoa.
    await move(goal.id, 'DEPOSIT', 100, user, otherAccount.id).expect(404);

    const deposit = (await move(goal.id, 'DEPOSIT', 100).expect(201)).body as Goal;
    expect(deposit.saved).toBe(100);
    const history = (
      await http().get(`/api/v1/goals/${goal.id}/movements`).set(bearer(user)).expect(200)
    ).body as Paginated<GoalMovement>;
    await http()
      .delete(`/api/v1/goals/${goal.id}/movements/${history.data[0]!.id}`)
      .set(bearer(other))
      .expect(404);
    expect(
      ((await http().get('/api/v1/goals').set(bearer(other)).expect(200)).body as Paginated<Goal>)
        .meta.total,
    ).toBe(0);
  });
});
