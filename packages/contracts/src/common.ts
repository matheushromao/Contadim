import { ACCOUNT_TYPES, ENTRY_TYPES, isValidIsoDate, isValidYearMonth } from '@contadim/core';
import { z } from 'zod';

/** Limite de uma coluna `Int` do PostgreSQL (≈ R$ 21 milhões em centavos). */
export const MAX_CENTS = 2_147_483_647;

export const idSchema = z.uuid({ message: 'Identificador inválido' });

export const centsSchema = z
  .number({ message: 'Informe um valor' })
  .int({ message: 'O valor deve estar em centavos (inteiro)' })
  .min(-MAX_CENTS, { message: 'Valor fora do limite' })
  .max(MAX_CENTS, { message: 'Valor fora do limite' });

export const positiveCentsSchema = centsSchema.refine((value) => value > 0, {
  message: 'O valor deve ser maior que zero',
});

export const isoDateSchema = z
  .string()
  .refine(isValidIsoDate, { message: 'Data inválida (use AAAA-MM-DD)' });

export const yearMonthSchema = z
  .string()
  .refine(isValidYearMonth, { message: 'Mês inválido (use AAAA-MM)' });

export const dateTimeSchema = z.iso.datetime();

export const entryTypeSchema = z.enum(ENTRY_TYPES);
export const accountTypeSchema = z.enum(ACCOUNT_TYPES);

/** Query string de paginação: `?page=1&pageSize=20`. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/** Envelope padrão das listagens paginadas. */
export function paginatedSchema<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), meta: paginationMetaSchema });
}
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE: 'UNPROCESSABLE',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Formato padronizado de todas as respostas de erro da API. */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.enum(Object.values(ErrorCode) as [ErrorCode, ...ErrorCode[]]),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
