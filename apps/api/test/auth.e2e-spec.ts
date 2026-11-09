import type { AuthResponse, ErrorResponse, User } from '@contadim/contracts';
import { DEFAULT_CATEGORIES } from '@contadim/core';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bearer, CSRF, extractRefreshCookie, registerUser } from './utils/auth.js';
import { createTestApp, resetDatabase, type TestContext } from './utils/test-app.js';

describe('Auth', () => {
  let ctx: TestContext;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('POST /auth/register', () => {
    it('cria a conta, as categorias padrão, a carteira e inicia a sessão', async () => {
      const response = await http()
        .post('/api/v1/auth/register')
        .send({ name: ' Maria ', email: 'Maria@Exemplo.com', password: 'senha-super-segura' })
        .expect(201);

      const body = response.body as AuthResponse;
      expect(body.user).toMatchObject({ name: 'Maria', email: 'maria@exemplo.com' });
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.expiresIn).toBe(900);
      expect(body.user).not.toHaveProperty('passwordHash');

      const setCookie = String(response.headers['set-cookie']);
      expect(setCookie).toContain('contadim_rt=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Path=/api/v1/auth');
      expect(setCookie).toContain('SameSite=Lax');

      const userId = body.user.id;
      expect(await ctx.prisma.category.count({ where: { userId } })).toBe(
        DEFAULT_CATEGORIES.length,
      );
      const accounts = await ctx.prisma.account.findMany({ where: { userId } });
      expect(accounts).toMatchObject([{ name: 'Carteira', type: 'WALLET', initialBalance: 0 }]);

      const stored = await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    });

    it('recusa e-mail já cadastrado', async () => {
      await registerUser(ctx.app, { email: 'repetido@exemplo.com' });
      const response = await http()
        .post('/api/v1/auth/register')
        .send({ name: 'Outra', email: 'REPETIDO@exemplo.com', password: 'outra-senha-boa' })
        .expect(409);
      expect((response.body as ErrorResponse).error.code).toBe('CONFLICT');
    });

    it('valida os dados de entrada', async () => {
      const response = await http()
        .post('/api/v1/auth/register')
        .send({ name: '', email: 'invalido', password: '123' })
        .expect(400);
      const { error } = response.body as ErrorResponse;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: 'name' }),
          expect.objectContaining({ path: 'email' }),
          expect.objectContaining({ path: 'password' }),
        ]),
      );
    });
  });

  describe('POST /auth/login', () => {
    it('entra com e-mail e senha corretos', async () => {
      const user = await registerUser(ctx.app);
      const response = await http()
        .post('/api/v1/auth/login')
        .send({ email: user.email.toUpperCase(), password: user.password })
        .expect(200);
      expect((response.body as AuthResponse).user.email).toBe(user.email);
      expect(extractRefreshCookie(response.headers['set-cookie'])).toBeDefined();
    });

    it('não revela se o erro foi no e-mail ou na senha', async () => {
      const user = await registerUser(ctx.app);
      const wrongPassword = await http()
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'senha-errada' })
        .expect(401);
      const unknownEmail = await http()
        .post('/api/v1/auth/login')
        .send({ email: 'ninguem@exemplo.com', password: 'senha-errada' })
        .expect(401);
      expect((wrongPassword.body as ErrorResponse).error.message).toBe(
        (unknownEmail.body as ErrorResponse).error.message,
      );
    });
  });

  describe('GET /users/me', () => {
    it('retorna a pessoa autenticada', async () => {
      const user = await registerUser(ctx.app, { name: 'João' });
      const response = await http().get('/api/v1/users/me').set(bearer(user)).expect(200);
      expect(response.body as User).toEqual(user.auth.user);
    });

    it('exige access token válido', async () => {
      await http().get('/api/v1/users/me').expect(401);
      await http()
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotaciona o refresh token e devolve um novo access token', async () => {
      const user = await registerUser(ctx.app);
      const response = await http()
        .post('/api/v1/auth/refresh')
        .set(CSRF)
        .set('Cookie', user.refreshCookie)
        .expect(200);

      const nextCookie = extractRefreshCookie(response.headers['set-cookie']);
      expect(nextCookie).toBeDefined();
      expect(nextCookie).not.toBe(user.refreshCookie);
      await http()
        .get('/api/v1/users/me')
        .set(bearer(response.body as AuthResponse))
        .expect(200);
    });

    it('detecta reuso de token e encerra a sessão inteira', async () => {
      const user = await registerUser(ctx.app);
      const first = await http()
        .post('/api/v1/auth/refresh')
        .set(CSRF)
        .set('Cookie', user.refreshCookie)
        .expect(200);
      const rotatedCookie = extractRefreshCookie(first.headers['set-cookie'])!;

      // Reutiliza o token antigo (como faria alguém que o roubou).
      const reuse = await http()
        .post('/api/v1/auth/refresh')
        .set(CSRF)
        .set('Cookie', user.refreshCookie)
        .expect(401);
      expect(String(reuse.headers['set-cookie'])).toContain('contadim_rt=;');

      // O token legítimo mais recente também deixa de valer.
      await http().post('/api/v1/auth/refresh').set(CSRF).set('Cookie', rotatedCookie).expect(401);
    });

    it('exige o header anti-CSRF', async () => {
      const user = await registerUser(ctx.app);
      const response = await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', user.refreshCookie)
        .expect(403);
      expect((response.body as ErrorResponse).error.code).toBe('FORBIDDEN');
    });

    it('recusa quando não há cookie', async () => {
      await http().post('/api/v1/auth/refresh').set(CSRF).expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('revoga a sessão e limpa o cookie', async () => {
      const user = await registerUser(ctx.app);
      const response = await http()
        .post('/api/v1/auth/logout')
        .set(CSRF)
        .set('Cookie', user.refreshCookie)
        .expect(204);
      expect(String(response.headers['set-cookie'])).toContain('contadim_rt=;');

      await http()
        .post('/api/v1/auth/refresh')
        .set(CSRF)
        .set('Cookie', user.refreshCookie)
        .expect(401);
    });

    it('é idempotente sem cookie', async () => {
      await http().post('/api/v1/auth/logout').set(CSRF).expect(204);
    });
  });
});
