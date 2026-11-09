import type { AuthResponse } from '@contadim/contracts';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

export const CSRF = { 'X-Requested-With': 'contadim' } as const;

export interface TestUser {
  accessToken: string;
  /** Cabeçalho `Cookie` pronto para reenviar o refresh token. */
  refreshCookie: string;
  auth: AuthResponse;
  email: string;
  password: string;
}

let counter = 0;

/** Extrai `contadim_rt=<valor>` do `Set-Cookie` da resposta. */
export function extractRefreshCookie(setCookie: string[] | string | undefined): string | undefined {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookie = cookies.find(
    (value) => value.startsWith('contadim_rt=') && !value.startsWith('contadim_rt=;'),
  );
  return cookie?.split(';')[0];
}

/** Cadastra uma pessoa nova e devolve os tokens. */
export async function registerUser(
  app: NestExpressApplication,
  overrides: Partial<{ name: string; email: string; password: string }> = {},
): Promise<TestUser> {
  counter += 1;
  const email = overrides.email ?? `pessoa${counter}-${Date.now()}@exemplo.com`;
  const password = overrides.password ?? 'senha-super-segura';
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ name: overrides.name ?? 'Pessoa Teste', email, password })
    .expect(201);

  const auth = response.body as AuthResponse;
  const refreshCookie = extractRefreshCookie(response.headers['set-cookie']);
  if (!refreshCookie) throw new Error('Cookie de refresh não foi definido');
  return { accessToken: auth.accessToken, refreshCookie, auth, email, password };
}

export const bearer = (user: Pick<TestUser, 'accessToken'>) => ({
  Authorization: `Bearer ${user.accessToken}`,
});
