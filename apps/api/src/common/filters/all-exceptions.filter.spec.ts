import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { describe, expect, it } from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors/app-error.js';
import { normalizeError } from './all-exceptions.filter.js';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('erro', { code, clientVersion: 'test' });

describe('normalizeError', () => {
  it('mantém os dados de AppError', () => {
    expect(normalizeError(new ValidationError([{ path: 'x', message: 'y' }]))).toEqual({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Alguns dados enviados são inválidos',
      details: [{ path: 'x', message: 'y' }],
    });
    expect(normalizeError(new NotFoundError()).status).toBe(404);
    expect(normalizeError(new ConflictError('em uso')).message).toBe('em uso');
  });

  it('mapeia erros do Prisma', () => {
    expect(normalizeError(prismaError('P2002'))).toMatchObject({ status: 409, code: 'CONFLICT' });
    expect(normalizeError(prismaError('P2025'))).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('mapeia exceções HTTP do Nest sem vazar mensagens internas', () => {
    expect(normalizeError(new NotFoundException('Cannot GET /x'))).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Não encontramos o que você procurou',
    });
    expect(normalizeError(new BadRequestException())).toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(normalizeError(new ThrottlerException())).toMatchObject({
      status: 429,
      code: 'TOO_MANY_REQUESTS',
    });
  });

  it('trata erros desconhecidos como 500', () => {
    expect(normalizeError(new Error('boom'))).toMatchObject({
      status: 500,
      code: 'INTERNAL_ERROR',
    });
  });
});
