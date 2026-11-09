import { ErrorCode, type ErrorResponse } from '@contadim/contracts';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../errors/app-error.js';

interface NormalizedError {
  status: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.UNPROCESSABLE,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
};

const DEFAULT_MESSAGES: Partial<Record<ErrorCode, string>> = {
  [ErrorCode.VALIDATION_ERROR]: 'Requisição inválida',
  [ErrorCode.UNAUTHORIZED]: 'Você precisa entrar na sua conta',
  [ErrorCode.FORBIDDEN]: 'Você não tem permissão para isso',
  [ErrorCode.NOT_FOUND]: 'Não encontramos o que você procurou',
  [ErrorCode.CONFLICT]: 'Conflito com dados existentes',
  [ErrorCode.TOO_MANY_REQUESTS]: 'Muitas tentativas. Respire fundo e tente de novo daqui a pouco',
  [ErrorCode.INTERNAL_ERROR]: 'Algo deu errado do nosso lado. Tente novamente',
};

export function normalizeError(exception: unknown): NormalizedError {
  if (exception instanceof AppError) {
    return {
      status: exception.status,
      code: exception.code,
      message: exception.message,
      details: exception.details,
    };
  }

  if (exception instanceof ThrottlerException) {
    const code = ErrorCode.TOO_MANY_REQUESTS;
    return { status: HttpStatus.TOO_MANY_REQUESTS, code, message: DEFAULT_MESSAGES[code]! };
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      return {
        status: HttpStatus.CONFLICT,
        code: ErrorCode.CONFLICT,
        message: 'Já existe um registro com esses dados',
      };
    }
    if (exception.code === 'P2025') {
      const code = ErrorCode.NOT_FOUND;
      return { status: HttpStatus.NOT_FOUND, code, message: DEFAULT_MESSAGES[code]! };
    }
    if (exception.code === 'P2003') {
      return {
        status: HttpStatus.CONFLICT,
        code: ErrorCode.CONFLICT,
        message: 'Este registro está em uso e não pode ser alterado assim',
      };
    }
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code = STATUS_TO_CODE[status] ?? ErrorCode.INTERNAL_ERROR;
    // Mensagens internas do Nest (ex.: "Cannot GET /x") não são expostas.
    return { status, code, message: DEFAULT_MESSAGES[code] ?? 'Erro na requisição' };
  }

  const code = ErrorCode.INTERNAL_ERROR;
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, code, message: DEFAULT_MESSAGES[code]! };
}

/** Converte qualquer erro na resposta padronizada `{ error: { code, message, ... } }`. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const error = normalizeError(exception);

    if (error.status >= 500) {
      this.logger.error({ err: exception }, 'Erro não tratado');
    }

    const body: ErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
        requestId: typeof request.id === 'object' ? JSON.stringify(request.id) : String(request.id),
      },
    };
    response.status(error.status).json(body);
  }
}
