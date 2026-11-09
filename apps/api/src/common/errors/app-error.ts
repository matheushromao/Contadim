import { ErrorCode } from '@contadim/contracts';
import { HttpStatus } from '@nestjs/common';

/**
 * Erro de domínio/aplicação lançado pelos services.
 * O filtro global transforma em resposta HTTP no formato padrão.
 */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: HttpStatus,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown, message = 'Alguns dados enviados são inválidos') {
    super(ErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Você precisa entrar na sua conta') {
    super(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Você não tem permissão para isso') {
    super(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Não encontramos o que você procurou') {
    super(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT, details);
  }
}

export class UnprocessableError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ErrorCode.UNPROCESSABLE, message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}
