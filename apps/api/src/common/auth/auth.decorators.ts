import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

import { UnauthorizedError } from '../errors/app-error.js';

/** Usuário autenticado extraído do access token. */
export interface AuthUser {
  id: string;
}

declare global {
  // Extensão de tipos do Express (padrão do @types/express).
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const IS_PUBLIC_KEY = 'contadim:isPublic';
export const AUTH_RATE_LIMIT_KEY = 'contadim:authRateLimit';

/**
 * Todas as rotas exigem autenticação por padrão (guard global).
 * Use `@Public()` para liberar uma rota ou controller.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Aplica o limite de requisições mais rígido (`AUTH_RATE_LIMIT_MAX`), para login e cadastro. */
export const AuthRateLimit = () => SetMetadata(AUTH_RATE_LIMIT_KEY, true);

/**
 * Injeta o usuário autenticado. O `userId` SEMPRE vem daqui (do token), nunca do cliente.
 */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request>();
  if (!request.user) throw new UnauthorizedError();
  return request.user;
});
