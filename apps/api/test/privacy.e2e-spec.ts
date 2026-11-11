import { type ErrorResponse, userDataExportSchema } from '@contadim/contracts';
import { DEFAULT_CATEGORIES } from '@contadim/core';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, CSRF, registerUser, type TestUser } from './utils/auth.js';
import {
  defaultCategory,
  insertCard,
  insertCardCharge,
  insertInvoicePayment,
  insertTransaction,
  walletAccount,
} from './utils/fixtures.js';
import { createTestApp, resetDatabase, type TestContext } from './utils/test-app.js';

describe('LGPD', () => {
  let ctx: TestContext;
  let user: TestUser;
  const http = () => request(ctx.app.getHttpServer());

  /** Cria um cartão com uma compra e um pagamento de fatura. */
  const seedCard = async (who: TestUser) => {
    const userId = who.auth.user.id;
    const account = await walletAccount(ctx.prisma, userId);
    const category = await defaultCategory(ctx.prisma, userId, 'EXPENSE');
    const card = await insertCard(ctx.prisma, { userId });
    const base = { userId, cardId: card.id, invoiceMonth: '2026-12' };
    await insertCardCharge(ctx.prisma, { ...base, categoryId: category.id, amount: 8000 });
    await insertInvoicePayment(ctx.prisma, { ...base, accountId: account.id, amount: 3000 });
  };

  const seedTransaction = async (who: TestUser, amount: number) => {
    const userId = who.auth.user.id;
    const account = await walletAccount(ctx.prisma, userId);
    const category = await defaultCategory(ctx.prisma, userId, 'EXPENSE');
    return insertTransaction(ctx.prisma, {
      userId,
      accountId: account.id,
      categoryId: category.id,
      amount,
      type: 'EXPENSE',
      description: 'Mercado',
    });
  };

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

  describe('GET /users/me/export', () => {
    it('exporta todos os dados da pessoa, e só dela', async () => {
      await seedTransaction(user, 1234);
      await seedCard(user);
      const other = await registerUser(ctx.app);
      await seedTransaction(other, 9999);

      const response = await http().get('/api/v1/users/me/export').set(bearer(user)).expect(200);

      expect(response.headers['content-disposition']).toMatch(
        /^attachment; filename="contadim-dados-\d{4}-\d{2}-\d{2}\.json"$/,
      );
      expect(response.headers['cache-control']).toBe('no-store');

      const data = userDataExportSchema.parse(response.body);
      expect(data.user.email).toBe(user.email);
      expect(data.accounts).toHaveLength(1);
      expect(data.categories).toHaveLength(DEFAULT_CATEGORIES.length);
      expect(data.version).toBe(2);
      expect(data.transactions).toMatchObject([
        { amount: 1234, description: 'Mercado', accountId: expect.any(String) as unknown },
        { amount: 8000, invoiceMonth: '2026-12', cardId: expect.any(String) as unknown },
      ]);
      expect(data.creditCards).toMatchObject([{ name: 'Nubank', closingDay: 3, dueDay: 10 }]);
      expect(data.invoicePayments).toMatchObject([{ amount: 3000, invoiceMonth: '2026-12' }]);
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    });
  });

  describe('DELETE /users/me', () => {
    it('exige a senha correta', async () => {
      const response = await http()
        .delete('/api/v1/users/me')
        .set(bearer(user))
        .send({ password: 'senha-errada' })
        .expect(403);
      expect((response.body as ErrorResponse).error.message).toBe('Senha incorreta');
      expect(await ctx.prisma.user.count({ where: { id: user.auth.user.id } })).toBe(1);

      await http().delete('/api/v1/users/me').set(bearer(user)).send({}).expect(400);
    });

    it('apaga a conta e todos os dados, encerrando a sessão', async () => {
      await seedTransaction(user, 500);
      await seedCard(user);
      const other = await registerUser(ctx.app);
      await seedTransaction(other, 700);
      const userId = user.auth.user.id;

      const response = await http()
        .delete('/api/v1/users/me')
        .set(bearer(user))
        .send({ password: user.password })
        .expect(204);
      expect(String(response.headers['set-cookie'])).toContain('contadim_rt=;');

      const where = { userId };
      expect(await ctx.prisma.user.count({ where: { id: userId } })).toBe(0);
      expect(await ctx.prisma.account.count({ where })).toBe(0);
      expect(await ctx.prisma.category.count({ where })).toBe(0);
      expect(await ctx.prisma.transaction.count({ where })).toBe(0);
      expect(await ctx.prisma.refreshToken.count({ where })).toBe(0);
      expect(await ctx.prisma.creditCard.count({ where })).toBe(0);
      expect(await ctx.prisma.invoicePayment.count({ where })).toBe(0);

      // Os dados de outras pessoas continuam intactos.
      expect(await ctx.prisma.transaction.count({ where: { userId: other.auth.user.id } })).toBe(1);

      // O refresh token antigo não serve mais, e o e-mail pode ser usado de novo.
      await http()
        .post('/api/v1/auth/refresh')
        .set(CSRF)
        .set('Cookie', user.refreshCookie)
        .expect(401);
      await registerUser(ctx.app, { email: user.email });
    });
  });
});
