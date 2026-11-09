import { CSRF_HEADER, CSRF_HEADER_VALUE } from '@contadim/contracts';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { ForbiddenError } from '../errors/app-error.js';

/**
 * Proteção contra CSRF nas rotas que dependem só do cookie (refresh, logout).
 * Um formulário de outro site não consegue enviar headers customizados, e o CORS
 * bloqueia requisições `fetch` com esse header vindas de origens não autorizadas.
 */
@Injectable()
export class CsrfHeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.headers[CSRF_HEADER] !== CSRF_HEADER_VALUE) {
      throw new ForbiddenError('Requisição bloqueada por segurança');
    }
    return true;
  }
}
