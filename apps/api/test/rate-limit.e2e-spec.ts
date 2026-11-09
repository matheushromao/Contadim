import type { ErrorResponse } from '@contadim/contracts';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp, type TestContext } from './utils/test-app.js';

describe('Rate limit', () => {
  let ctx: TestContext;
  const original = process.env.AUTH_RATE_LIMIT_MAX;

  beforeAll(async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '3';
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
    process.env.AUTH_RATE_LIMIT_MAX = original;
  });

  it('bloqueia tentativas excessivas de login', async () => {
    const attempt = () =>
      request(ctx.app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'alguem@exemplo.com', password: 'qualquer-coisa' });

    for (let i = 0; i < 3; i += 1) {
      await attempt().expect(401);
    }
    const blocked = await attempt().expect(429);
    expect((blocked.body as ErrorResponse).error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('não aplica o limite de auth às demais rotas', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(ctx.app.getHttpServer()).get('/api/v1/users/me').expect(401);
    }
  });
});
