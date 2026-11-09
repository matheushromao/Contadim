import type { CookieOptions, Request, Response } from 'express';

import { API_PREFIX } from '../../app.setup.js';
import type { Env } from '../../config/env.js';

export const REFRESH_COOKIE = 'contadim_rt';

function cookieOptions(env: Env): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    // O cookie só é enviado para as rotas de autenticação.
    path: `/${API_PREFIX}/auth`,
  };
}

export function setRefreshCookie(response: Response, token: string, env: Env): void {
  response.cookie(REFRESH_COOKIE, token, {
    ...cookieOptions(env),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  });
}

export function clearRefreshCookie(response: Response, env: Env): void {
  response.clearCookie(REFRESH_COOKIE, cookieOptions(env));
}

export function readRefreshCookie(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
